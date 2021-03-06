import * as fs from 'fs';
import * as path from 'path';
import { DATGitBaseURl } from '../common/public';
import { ExitCode } from '../common/types';
import { checkGitInstalled, clone } from './git';
import { error } from './log';
import { connectDatSocket, copyDirectory, cwd, rmdir } from './os';

export interface GitPlayItem {
   name?: string; // needs for remove play item
   baseUrl: string;
   accessRepositories?: string[];
   username?: string;
   password?: string;
}
/***************************************** */
export const GitPlayItems: GitPlayItem[] = [
   {
      baseUrl: DATGitBaseURl(),
      name: 'DAT',
   },
];
/***************************************** */
export async function play<T = string>(name: T, argvs: string[] = []): Promise<number> {
   let res = await connectDatSocket({
      event: 'play',
      name: name as any,
      argvs,
   });
   return res.status;
}
/***************************************** */
/**
 * add a git play base url (git organization url)
 * @param base_url 
 */
export function addGitPlay(item: GitPlayItem) {
   if (!item.baseUrl || item.baseUrl.length < 2) return false;
   // =>if base url has '/' at least
   if (item.baseUrl[item.baseUrl.length - 1] === '/') item.baseUrl = item.baseUrl.substring(0, item.baseUrl.length - 1);
   // =>add to list
   GitPlayItems.push(item);
   return true;
}
/***************************************** */
/**
 * remove a git play base url by name
 * @param base_url 
 */
export function removeGitPlay(name: string) {
   // =>search by name
   let index = GitPlayItems.findIndex(i => i.name === name);
   if (index > -1) {
      GitPlayItems.splice(index, 1);
      return true;
   }
   else {
      return false;
   }
}
/***************************************** */
/**
 * first clone play script from git and then play it
 * @param name 
 * @param argvs 
 * @param options 
 * @returns 
 */
export async function playFromGit<T extends string = string>(name: T, argvs: string[] = [], options: {
   /**
    * default get all branches
    */
   branch?: string;
   /**
    * force to get from git
    */
   force?: boolean;
} = {}): Promise<number> {
   // =>check git installed
   if (!await checkGitInstalled()) return ExitCode.COMMAND_NOT_INSTALLED;
   // =>init vars
   let gitPlayDirPath = path.join(await cwd(), '.dat', 'plays');
   let gitPlayScriptPath = path.join(gitPlayDirPath, name);
   let needClone = true;
   // =>check play script is exist
   if (fs.existsSync(gitPlayScriptPath)) {
      // =>if force to clone
      if (options.force) await rmdir(gitPlayScriptPath);
      // =>so no need to clone again! 
      else needClone = false;
   }
   // =>create 'plays' folder
   fs.mkdirSync(gitPlayDirPath, { recursive: true });
   // =>if need to clone script
   if (needClone) {
      let clonedScript = false;
      // =>iterate git play items
      for (const item of GitPlayItems) {
         // =>if has access repos
         if (item.accessRepositories && !item.accessRepositories.includes(name)) continue;
         // =>try to clone
         let res = await clone({
            cloneUrl: item.baseUrl + '/' + name,
            branch: options.branch ? options.branch : undefined,
            username: item.username ? item.username : undefined,
            password: item.password ? item.password : undefined,
            depth: 1,
            deleteDirectoryIfNotEmpty: true,
         }, gitPlayDirPath);
         // console.log(res)
         // =>check for status code
         if (res.code !== 0) continue;
         // =>if branch defined, move from branch folder to root
         if (options.branch && fs.existsSync(path.join(gitPlayDirPath, options.branch))) {
            await copyDirectory(path.join(gitPlayDirPath, options.branch), gitPlayScriptPath);
            await rmdir(path.join(gitPlayDirPath, options.branch));
         }
         clonedScript = true;
         break;
      }
      // =>not found git repo by name
      if (!clonedScript) {
         return ExitCode.NOT_FOUND_GIT_REPOSITORY;
      }
   }
   // =>play script
   return await play(name, argvs);
}