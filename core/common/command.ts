import { CommandArgvModel, CommandModel, CommandRunArgv } from "./interfaces";
import { errorLog, infoLog, log, messageLog, warningLog } from './public';
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
      def.argvs.push({
         alias: 'h',
         name: 'help',
         description: 'Shows a help message for this command in the console.',
      });
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
   mapRunArguments(argvs: CommandRunArgv[]) {
      for (const argv of argvs) {
         // =>find argv from command argvs
         const commandArgv = this.argvs.find(i => (argv.isAlias && i.alias === argv.key) || (i.name === argv.key));
         // =>if not found argv
         if (!commandArgv) {
            // =>if not play command
            if (this.name !== 'play') {
               warningLog('warn343', 'command argv name or alias not found: ' + argv.key);
            }
            continue;
         }
         // =>get argv value, if must
         if (commandArgv.type) {
            switch (commandArgv.type) {
               case 'number':
                  argv.value = Number(argv.value);
                  if (isNaN(argv.value)) argv.value = undefined;
                  break;
               case 'boolean':
                  if (argv.value === 'true') {
                     argv.value = true;
                  } else if (argv.value) {
                     argv.value = false;
                  }
                  break;
               default:
                  break;
            }
            if (!argv.value) {
               argv.value = commandArgv.defaultValue;
            }
         }
         // =>if boolean type argv and has no value
         if (commandArgv.type === 'boolean' && typeof argv.value !== 'boolean') {
            argv.value = true;
         }
         // console.log('v:', commandArgv.name, argv.value)
         // =>map argv
         this.runArgvs.push({
            key: commandArgv.name,
            value: argv.value,
         });
      }
      // =>set default value for non argvs
      for (const argv of this.argvs) {
         if (!this.hasArgv(argv.name) && argv.defaultValue !== undefined) {
            this.runArgvs.push({
               key: argv.name,
               value: argv.defaultValue,
            });
         }
      }
   }
   /**************************************** */
   async preRun(): Promise<boolean> {
      try {
         // =>if debug argv
         if (this.hasArgv('debug')) {
            Global.isDebug = true;
         }
         // =>if help argv
         if (this.hasArgv('help')) {
            this.helpArgv();
            return true;
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