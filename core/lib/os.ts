import { execSync } from 'child_process';
import * as os from 'os';
import * as fs from 'fs';

export type LinuxDistributionName = 'debian' | 'ubuntu' | 'opensuse-leap' | 'opensuse' | 'ManjaroLinux' | 'centos' | 'fedora' | 'redhat';

export function platform() {
   return os.platform();
}

export function commandResult(cmd: string) {
   return execSync(cmd).toString();
}


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