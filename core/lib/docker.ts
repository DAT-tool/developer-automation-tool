import { execSync, spawnSync } from 'child_process';
import { errorLog, runSudoCommand } from '../common/public';
import { error, warning } from './log';
import { exec as osExec } from './os';

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
export async function run(imageName: string, options: {
   sudoPassword?: string;
   environmentVariables?: string[];
   name?: string;
   volumes?: string[];
   exposePorts?: string[];
} = {}) {
   // =>generate command
   let command = `docker run -d  `;
   // =>set name
   if (options.name) command += `--name="${options.name}"`;
   // =>set env
   if (options.environmentVariables) {
      for (const env of options.environmentVariables) {
         command += `--env="${env}"`;
      }
   }
   // =>set volumes
   if (options.volumes) {
      for (const volume of options.volumes) {
         if (volume.split(':').length < 2) {
            warning(`invalid volume: ${volume}`);
            continue;
         }
         command += `--volume="${volume}"`;
      }
   }
   // =>set ports
   if (options.exposePorts) {
      for (const port of options.exposePorts) {
         if (port.split(':').length < 2) {
            warning(`invalid port: ${port}`);
            continue;
         }
         command += `--p "${port}"`;
      }
   }

   // =>add image name
   command += ' ' + imageName;
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
   // =>check docker installed
   if (!await checkDockerInstalled()) {
      return { status: 'notfound' };
   }
   try {
      let output = await osExec(command);
      if (output.code === 0 && output.stdout && output.stdout.length > 0) {
         result = output.stdout;
      }
      if (output.stderr && output.stderr.length > 0) {
         isError = true;
         result = output.stderr;
      }
      // console.log('ee:', output)
   } catch (e) {
      errorLog('err34533', e);
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
/******************************************** */
export async function checkDockerInstalled() {
   let output = await osExec(`docker --version`);
   if (output.code !== 0 || output.stdout.indexOf('Docker version') === -1) {
      error('Docker not installed!');
      return false;
   }
   return true;
}
