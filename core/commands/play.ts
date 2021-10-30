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

export type argvName = 'filename';

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
               name: 'filename',
               alias: 'f',
               description: "filename of play script file",
            },
         ],
      };
   }
   /********************************** */
   async run() {
      // =>check exist 'node_modules'
      if (!FS.existsSync(PATH.join(Global.pwd, 'node_modules'))) {
         // =>init make class
         let makeClass = new MakeCommand();
         if (!await makeClass.preRun()) {
            return false;
         }
      }
      // =>create instance of play class
      let playClass = new PlayScript(Global.pwd, this.getArgv('filename', 'play.ts'));
      // =>run play class
      let res = await playClass.play(process.argv.slice(3) ?? []);
      if (res === 0) return true;
      return false;
   }
   /********************************** */
}