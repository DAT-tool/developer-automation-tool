import { execSync } from 'child_process';
import { errorLog, runSudoCommand } from '../common/public';
import { warning } from './log';

export type ServerDockerStatus = 'exist' | 'permitted' | 'notfound';

/******************************************** */
/**
 * run 'docker ps' with options
 * @param options 
 */
export async function ps(options: {
   all?: boolean;
   fields?: ('ID' | 'Image' | 'Command' | 'State' | 'Names' | 'CreatedAt' | 'RunningFor')[];
   sudoPassword?: string;
} = { fields: ['ID'] }): Promise<string[][]> {
   // =>generate command
   let format = '';
   let command = 'docker ps ';
   if (options.all) command += '--all ';
   if (!options.fields) options.fields = ['ID'];
   // =>add fields
   format = options.fields.map(i => `{{.${i}}}`).join('---');
   command += `--format="${format}"`;
   // =>run command
   let result = await runDockerCommand(command, options.sudoPassword);
   let containers = [];
   // =>if normal, parse list
   if (result.result && result.result.length > 3) {
      let lines = result.result.split('\n').map(i => i.trim());
      for (const line of lines) {
         let segments = line.split('---').map(i => i.trim());
         // =>if segments less than 2
         if (segments.length < 2) continue;
         // =>add container
         containers.push(segments);
      }
      return containers;
   }
}
/******************************************** */
/**
 * run 'docker exec' as bash or sh on containers
 * @param container 
 * @param command 
 * @param options 
 * @returns 
 */
export async function exec(container: string, command: string, options: { sudoPassword?: string } = {}) {
   // =>escape command
   command = command.replace(/\"/g, '\\"');
   // =>generate command
   let bashCommand = `docker exec ${container} bash -c "${command}"`;
   let shCommand = `docker exec ${container} sh -c "${command}"`;
   // =>run command
   let res = await runDockerCommand(bashCommand, options.sudoPassword);
   // =>check response error, if exist
   if (res.error && String(res.error).indexOf('Error: Command failed') > -1) {
      // =>try with 'sh'
      res = await runDockerCommand(shCommand, options.sudoPassword);
   }
   return res;
}
/******************************************** */
export async function cp(container: string, hostPath: string, containerPath: string, options: { sudoPassword?: string } = {}) {
   let command = `docker cp ${hostPath} ${container}:${containerPath}`;

   // =>run command
   let res = await runDockerCommand(command, options.sudoPassword);

   return res;
}
/******************************************** */
export async function runDockerCommand(command: string, sudoPassword?: string) {
   let result = '';
   let error;
   let isError = false;
   let status: ServerDockerStatus = 'exist';
   try {
      result = execSync(command).toString();
   } catch (e) {
      // errorLog('err34533', String(e));
      isError = true;
      result = String(e);
   }
   // =>if error occurs
   if (isError) {
      // =>if docker not exist
      if (result.indexOf('not found') > -1) {
         status = 'notfound';
      }
      // =>if docker permitted with sudo
      else if (result.indexOf('permission') > -1) {
         status = 'permitted';
         let t1, t2;
         try {
            // =>if sudo password, not set
            if (!sudoPassword) {
               warning('sudo password needs to run permitted docker commands');
            }
            [result, t1, t2] = await runSudoCommand(command, sudoPassword);
            // console.log('run sudo command with:', command, sudoPassword, result, t1, t2);
         } catch (e) {
            error = e;
         }
      }
      // =>if really error!
      else {
         error = result;
      }
   }

   return {
      result,
      error,
      status,
      command,
   };
}
