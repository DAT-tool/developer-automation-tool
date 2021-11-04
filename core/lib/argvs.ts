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
/**************************************** */
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