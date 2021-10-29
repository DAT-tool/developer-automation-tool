import { CommandClass } from "../common/command";
import { CommandModel, PlayModel } from "../common/interfaces";
import * as PATH from 'path';
import { deleteDirectory, errorLog, infoLog, messageLog } from "../common/public";
import * as FS from 'fs';

export function init() {
   return HelpCommand;
}


/******************************************* */
export class HelpCommand extends CommandClass {
   path: string;
   /********************************** */
   define(): CommandModel {
      return {
         name: 'help',
         description: 'Lists available commands and their short descriptions.',
         alias: 'h',
         argvs: [],
      };
   }
   /********************************** */
   async run() {
      messageLog('Available Commands:', 'info', '\n\n');
      // =>search for all commands
      const files = FS.readdirSync(__dirname, { withFileTypes: true });
      for (const f of files) {
         try {
            // =>init command class
            const commandClass = await import(PATH.join(__dirname, f.name));
            // =>init command class
            let cmd = new (commandClass['init']())() as CommandClass;
            messageLog(cmd.name, 'warning', ' ');
            messageLog(cmd.description, 'normal');
         } catch (e) { }
      }
      messageLog(`\ntype 'dat [command] -h' for more help!`);
      return true;
   }
}