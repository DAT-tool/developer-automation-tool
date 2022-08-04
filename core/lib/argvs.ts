import { CommandClass } from "../common/command";
import { CommandRunArgv } from "../common/interfaces";
import { mapRunProgramArguments, parseProgramArgvs } from "../common/public";
import { info, log, success, warning } from "./log";
import { ScriptArgvs } from "./os";

export type BaseArgvName = 'help';
export type BaseCommandName = 'help' | 'version';
export interface CommandItem<N extends string = string, A extends string = string> {
   name: N | BaseCommandName;
   description: string;
   // longDescription?: string; // md file name
   alias?: string;
   implement: () => Promise<boolean | void>;
   argvs?: CommandArgvItem<A>[];
   commandClass?: CliCommand;
}

export interface CommandArgvItem<A extends string = string> {
   name: A | BaseArgvName;
   description: string;
   force?: boolean;
   alias?: string;
   type?: 'boolean' | 'number' | 'string';
   defaultValue?: any;
}
/**************************************** */
let scriptCommands: CommandItem[] = [];
let scriptRunArgvs: CommandRunArgv[] = [];
const cliCommandItems: { constructor: typeof CliCommand }[] = [];
/**************************************** */
/**
 * define some commands for cli
 * use `cli` function instead
 * @param commands 
 * @param notFoundCommand 
 * @param notFoundArgv 
 * @returns 
 * @deprecated
 */
export async function define<N extends string = string, A extends string = string>(
   commands: CommandItem<N, A>[],
   notFoundCommand?: () => Promise<void>,
   notFoundArgv?: () => Promise<boolean | void>
): Promise<boolean> {
   for (const com of commands) {
      if (!com.argvs) com.argvs = [];
      // =>add common argvs
      if (!com.argvs.find(i => i.name === 'help')) {
         com.argvs.push({
            name: 'help',
            alias: 'h',
            description: 'Shows a help message for this command in the console.',
         });
      }
   }
   // =>if not find 'help' command
   if (!commands.find(i => i.name === 'help')) {
      commands.push({
         name: 'help',
         description: 'Lists available commands and their short descriptions.',
         implement: async () => await helpCommand(),
         argvs: [],
      });
   }

   scriptCommands = commands;
   // =>if not found command name
   if (ScriptArgvs.length < 1) {
      ScriptArgvs.push('help');
   }
   // =>if help commands
   else if (ScriptArgvs[0] === '-h' || ScriptArgvs[0] === '--help') {
      ScriptArgvs[0] = 'help';
   }
   // =>parse script command
   let runCommand: CommandItem<N, A>;
   for (const com of commands) {
      // =>check name
      if (com.name === ScriptArgvs[0]) {
         runCommand = com;
         break;
      }
      // =>check alias
      else if (com.alias === ScriptArgvs[0]) {
         runCommand = com;
         // =>not break, probably is a name command
      }
   }
   // =>if not found command
   if (!runCommand) {
      // =>if exist not found function
      if (notFoundCommand) await notFoundCommand();
      // else, redirect to help command
      else {
         runCommand = commands.find(i => i.name === 'help');
      }
   }
   // =>parse script argvs
   scriptRunArgvs = parseProgramArgvs(ScriptArgvs.slice(1));
   // =>map and set default argvs
   scriptRunArgvs = await mapRunProgramArguments(scriptRunArgvs, runCommand.argvs, notFoundArgv);

   // console.log(ScriptArgvs.slice(1), scriptRunArgvs, runCommand.argvs)
   // =>if help argv
   if (hasArgv('help')) {
      helpArgv(runCommand);
      return true;
   }
   // =>run command
   let result = await runCommand.implement();

   return result ? true : false;
}


/**************************************** */
export function getArgv<T = string, N extends string = string>(key: BaseArgvName | N, def?: T): T {
   const argv = scriptRunArgvs.find(i => i.key === key);
   if (argv) return argv.value as T;
   return def || undefined as any;
}
/**************************************** */
export function hasArgv<A extends string = string>(key: BaseArgvName | A) {
   const argv = scriptRunArgvs.find(i => i.key === key);
   return argv ? true : false;
}
/**************************************** */
export async function helpCommand() {
   info('Available Commands:', '\n\n');
   // =>iterate all commands
   for (const com of scriptCommands) {
      try {
         // =>show command details
         if (com.alias) {
            warning(`${com.name} (${com.alias})`, '\t');
         } else {
            warning(`${com.name}`, '\t');
         }
         log(com.description);
      } catch (e) { }
   }
   info(`\ntype dat p [command] -h' for more help!`);
   return true;
}
/**************************************** */
async function helpArgv(command: CommandItem) {
   success(command.description);
   // => if has force argvs
   if (command.argvs.find(i => i.force)) {
      log('arguments:');
      // =>list of force argvs
      for (const argv of command.argvs) {
         if (!argv.force) continue;
         info('--' + argv.name + (argv.alias ? ` (-${argv.alias})` : ''));
         log(argv.description);
      }
   }
   log('options:');
   // =>list of optional argvs
   for (const argv of command.argvs) {
      if (argv.force) continue;
      warning('--' + argv.name + (argv.alias ? ` (-${argv.alias})` : ''));
      log(argv.description);
   }
   return true;
}
/**************************************** */
/*****************CLASS****************** */
/**************************************** */
/**
 * load cli
 * @returns boolean
 */
export async function cli(): Promise<boolean> {
   scriptCommands = [];
   // console.log('registered commands:', cliCommandItems);
   for (const com of cliCommandItems as any) {
      let commandClass = (new com.constructor);
      let command: CommandItem = {
         name: commandClass.name,
         description: commandClass.description || '',
         alias: commandClass.alias || undefined,
         implement: commandClass.implement,
         argvs: commandClass.argvs || [],
         commandClass,
      };
      // =>add common argvs
      if (!command.argvs.find(i => i.name === 'help')) {
         command.argvs.push({
            name: 'help',
            alias: 'h',
            description: 'Shows a help message for this command in the console.',
         });
      }
      scriptCommands.push(command);
   }
   // =>if not find 'help' command
   if (!scriptCommands.find(i => i.name === 'help')) {
      scriptCommands.push({
         name: 'help',
         description: 'Lists available commands and their short descriptions.',
         implement: async () => await helpCommand(),
         argvs: [],
      });
   }

   // =>if not found command name
   if (ScriptArgvs.length < 1) {
      ScriptArgvs.push('help');
   }
   // =>if help commands
   else if (ScriptArgvs[0] === '-h' || ScriptArgvs[0] === '--help') {
      ScriptArgvs[0] = 'help';
   }
   // =>parse script command
   let runCommand: CommandItem;
   for (const com of scriptCommands) {
      // =>check name
      if (com.name === ScriptArgvs[0]) {
         runCommand = com;
         break;
      }
      // =>check alias
      else if (com.alias === ScriptArgvs[0]) {
         runCommand = com;
         // =>not break, probably is a name command
      }
   }
   // =>if not found command
   if (!runCommand) {
      runCommand = scriptCommands.find(i => i.name === 'help');
   }
   // =>parse script argvs
   scriptRunArgvs = parseProgramArgvs(ScriptArgvs.slice(1));
   // =>map and set default argvs
   scriptRunArgvs = await mapRunProgramArguments(scriptRunArgvs, runCommand.argvs);

   // console.log(ScriptArgvs.slice(1), scriptRunArgvs, runCommand.argvs)
   // =>if help argv
   if (hasArgv('help')) {
      helpArgv(runCommand);
      return true;
   }
   let result = false;
   // =>run command
   if (runCommand.commandClass) {
      result = await runCommand.commandClass.implement();
   } else {
      result = await runCommand.implement() as boolean;
   }

   return result ? true : false;
}

export interface OnImplement {
   implement(): Promise<boolean> | boolean;
}


export class CliCommand<NAME extends string = string, ARG_NAME extends string = string> implements OnImplement {
   private _name: NAME;
   private _description: string;
   private _alias: string;
   private _argvs: CommandArgvItem<ARG_NAME>[];
   constructor() {
      // console.log('hrello')
   }

   get name(): NAME {
      return this._name;
   }

   get description() {
      return this._description;
   }

   get alias() {
      return this._alias;
   }

   get argvs() {
      return this._argvs;
   }

   hasArgv(name: ARG_NAME) {
      return hasArgv(name);
   }

   getArgv<T = string>(name: ARG_NAME, def?: T) {
      return getArgv<T, ARG_NAME>(name, def);
   }

   async implement(): Promise<boolean> {
      return false;
   }

}
/**************************************** */
/**************DECORATORS**************** */
/**************************************** */

export function cliCommandItem() {
   return (constructor: any) => {
      cliCommandItems.push({
         constructor,
      });
   };
}
