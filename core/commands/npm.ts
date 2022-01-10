import { CommandClass } from "../common/command";
import { CommandModel } from "../common/interfaces";
import * as PATH from 'path';
import { deleteDirectory, errorLog, getFilesList, infoLog, messageLog, outputStreamExec } from "../common/public";
import * as FS from 'fs';
import { CommandInput } from "../common/command-input";
import { Global } from "../global";
import { MakeCommand } from "./make";

export function init() {
   return { class: NpmCommand, alias: 'n' };
}

export type argvName = 'install' | 'remove' | 'name';

/******************************************* */
export class NpmCommand extends CommandClass<argvName> {
   packageName: string;
   action: 'install' | 'remove' = 'install';
   /********************************** */
   define(): CommandModel<argvName> {
      return {
         name: 'npm',
         description: 'Run npm commands on project',
         alias: 'n',
         argvs: [
            {
               name: 'install',
               description: 'install a package (default action)',
               alias: 'i',
               type: 'boolean',
            },
            {
               name: 'remove',
               description: 'remove a package',
               alias: 'r',
               type: 'boolean',
            },
            {
               name: 'name',
               description: 'package name',
               alias: 'n',
            },
         ],
      };
   }
   /********************************** */
   async run() {
      this.packageName = this.getArgv('name');
      // =>check exist package name 
      if (!this.packageName) {
         this.packageName = await CommandInput.question('Enter Package Name:');
      }
      // =>get npm action
      if (this.hasArgv('remove')) this.action = 'remove';
      // =>generate npm command
      let command = `npm ${this.action} ${this.packageName}`;
      // =>run npm command
      let code = await outputStreamExec(command, Global.pwd);
      // =>run make command
      let makeClass = new MakeCommand();
      if (!await makeClass.preRun()) {
         return false;
      }
      if (code !== 0) return false;
      messageLog(`npm package '${this.packageName}' installed successfully`, 'success');
      return true;
   }
}