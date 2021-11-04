import { CommandArgvModel, CommandModel, CommandRunArgv } from "./interfaces";
import { errorLog, infoLog, log, mapRunProgramArguments, messageLog, warningLog } from './public';
import * as PATH from 'path';
import { Global } from "../global";
import { baseArgvName, CommandType } from "./types";

export abstract class CommandClass<A extends string = string> {
   name: CommandType;
   description: string;
   alias: string = '';
   argvs: CommandArgvModel<A>[] = [];
   runArgvs: CommandRunArgv<A>[] = [];
   allowUnknownArgvs = false;
   /**************************************** */
   constructor() {
      const def = this.define();
      this.name = def.name;
      this.description = def.description;
      if (def.alias) {
         this.alias = def.alias;
      }
      // =>set argvs, if not
      if (!def.argvs) def.argvs = [];
      // =>add common argvs
      // def.argvs.push({
      //    alias: 'h',
      //    name: 'help',
      //    description: 'Shows a help message for this command in the console.',
      // });
      def.argvs.push({
         name: 'debug',
         alias: 'ddd',
         description: "enable debug mode",
      });
      this.argvs = def.argvs;
   }
   /**************************************** */
   abstract run(): Promise<boolean>;
   /**************************************** */
   abstract define(): CommandModel<A>;
   /**************************************** */
   async mapRunArguments(argvs: CommandRunArgv[]) {
      this.runArgvs = await mapRunProgramArguments<A>(argvs, this.argvs, async (argv) => {
         // =>if 'play' or 'help' command
         if (this.name === 'play' || this.name === 'help') {
            return true;
         }
         warningLog('warn345', 'command argv name or alias not found: ' + argv.key);
         return true;
      });
   }
   /**************************************** */
   async preRun(): Promise<boolean> {
      try {
         // =>if debug argv
         if (this.hasArgv('debug')) {
            Global.isDebug = true;
         }
         // =>run command
         return await this.run();
      } catch (e) {
         errorLog('err653', e);
         return false;
      }
   }
   /**************************************** */
   async helpArgv() {
      messageLog(this.description, 'success');
      messageLog('arguments:');
      // =>list of force argvs
      for (const argv of this.argvs) {
         if (!argv.force) continue;
         messageLog('--' + argv.name + (argv.alias ? ` (-${argv.alias})` : ''), 'info');
         messageLog(argv.description);
      }
      messageLog('options:');
      // =>list of optional argvs
      for (const argv of this.argvs) {
         if (argv.force) continue;
         messageLog('--' + argv.name + (argv.alias ? ` (-${argv.alias})` : ''), 'warning');
         messageLog(argv.description, 'normal');
      }

   }
   /**************************************** */
   getArgv<T = any>(key: baseArgvName | A, def?: T): T {
      const argv = this.runArgvs.find(i => i.key === key);
      if (argv) return argv.value as T;
      return def || undefined as any;
   }
   /**************************************** */
   hasArgv(key: baseArgvName | A) {
      const argv = this.runArgvs.find(i => i.key === key);
      return argv ? true : false;
   }
   /**************************************** */
   absPath(path: string) {
      if (!path) return Global.pwd;
      if (PATH.isAbsolute(path)) return path;
      return PATH.join(Global.pwd, path);
   }
}