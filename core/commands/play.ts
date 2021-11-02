import { CommandClass } from "../common/command";
import { BuildMetaData, CommandModel, PlayModel } from "../common/interfaces";
import * as PATH from 'path';
import { checkPortInUse, deleteDirectory, errorLog, messageLog, randomInt } from "../common/public";
import { copyDirectory } from '../common/public';
import * as FS from 'fs';
import { Global } from "../global";
import { PlayScript } from "../runtime/play";
import { MakeCommand } from "./make";

export function init() {
   return { class: PlayCommand, alias: 'p' };
}

export type argvName = 'filepath';

/******************************************* */
export class PlayCommand extends CommandClass<argvName> {
   allowUnknownArgvs = true;
   /********************************** */
   define(): CommandModel<argvName> {
      return {
         name: 'play',
         description: "play a script file (default play 'play.ts' file)",
         alias: 'p',
         argvs: [
            {
               name: 'filepath',
               alias: 'f',
               description: "relative or absolute path of play script file",
            },
         ],
      };
   }
   /********************************** */
   async run() {
      let path = Global.pwd;
      let filename = 'play.ts';
      // =>overwrite path, if exist
      if (this.hasArgv('filepath')) {
         let _path = PATH.resolve(this.getArgv('filepath'));
         path = PATH.dirname(_path);
         filename = PATH.basename(_path);
      }
      // console.log(path, filename)
      // =>check exist 'node_modules'
      if (!FS.existsSync(PATH.join(path, 'node_modules'))) {
         // =>init make class
         let makeClass = new MakeCommand();
         if (!await makeClass.preRun()) {
            return false;
         }
      }
      // =>create instance of play class
      let playClass = new PlayScript(path, filename);
      // =>run play class
      let res = await playClass.play(process.argv.slice(3) ?? []);
      if (res === 0) return true;
      return false;
   }
   /********************************** */
}