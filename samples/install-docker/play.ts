import { info, success, successStatus } from "@dat/lib/log";
import { gnupg, install } from "@dat/lib/apt";
import { platform } from "os";
import { commandResult, linuxDistribution } from '@dat/lib/os';


export async function main(argvs) {
   info('checking docker installed ...');
   // =>get platform type
   if (platform() === 'linux') {
      // =>check docker installed
      if (commandResult('docker --version').indexOf('not found') === -1) {
         successStatus('docker installed');
         return 0;
      }
      // =>get linux disto name
      let distro = linuxDistribution();
      // =>if debian based
      if (distro.name === 'debian' || distro.name === 'ubuntu') {
         info('installing required packages ...');
         await install(['apt-transport-https', 'ca-certificates', 'curl', 'gnupg', 'lsb-release']);
         info('adding docker sources ...');
         // =>verify docker source
         await gnupg('https://download.docker.com/linux/ubuntu/gpg');

      }
   }
   else {
      //TODO:
   }
}
