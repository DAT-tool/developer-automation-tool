import { CommandClass } from "../common/command";
import { CommandModel, PlayModel } from "../common/interfaces";
import * as PATH from 'path';
import { deleteDirectory, errorLog, infoLog } from "../common/public";
import { copyDirectory } from '../common/public';
import * as FS from 'fs';
import { Global } from "../global";

export function init() {
   return { class: MakeCommand, alias: 'm' };
}

export type argvName = 'name';

/******************************************* */
export class MakeCommand extends CommandClass<argvName> {
   path: string;
   /********************************** */
   define(): CommandModel<argvName> {
      return {
         name: 'make',
         description: 'make an environment for develop and test script files',
         alias: 'm',
         argvs: [
            {
               name: 'name',
               alias: 'n',
               description: "name of environment (create directory with this name)",
            },
         ],
      };
   }
   /********************************** */
   async run() {
      if (this.hasArgv('name')) {
         this.path = PATH.join(Global.pwd, this.getArgv('name'));
      } else {
         this.path = Global.pwd;
      }
      // =>create dir with path
      FS.mkdirSync(this.path, { recursive: true });
      return await this.makeEnvironment();

   }
   /********************************** */
   async makeEnvironment() {
      try {
         // =>create dat dir
         const datPath = PATH.join(this.path, 'node_modules', '@dat');
         FS.mkdirSync(datPath, { recursive: true });
         // =>copy lib dir 
         copyDirectory(PATH.join(Global.dirPath, 'lib'), PATH.join(datPath, 'lib'));
         // =>copy common dir 
         copyDirectory(PATH.join(Global.dirPath, 'common'), PATH.join(datPath, 'common'));
         // =>create play ts file, if not
         if (!FS.existsSync(PATH.join(this.path, 'play.ts'))) {
            FS.writeFileSync(PATH.join(this.path, 'play.ts'), `
import { info } from "@dat/lib/log";

info('Play This Script by DAT!');
            `.trim());
         }
         infoLog('make', `environment makes in '${this.path}'`);

         return true;
      } catch (e) {
         errorLog('err4', 'bad make env');
         return false;
      }

   }
   /********************************** */
   capitalize(s: string) {
      return s[0].toUpperCase() + s.slice(1);
   }
}