import { platform } from 'os';
import { error, info, successStatus } from "@dat/lib/log";
import * as OS from '@dat/lib/os';
import * as APT from '@dat/lib/apt';
import * as SYS from '@dat/lib/systemctl';

export async function main(): Promise<number> {
   info('checking for install Tor ...');
   if (!await OS.checkCommand('tor --version', 'Tor version')) {
      if (!await installTor()) return 1;
   }
   info('restarting Tor Service ...');
   if (!await restartTor()) return 1;

   return 0;
}

/******************************* */
async function installTor() {
   // =>if linux
   if (platform() === 'linux') {
      // =>detect disto
      let distro = OS.linuxDistribution();
      // =>if debian based
      if (distro.name === 'ubuntu' || distro.name === 'debian') {
         // =>install by apt
         let res = await APT.install('tor', true);
         if (res.code !== -1) return false;
      } else {
         //FIXME:
         error('can not install tor on linux ' + distro.name);
         return false;
      }
   }
   else {
      //FIXME:
      error('can not install tor on ' + platform());
      return false;
   }

   return true;
}
/******************************* */
async function restartTor() {
   // =>check systemctl installed
   if (!await SYS.checkSystemctlInstalled()) {
      error('can not run tor service by systemctl');
      return false;
   }
   // =>restart tor service
   await SYS.restart('tor@default', { sudoPassword: '4420790431aA+' });
   let lastPercent = -1;
   // =>get status of tor service every 1s
   for (let i = 0; i < 20; i++) {
      let done = false;
      let status = await SYS.status('tor@default', { sudoPassword: '4420790431aA+' });
      // =>check for 100%
      for (const line of status.output.split('\n')) {
         // =>get current status of tor
         let match = line.match(/Bootstrapped*.*/);
         if (match) {
            let showStatus = true;
            // =>get line percent
            let linePercentMatch = match[0].match(/\d+%/);
            if (linePercentMatch) {
               // =>compare with last percent
               let linePercent = Number(linePercentMatch[0].replace('%', ''));
               if (linePercent <= lastPercent) { showStatus = false; }
               else {
                  lastPercent = linePercent;
               }
            }
            // =>show status
            if (showStatus) {

               info(match[0]);
            }
         }
         if (lastPercent === 100 || line.indexOf('100%: Done') > -1) {
            done = true;
            break;
         }
      }
      // =>if done
      if (done) {
         successStatus('Done Tor Connection');
         break;
      }
      // =>sleep for 1s
      await OS.sleep(500);
   }

   return true;
}