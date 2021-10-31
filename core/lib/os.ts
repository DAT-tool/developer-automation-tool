import { execSync, spawn } from 'child_process';
import * as os from 'os';
import * as fs from 'fs';

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
/***************************************** */
export async function exec(command: string | string[]): Promise<{ stdout?: string; stderr?: string; code: number; }> {
   // =>if command not split, split it!
   if (typeof command === 'string') {
      command = commandSplitter(command);
   }
   if (!Array.isArray(command) || command.length < 1) return { code: 1000 };
   return new Promise((res) => {
      let stdout = '';
      let stderr = '';
      //kick off process of listing files
      var child = spawn(command[0], (command as string[]).slice(1));

      //spit stdout to screen
      child.stdout.on('data', (data: string) => {
         stdout += data.toString() + '\n';
      });

      //spit stderr to screen
      child.stderr.on('data', (data: string) => {
         stderr += data.toString() + '\n';
      });

      child.on('close', (code) => {
         res({ stdout: stdout.trim(), stderr: stderr.trim(), code });
      });
   });
}