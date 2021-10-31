import { execSync } from "child_process";
import * as http from 'http';
import url from 'url';
import * as os from 'os';
import * as path from 'path';
import { generateString } from "../common/public";
import { exec } from "./os";
import { error } from "./log";

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
}) {
   // =>check git installed
   if (!await checkGitInstalled()) return;
   // =>parse url
   let q = new url.URL(options.cloneUrl);
   // =>set username, password
   let userPass = '';
   if (options.username) userPass = options.username;
   if (options.password) userPass += ':' + options.password;
   // =>set branch
   let branch = options.branch;
   if (!branch) branch = '';
   // =>generate command
   let command = `git clone ${q.protocol}//${userPass.length > 0 ? userPass + '@' : ''}${q.host}${q.pathname} ${branch}`;
   // console.log('command:', command);
   // =>try to clone
   let output = await exec(command);

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