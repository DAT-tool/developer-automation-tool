import { execSync } from "child_process";
import * as http from 'http';
import url from 'url';
import * as os from 'os';
import * as path from 'path';
import { generateString } from "../common/public";
import { cwd, exec } from "./os";
import { error } from "./log";
import { ExecResponse } from "../common/interfaces";
import { ExitCode } from "../common/types";

export async function push(options: {
   pushUrl: string;
   username: string;
   password?: string;
   branch?: string; // default push all branches
}) {
   // =>check git installed
   if (!await checkGitInstalled()) return;
   // =>parse url
   let q = new url.URL(options.pushUrl);
   // =>set username, password
   let usePass = options.username;
   if (options.password) usePass += ':' + options.password;
   // =>set branch
   let branch = options.branch;
   if (!branch) branch = '--all';
   // =>generate command
   let command = `git push ${q.protocol}//${usePass}@${q.host}${q.pathname} ${branch}`;
   // console.log('command:', command);
   // =>try to push
   let output = await exec(command);

   return output;
}
/****************************************** */
export async function clone(options: {
   cloneUrl: string;
   username?: string;
   password?: string;
   branch?: string;
   depth?: number;
   /**
    * The name of a new directory to clone into.
    */
   directory?: string;
}) {
   // =>check git installed
   if (!await checkGitInstalled()) return;
   // =>parse url
   let q = new url.URL(options.cloneUrl);
   // =>generate command
   let command = `git clone `;
   // =>set depth
   if (options.depth) command += '--depth=' + options.depth + ' ';
   // =>set username, password
   if (options.username) {
      let userPass = '';
      userPass = options.username;
      if (options.password) userPass += ':' + options.password;
      command += `${q.protocol}//${userPass}@${q.host}${q.pathname} `;
   } else {
      command += options.cloneUrl + ' ';
   }
   // =>set branch
   if (options.branch) command += options.branch + ' ';
   // =>set directory
   if (options.directory) command += options.directory;
   // console.log('command:', command);
   // =>try to clone
   let output = await exec(command);

   return output;
}
/****************************************** */
/**
 * git-pull - Fetch from and integrate with another repository or a local
 * @param options 
 */
export async function pull(options: {
   /**
    * Fetch all remotes.
    */
   all?: boolean;
   force?: boolean;
   branch?: string;
   remote?: string;
   verbose?: boolean;

}) {
   // =>check git installed
   if (!await checkGitInstalled()) return;
   // =>generate command
   let command = `git pull `;
   // =>set 'force' option
   if (options.force) command += '--force ';
   // =>set 'all' option
   if (options.all) command += '--all ';
   // =>set 'verbose' option
   if (options.verbose) command += '--verbose ';
   // =>set remote name
   if (options.remote) command += options.remote + ' ';
   // =>set branch name
   if (options.branch) command += options.branch + ' ';

   // console.log('command:', command);
   // =>try to push
   let output = await exec(command);

   return output;
}
/****************************************** */
/**
 * git-remote - Manage set of tracked repositories
 * @param mode 
 * @param options 
 * @returns 
 */
export async function remote(mode: 'add' | 'rm' | 'rename' | 'get-url' | 'set-url' | 'show', options: {
   name?: string;
   url?: string;
   newName?: string;
}): Promise<ExecResponse> {
   // =>check git installed
   if (!await checkGitInstalled()) return;
   // =>generate command
   let command = `git remote `;
   // =>if 'add' mode
   if (mode === 'add') {
      if (!options.name || !options.url) return { code: ExitCode.INVALID_OPTION };
      command += `add -f ${options.name} ${options.url}`;
   }
   // =>if 'rm' mode
   if (mode === 'rm') {
      if (!options.name) return { code: ExitCode.INVALID_OPTION };
      command += `rm ${options.name}`;
   }
   // =>if 'rename' mode
   if (mode === 'rename') {
      if (!options.name || !options.newName) return { code: ExitCode.INVALID_OPTION };
      command += `rename ${options.name} ${options.newName}`;
   }
   // =>if 'get-url' mode
   if (mode === 'get-url') {
      if (!options.name) return { code: ExitCode.INVALID_OPTION };
      command += `get-url ${options.name}`;
   }
   // =>if 'set-url' mode
   if (mode === 'set-url') {
      if (!options.name || !options.url) return { code: ExitCode.INVALID_OPTION };
      command += `set-url ${options.name} ${options.url}`;
   }
   // =>if 'show' mode
   if (mode === 'show') {
      command += `show`;
   }

   // console.log('command:', command);
   // =>try to run command
   let output = await exec(command);
   // =>if 'show' mode
   if (mode === 'show' && output.stdout && output.stdout.length > 0) {
      output.result = output.stdout.split('\n');
   }
   return output;
}
/****************************************** */
export async function checkGitInstalled() {
   let output = await exec(`git --version`);
   if (output.code !== 0 || output.stdout.indexOf('git version') === -1) {
      error('git not installed!');
      return false;
   }
   return true;
}