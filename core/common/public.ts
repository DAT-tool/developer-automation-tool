import { CommandInput } from "./command-input";
import * as PROCESS from 'process';
import * as PATH from 'path';
import * as FS from 'fs';
import * as NET from 'net';
import { ExecResponse, FileInfo } from "./interfaces";
import { ChildProcessWithoutNullStreams, spawn, SpawnOptions, SpawnOptionsWithoutStdio } from "child_process";
import { ReturnStatusCode } from "./types";
/************************************************************* */
export function log(text: string, label?: string, type: 'info' | 'error' | 'warning' | 'success' | 'normal' = 'normal', hasDateTime = true, end = '\n') {
   let time = new Date().toTimeString().slice(0, 8);
   let date = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
   let message;
   if (hasDateTime) {
      message = `[${date}-${time}] : ${text}`;
   } else {
      message = text;
   }
   if (label && label.length > 0) {
      if (hasDateTime) {
         message = `[${date}-${time}] ${label} : ${text}`;
      } else {
         message = `${label} : ${text}`;
      }
   }
   if (type === 'error') {
      process.stderr.write(CommandInput.ansiColors(message, 'red', true) + end);
      // console.error();
   } else if (type === 'info') {
      process.stdout.write(CommandInput.ansiColors(message, 'blue', true) + end);
   } else if (type === 'warning') {
      process.stdout.write(CommandInput.ansiColors(message, 'yellow', true) + end);
   } else if (type === 'success') {
      process.stdout.write(CommandInput.ansiColors(message, 'green', true) + end);
   } else {
      process.stdout.write(message + end);
      // console.log(message);
   }
}
/************************************************************* */
export function messageLog(message: string, type: 'info' | 'error' | 'warning' | 'success' | 'normal' = 'normal', end = '\n') {
   log(message, undefined, type, false, end);
}
/************************************************************* */
export function errorLog(name: string, message: any) {
   log(message, name, 'error');
   let time = new Date().toTimeString().slice(0, 8);
   let date = new Date().toISOString().slice(0, 10).replace(/-/g, '.');

   try {
      let Global = require("../global");
      // =>if enable debug mode
      if (Global.Global.isDebug && typeof message === 'object') console.error(message);
      // FS.writeFileSync(PATH.join(Settings.VARS_PATH, 'errors'), `[${date}-${time}] ${name} ${phone}::${message}\n`, {
      //    flag: 'a',
      // });
   } catch (e) {
      // log(`can not write on ${PATH.join(Settings.VARS_PATH, 'errors')} file`, 'err4553', 'error');
   }
}
/************************************************************* */
export function infoLog(name: string, message: string) {
   log(message, name, 'info');
   try {
      let time = new Date().toTimeString().slice(0, 8);
      let date = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
      // FS.writeFileSync(PATH.join(Settings.VARS_PATH, 'info'), `[${date}-${time}] ${name} ${message}\n`, {
      //    flag: 'a',
      // });
   } catch (e) {
      // log(`can not write on ${PATH.join(Settings.VARS_PATH, 'info')} file`, 'err455563', 'error');
   }
}
/************************************************************* */
export function warningLog(name: string, message: string) {
   log(message, name, 'warning');
   try {
      let time = new Date().toTimeString().slice(0, 8);
      let date = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
      // FS.writeFileSync(PATH.join(Settings.VARS_PATH, 'info'), `[${date}-${time}] ${name} ${message}\n`, {
      //    flag: 'a',
      // });
   } catch (e) {
      // log(`can not write on ${PATH.join(Settings.VARS_PATH, 'info')} file`, 'err455563', 'error');
   }
}
/************************************************************* */
/**
 * 
 * @param source 
 * @param target 
 * @param justContents not copy source dir, just its content
 */
export function copyFolderSync(source: string, target: string, justContents = false) {
   if (!FS.lstatSync(source).isDirectory()) return;
   // Check if folder needs to be created or integrated
   let targetFolder = PATH.join(target, PATH.basename(source));
   if (justContents) targetFolder = target;
   if (!FS.existsSync(targetFolder)) {
      FS.mkdirSync(targetFolder, { recursive: true });
   }

   // Copy

   let files = FS.readdirSync(source, { withFileTypes: true });
   for (const f of files) {
      var curSource = PATH.join(source, f.name);
      var curDest = PATH.join(targetFolder, f.name);
      // =>if dir
      if (f.isDirectory()) {
         copyFolderSync(curSource, curDest, true);
      }
      // =>if file
      else {
         FS.copyFileSync(curSource, curDest);
      }

   }

}
/************************************************************* */
export async function copyDirectory(path: string, newPath: string, excludeFiles?: string[], excludeDirs?: string[]) {
   // =>create new directory
   FS.mkdirSync(newPath, { recursive: true });
   // =>list all files, dirs in path
   const files = FS.readdirSync(path, { withFileTypes: true });
   for (const f of files) {
      // =>if file
      if (f.isFile()) {
         // =>check not in exclude files
         if (excludeFiles && excludeFiles.includes(f.name)) continue;
         // =>add file
         FS.copyFileSync(PATH.join(path, f.name), PATH.join(newPath, f.name));
      }
      //=> if dir
      if (f.isDirectory()) {
         // =>check not in exclude dirs
         if (excludeDirs && excludeDirs.includes(f.name)) continue;
         // =>add folder
         FS.mkdirSync(PATH.join(newPath, f.name), { recursive: true });
         await copyDirectory(PATH.join(path, f.name), PATH.join(newPath, f.name));
      }
   }
   return true;
}
/************************************************************* */
export function deleteDirectory(path: string) {
   if (FS.existsSync(path)) {
      FS.readdirSync(path).forEach((file, index) => {
         const curPath = PATH.join(path, file);
         if (FS.lstatSync(curPath).isDirectory()) { // recurse
            deleteDirectory(curPath);
         } else { // delete file
            FS.unlinkSync(curPath);
         }
      });
      FS.rmdirSync(path);
   }
}
/************************************************************* */
export function generateString(length = 10, includeNumbers = true, includeChars = true) {
   var result = '';
   var characters = '';
   if (includeChars) {
      characters += 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
   }
   if (includeNumbers) {
      characters += '0123456789';
   }
   if (!includeChars && !includeNumbers) {
      characters += '-';
   }
   var charactersLength = characters.length;
   for (var i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return result;
}
/************************************************************* */
export async function sleep(ms = 1000) {
   return new Promise(resolve => setTimeout(resolve, ms));
}
/************************************************************* */
/**
 * 
 * @param path 
 * @param match just files and folders that match by this 
 * @returns 
 */
export function getFilesList(path: string, match?: RegExp) {
   let files: FileInfo[] = [];
   try {
      const filesInDirectory = FS.readdirSync(path);
      for (const file of filesInDirectory) {
         // =>match search regex, if exist
         if (match && !match.test(file)) continue;
         const absolute = PATH.join(path, file);
         // =>get stat of file
         const stat = FS.statSync(absolute);
         // =>add file
         files.push({
            path: absolute,
            type: stat.isDirectory() ? 'dir' : 'file',
            stat,
         });
         // =>if dir
         if (stat.isDirectory()) {
            const dirFiles = getFilesList(absolute, match);
            for (const f of dirFiles) {
               files.push(f);
            }
         }
      }
   } catch (e) {
      errorLog('er23', e);
   }
   return files;
}
/************************************************************* */
export function randomInt(min: number, max: number) { // min and max included
   return Math.floor(Math.random() * (max - min + 1) + min)
}
/************************************************************* */
export async function checkPortInUse(port: number): Promise<boolean> {
   return new Promise((res) => {
      var server = NET.createServer(function (socket) {
         socket.write('Echo server\r\n');
         socket.pipe(socket);
      });
      server.on('error', function (e) {
         res(true);
      });
      server.on('listening', function (e) {
         server.close();
         res(false);
      });

      server.listen(port, '127.0.0.1');
   });
}
/************************************************************* */
export async function runSudoCommand(command: string, password: string): Promise<[output: string, pid?: number, error?: any]> {
   try {
      const sudo = require('./sudo-js');
      sudo.setPassword(password);
      var commandSplit = command.split(' ').filter(i => i.trim() !== '');
      return new Promise((res) => {
         sudo.exec(commandSplit, function (err, pid, result) {
            res([String(result), pid, err]);
         });
      });
   } catch (e) {
      errorLog('err354223', e);
      return ['', 0, e];
   }
}
/************************************************************* */
export function execCommandSplitter(command: string) {
   let commands: string[] = [];
   let isStr = false;
   let buffer = '';
   for (let i = 0; i < command.length; i++) {
      // =>is str
      if ((i === 0 || command[i - 1] !== '\\') && (command[i] === '\"' || command[i] === '\'')) isStr = !isStr;
      // =>if space
      if (!isStr && command[i] === ' ') {
         if (buffer.trim().length > 0) {
            commands.push(buffer.trim());
         }
         buffer = '';
         continue;
      }
      // =>save on buffer
      buffer += command[i];
   }
   if (buffer.trim().length > 0) {
      commands.push(buffer.trim());
   }
   return commands;
}
/************************************************************* */
export async function outputStreamExec(command: string, cwd?: string): Promise<number> {
   return new Promise((res) => {
      // =>split command
      let cmds = execCommandSplitter(command);
      // =>run command by spawn
      let exe = spawn(cmds[0], cmds.slice(1), { shell: true, cwd, stdio: 'inherit' });
      // =>when finished command
      exe.on('exit', function (code) {
         res(code);
      });
   });
}
/************************************************************* */
export function convertMSToHumanly(ms: number) {
   let units = ['ms', 'sec', 'min', 'hr'];
   let i = 0;
   // tslint:disable-next-line: prefer-for-of
   while (true) {
      if (units[i] === 'ms') {
         if (ms < 1000) break;
         ms /= 1000;
         i++;
      }
      else if (units[i] === 'sec' || units[i] === 'min') {
         if (ms < 60) break;
         ms /= 60;
         i++;
      }
      else if (units[i] === 'hr') {
         if (ms < 24) break;
         ms /= 24;
         i++;
      } else if (units[i] === 'd') {
         if (ms < 7) break;
         ms /= 7;
         i++;
      } else {
         break;
      }
      ms = Number(ms.toFixed(1));
      if (i >= units.length) break;
   }
   return { unit: units[i], time: ms };
}
/************************************************************* */
export async function spawnExec(
   command: string | string[],
   callback: (
      type: 'stdout' | 'stderr' | 'error' | 'close',
      data: any,
      child: ChildProcessWithoutNullStreams
   ) => Promise<ExecResponse>,
   options?: SpawnOptions): Promise<ExecResponse> {
   // =>if command not split, split it!
   if (typeof command === 'string') {
      command = execCommandSplitter(command);
   }
   // =>if not valid command
   if (!Array.isArray(command) || command.length < 1) return { code: ReturnStatusCode.INVALID_INPUT, };
   return new Promise((res) => {
      //kick off process of listing files
      var child = spawn(command[0], (command as string[]).slice(1), options);

      // =>listen on stdout
      child.stdout.on('data', async (data: any) => {
         let result = await callback('stdout', data, child);
         if (result) {
            res(result);
         }
      });
      // =>listen on stderr
      child.stderr.on('data', async (data: any) => {
         let result = await callback('stderr', data, child);
         if (result) {
            res(result);
         }
      });
      child.on('error', async (err) => {
         let result = await callback('error', err, child);
         if (result) {
            res(result);
         }
      });
      child.on('close', async (code) => {
         let result = await callback('close', code, child);
         if (result) {
            res(result);
         }
      });
      // child.stdout.pipe(process.stdout);
      // child.stderr.pipe(process.stderr);
      // process.stdin.pipe(child.stdin);
   });
}
