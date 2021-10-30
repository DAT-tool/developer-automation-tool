import { CommandClass } from "../common/command";
import { CommandModel } from "../common/interfaces";
import * as PATH from 'path';
import { deleteDirectory, errorLog, getFilesList, infoLog, messageLog } from "../common/public";
import * as FS from 'fs';

export function init() {
   return { class: HelpCommand, alias: 'h' };
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
      const files = getFilesList(__dirname, /.*.js$/);
      for (const f of files) {
         try {
            // console.log('command:', f)
            // =>init command class
            const commandClass = await import(f.path);
            // =>init command class
            let cmd = new (commandClass['init']()['class'])() as CommandClass;
            messageLog(`${cmd.name} (${cmd.alias})`, 'warning', '\t');
            messageLog(cmd.description, 'normal');
         } catch (e) { }
      }
      messageLog(`\ntype 'dat [command] -h' for more help!`);
      return true;
   }
}