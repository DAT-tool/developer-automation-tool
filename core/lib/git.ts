import { execSync } from "child_process";
import * as http from 'http';
import url from 'url';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { generateString, isDirEmpty } from "../common/public";
import { cwd, exec, rmdir, } from "./os";
import { error } from "./log";
import { ExecResponse } from "../common/interfaces";
import { ExitCode } from "../common/types";

export async function push(options: {
   pushUrl: string;
   username: string;
   password?: string;
   branch?: string; // default push all branches
   remote?: string;
   cwd?: string;
}) {
   // =>check git installed
   if (!await checkGitInstalled()) return;
   // =>if user pass exist and not pull url exist
   if (options.username && !options.pushUrl && options.remote) {
      // =>get url of remote
      let tmp = await convertRemoteToUrl(options.remote, options.username, options.password, options.cwd);
      if (typeof tmp === 'object') return tmp;
      // =>set push url
      options.pushUrl = tmp;
      // =>reset remote
      options.remote = undefined;
   }
   let command = 'git push ';
   // =>set remote
   if (options.remote) command += options.remote + ' ';
   // =>set push url
   if (options.pushUrl) command += options.pushUrl + ' ';
   // =>set branch
   let branch = options.branch;
   if (!branch) branch = '--all';
   command += branch + ' ';
   // =>try to push
   let output = await exec(command, options.cwd);

   return output;
}
/****************************************** */
export async function clone(options: {
   cloneUrl: string;
   username?: string;
   password?: string;
   branch?: string;
   depth?: number;
   quiet?: boolean;
   configs?: object;
   deleteDirectoryIfNotEmpty?: boolean;
}, cwd?: string) {
   // =>check git installed
   if (!await checkGitInstalled()) return;
   // =>check for dest dir
   if (options.deleteDirectoryIfNotEmpty) {
      let destPath = cwd;
      if (!destPath) destPath = process.cwd();
      if (options.branch) {
         destPath = path.join(destPath, options.branch);
      } else {
         destPath = path.join(destPath, options.cloneUrl.split('/').pop());
      }
      // =>if dest path exist
      if (fs.existsSync(destPath)) {
         await rmdir(destPath);
      }
   }
   // =>parse url
   let q = new url.URL(options.cloneUrl);
   // =>generate command
   let command = `git clone `;
   // =>set depth
   if (options.depth) command += '--depth=' + options.depth + ' ';
   // =>set quiet
   if (options.quiet) command += '--quiet ';
   // =>set configs
   if (options.configs && typeof options.configs === 'object') {
      for (const k of Object.keys(options.configs)) {
         command += `--config ${k}="${options.configs[k]}" `;
      }
   }
   // =>set url
   command += await getAuthRemoteUrl(options.cloneUrl, options.username, options.password);
   // =>set branch
   if (options.branch) command += ' ' + options.branch + ' ';
   // =>try to clone
   let output = await exec(command, cwd);

   console.log('command:', command, output);
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
   username?: string;
   password?: string;
   cwd?: string;
   pullUrl?: string;

}) {
   // =>check git installed
   if (!await checkGitInstalled()) return;
   // =>if user pass exist and not pull url exist
   if (options.username && !options.pullUrl && options.remote) {
      // =>get url of remote
      let tmp = await convertRemoteToUrl(options.remote, options.username, options.password, options.cwd);
      if (typeof tmp === 'object') return tmp;
      // =>set pull url
      options.pullUrl = tmp;
      // =>reset remote
      options.remote = undefined;
   }
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
   // =>set pull url
   if (options.pullUrl) command += options.pullUrl + ' ';
   // =>set branch name
   if (options.branch) command += options.branch + ' ';

   // console.log('command:', command);
   // =>try to push
   let output = await exec(command, options.cwd);

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
   cwd?: string;
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
   let output = await exec(command, options.cwd);
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
/****************************************** */
async function convertRemoteToUrl(remoteName: string, username?: string, password?: string, cwd?: string): Promise<ExecResponse | string> {
   // =>get url of remote
   let tmp = await remote('get-url', { name: remoteName, cwd });
   if (tmp.code !== ExitCode.SUCCESS) return tmp;
   // =>set url
   let url = await getAuthRemoteUrl(tmp.stdout, username, password);

   return url;
}
/****************************************** */
async function getAuthRemoteUrl(fetchUrl: string, username?: string, password?: string) {
   // =>parse url
   let q = new url.URL(fetchUrl);
   // =>if not username
   if (!username) {
      return fetchUrl;
   }
   // =>set username, password
   let usePass = username;
   if (password) usePass += ':' + password;
   // =>generate command
   return `${q.protocol}//${usePass}@${q.host}${q.pathname}`;
}