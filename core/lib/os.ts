import { execSync, spawn } from 'child_process';
import * as os from 'os';
import * as fs from 'fs';
import * as net from 'net';
import * as path from 'path';
import { error, debug, successStatus } from './log';
import { EventData, EventResponse, ExecResponse } from '../common/interfaces';
import { ExitCode } from '../common/types';
import { outputStreamExec, execCommandSplitter, spawnExec } from '../common/public';

export let SocketPort: number;
export let DebugMode = false;
export let currentWorkingPath: string;
export let ScriptArgvs: string[] = [];
/***************************************** */
export type LinuxDistributionName = 'debian' | 'ubuntu' | 'opensuse-leap' | 'opensuse' | 'ManjaroLinux' | 'centos' | 'fedora' | 'redhat';

/***************************************** */
export function platform() {
   return os.platform();
}
/***************************************** */
export function commandResult(cmd: string) {
   return execSync(cmd).toString();
}
/***************************************** */
export function linuxDistribution(): { name?: LinuxDistributionName; version?: string; } {
   if (platform() !== 'linux') return {};
   let name: LinuxDistributionName;
   let version: string;
   let getVersion = (text: string) => {
      let match = text.match(/\d+\.\d+/);
      if (match) version = match[0];
   }
   try {
      // =>check 'os-release' file
      if (fs.existsSync('/etc/os-release')) {
         let info = fs.readFileSync('/etc/os-release').toString().split('\n').map(i => i.split('='));
         let line1 = info.find(i => i[0] === 'ID');
         if (line1) {
            name = line1[1] as any;
         }
         let line2 = info.find(i => i[0] === 'VERSION_ID');
         if (line2) {
            version = line2[1];
         }
      }
      // =>check 'lsb-release' file
      else if (fs.existsSync('/etc/lsb-release')) {
         let info = fs.readFileSync('/etc/lsb-release').toString().split('\n').map(i => i.split('='));
         let line1 = info.find(i => i[0] === 'DISTRIB_ID');
         if (line1) {
            name = line1[1] as any;
         }
         let line2 = info.find(i => i[0] === 'DISTRIB_RELEASE');
         if (line2) {
            version = line2[1];
         }
      }
      // =>check 'debian_version' file
      else if (fs.existsSync('/etc/debian_version')) {
         name = 'debian';
         let info = fs.readFileSync('/etc/debian_version').toString().trim();
         version = info;
      }
      // =>check 'SuSE-release' file
      else if (fs.existsSync('/etc/SuSE-release')) {
         name = 'opensuse';
         let info = fs.readFileSync('/etc/SuSE-release').toString().split('\n').map(i => i.split('='));
         let line1 = info.find(i => i[0] === 'VERSION');
         if (line1) {
            version = line1[1];
         }
      }
      // =>check 'centos-release' file
      else if (fs.existsSync('/etc/centos-release')) {
         name = 'centos';
         getVersion(fs.readFileSync('/etc/centos-release').toString().trim());
      }
      // =>check 'redhat-release' file
      else if (fs.existsSync('/etc/redhat-release')) {
         name = 'redhat';
         getVersion(fs.readFileSync('/etc/redhat-release').toString().trim());
      }
      // =>check 'redhat-release' file
      else if (fs.existsSync('/etc/redhat-release')) {
         name = 'redhat';
         getVersion(fs.readFileSync('/etc/redhat-release').toString().trim());
      }
      // =>check 'fedora-release' file
      else if (fs.existsSync('/etc/fedora-release')) {
         name = 'fedora';
         getVersion(fs.readFileSync('/etc/fedora-release').toString().trim());
      }

      return { name: name.toLowerCase() as any, version };
   } catch (e) {
      return { name, version };
   }
}
/***************************************** */
export function commandSplitter(command: string) {
   return execCommandSplitter(command);
}
/***************************************** */
export async function exec(command: string | string[]): Promise<ExecResponse> {
   let stdout = '';
   let stderr = '';
   return await spawnExec(command, async (type, data, child) => {
      // =>if stdout
      if (type === 'stdout') {
         // console.log('data:', String(data))
         stdout += String(data) + '\n';
      }
      // =>if stderr
      else if (type === 'stderr') {
         // console.log('data:', String(data))
         stderr += String(data) + '\n';
      }
      // =>if close
      else if (type === 'close' || type === 'error') {
         let code = ExitCode.EXEC_ERROR;
         if (type === 'close') code = Number(String(data));
         return { code, stdout: stdout.trim(), stderr: stderr.trim() };
      }
      return undefined;
   });
}
/***************************************** */
/**
 * used for checking installed a command like git or docker
 * @param command 
 * @param successResult 
 */
export async function checkCommand(command: string, successResult?: string, errorResult?: string) {
   let output = await exec(command);
   if (output.code !== 0) {
      if (errorResult) error(errorResult);
      return false;
   }
   if (successResult && output.stdout.indexOf(successResult) === -1 && output.stderr.indexOf(successResult) === -1) {
      if (errorResult) error(errorResult);
      return false;
   }
   return true;
}
/***************************************** */
export async function sleep(ms = 1000) {
   return new Promise((resolve) => {
      setTimeout(resolve, ms);
   });
}
/***************************************** */
export async function shell(command: string, cwd?: string): Promise<number> {
   return await outputStreamExec(command, cwd);
}
/***************************************** */
export async function cwd() {
   if (currentWorkingPath) return currentWorkingPath;
   // =>try to get cwd from socket
   let res = await connectDatSocket({ event: 'cwd' });
   if (res.status === 0) {
      currentWorkingPath = String(res.data);
   }
   // =>get current path  
   else {
      currentWorkingPath = path.resolve('.');
   }
   return currentWorkingPath;
}
/***************************************** */
export async function connectDatSocket(event: EventData): Promise<EventResponse> {
   // =>check socket port exist
   if (!SocketPort) {
      debug('socket port not defined, so can not create socket to connect to DAT!');
      return { status: ExitCode.DAT_SOCKET_BAD_PORT }
   }
   return new Promise((res) => {
      let client = net.connect(
         {
            port: SocketPort,
            timeout: 30,
         },
         () => {
         });
      client.on('data', (data) => {
         // console.log('[debug] client', data.toString());
         client.end();
         client.destroy();
         res({ status: ExitCode.SUCCESS, data });
      })
      client.on('connect', () => {
         client.write(JSON.stringify(event));
      });
      client.once('close', () => res({ status: ExitCode.DAT_SOCKET_CLOSE }));
      client.once('error', (e) => {
         debug(e.message);
         res({ status: ExitCode.DAT_SOCKET_ERROR });
      });
   });
}
/***************************************** */
export async function rmdir(path) {
   if (fs.existsSync(path)) {
      fs.rmdirSync(path, { recursive: true });
      return true;
   }
   return false;
}