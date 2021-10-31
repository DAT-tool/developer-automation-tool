import { runSudoCommand } from "../common/public";
import { checkCommand, exec } from "./os";

export type UnitCommand = 'start' | 'status' | 'stop' | 'restart' | 'enable' | 'disable' | 'reload';

export type ServiceStatus = 'active' | 'failed' | 'dead';


export async function restart(service: string, options: {
   sudoPassword: string;
}): Promise<{ output?: string; error?: string }> {
   let output = await runSystemctlCommands('restart', service, options.sudoPassword);
   if (!output) return {};
   return {
      output: output[0],
      error: output.length > 2 ? output[2] : '',
   };
}
/****************************************** */
export async function status(service: string, options: {
   sudoPassword: string;
}): Promise<{ status?: ServiceStatus; output?: string; error?: string }> {
   let status: ServiceStatus;
   let output = await runSystemctlCommands('status', service, options.sudoPassword);
   if (!output) return {};
   // =>extract status of service
   for (const line of output[0].split('\n')) {
      let match = line.match(/Active:\s*\w+/);
      // console.log('line:', line, match)
      if (match) {
         status = match[0].replace('Active:', '').trim() as any;
         break;
      }
   }
   return {
      status,
      output: output[0],
      error: output.length > 2 ? output[2] : '',
   };
}
/****************************************** */
export async function runSystemctlCommands(unitCommand: UnitCommand, pattern: string, sudoPassword: string, options: string[] = []) {
   // =>check systemctl installed
   if (!await checkSystemctlInstalled()) return undefined;
   if (!options) options = [];
   let output = await runSudoCommand(`sudo systemctl ${options.join(' ')} ${unitCommand} ${pattern}`, sudoPassword);

   return output;
}
/****************************************** */
export async function checkSystemctlInstalled() {
   return await checkCommand('systemctl --help', 'systemctl [OPTIONS...]', 'systemctl not installed');
}