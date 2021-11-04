import { CommandClass } from "../common/command";
import { CommandModel } from "../common/interfaces";
import * as PATH from 'path';
import { deleteDirectory, errorLog, getFilesList, infoLog, messageLog } from "../common/public";
import * as FS from 'fs';
import { CommandType } from "../common/types";
import { Global } from "../global";

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
      // =>if help command
      if (process.argv.length > 3 && process.argv[3]) {
         return await this.showCommandHelp(process.argv[3].trim() as any);
      }
      // =>if help all commands
      else {
         return await this.showPublicHelp();
      }
   }
   /********************************** */
   async showPublicHelp() {
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
      messageLog(`\ntype 'dat help [command]' for more help!`);

      return true;
   }
   /********************************** */
   async showCommandHelp(commandName: CommandType) {
      try {
         let commandPath = PATH.join(Global.dirPath, 'commands', commandName + '.js');
         // =>import command js file
         let importFile = await import(commandPath);
         // =>get command class
         let commandClass = importFile['init']()['class'];
         // =>init command class
         let cmd = new commandClass();
         // =>show command help
         await cmd['helpArgv']();

         return true;
      } catch (e) {
         errorLog('err745', 'can not find such command: ' + commandName);
         return false;
      }
   }
}