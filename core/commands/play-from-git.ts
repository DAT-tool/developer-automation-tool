import { CommandClass } from "../common/command";
import { BuildMetaData, CommandModel, PlayModel } from "../common/interfaces";
import * as PATH from 'path';
import * as OS from 'os';
import { checkPortInUse, DATGitBaseURl, deleteDirectory, errorLog, messageLog, randomInt } from "../common/public";
import { copyDirectoryAsync } from '../common/public';
import * as FS from 'fs';
import { Global } from "../global";
import { PlayScript } from "../runtime/play";
import { MakeCommand } from "./make";
import { SourceCodeEncryption } from "../runtime/encryption";
import { CommandInput } from "../common/command-input";
import { clone } from "../lib/git";

export function init() {
   return { class: PlayFromGitCommand, alias: 'pg' };
}

export type argvName = 'name' | 'base-url' | 'argvs';

/******************************************* */
export class PlayFromGitCommand extends CommandClass<argvName> {
   allowUnknownArgvs = true;
   /********************************** */
   define(): CommandModel<argvName> {
      return {
         name: 'play-from-git',
         description: "play a script from a git repository",
         alias: 'pg',
         argvs: [
            {
               name: 'name',
               alias: 'n',
               description: "play script name",
            },
            {
               name: 'base-url',
               alias: 'b',
               description: "base url of play script repository (default is DAT org url)",
            },
            {
               name: 'argvs',
               alias: 'a',
               description: "argvs of play script (ex 'i b')",
            },
         ],
      };
   }
   /********************************** */
   async run() {
      let path = Global.pwd;
      let filename = 'play.ts';
      let scriptName: string;
      let baseUrl: string;
      let argvs = [];
      // =>if argvs exist
      if (this.hasArgv('argvs')) {
         argvs = this.getArgv('argvs').split(' ');
         // =>trim argvs
         if (Array.isArray(argvs)) {
            argvs = argvs.filter(i => i.trim() !== '');
         }
      }
      // =>if base url exist
      if (this.hasArgv('base-url')) {
         baseUrl = this.getArgv('base-url');
      }
      // =>if not exist, set default
      else {
         baseUrl = DATGitBaseURl();
      }
      // =>get name, if exist
      if (this.hasArgv('name')) {
         scriptName = this.getArgv('name');
      }
      // =>if not, get it from input
      else {
         scriptName = await CommandInput.question('Enter Script Name: (ex run-tor)');
      }
      // =>create folder in tmp dir
      let gitPlayDirPath = PATH.join(OS.tmpdir(), 'dat_plays');
      FS.mkdirSync(gitPlayDirPath, { recursive: true });
      // =>try to clone
      let res = await clone({
         cloneUrl: baseUrl + '/' + scriptName,
         depth: 1,
         deleteDirectoryIfNotEmpty: true,
      }, gitPlayDirPath);
      // =>check for status code
      if (res.code !== 0) {
         errorLog('err353', `can not clone play script: ${res.stderr}`);
         return false;
      }
      // =>check exist 'node_modules'
      if (!FS.existsSync(PATH.join(gitPlayDirPath, 'node_modules'))) {
         // =>init make class
         let makeClass = new MakeCommand(gitPlayDirPath, 0);
         if (!await makeClass.preRun()) {
            return false;
         }
      }
      // =>create instance of play class
      let playClass = new PlayScript(PATH.join(gitPlayDirPath, scriptName), filename);

      // =>run play class
      let res1 = await playClass.play(argvs);
      if (res1 === 0) return true;
      return false;
   }
   /********************************** */
}