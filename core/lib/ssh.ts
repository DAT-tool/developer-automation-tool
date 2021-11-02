import { platform } from 'os';
import { ExecResponse, SSHConfig } from "../common/interfaces";
import { runSudoCommand, spawnExec } from "../common/public";
import { ReturnStatusCode } from "../common/types";
import { debug, error, info, warning } from "./log";
import * as path from 'path';
import * as fs from 'fs';
import * as net from 'net';
import { checkCommand, commandSplitter, connectDatSocket, exec, linuxDistribution } from "./os";



export async function scp(options: {

   mode: 'putFile' | 'putDirectory' | 'getFile' /*| 'getDirectory'*/;
   config: SSHConfig,
   remotePath: string;
   localPath: string;
}): Promise<ExecResponse> {
   if (!options.localPath) options.localPath = '.';
   // =>make absolute local path
   options.localPath = path.resolve(options.localPath);
   // =>if get file mode
   // if (options.mode === 'getFile' && fs.statSync(options.localPath)?.isDirectory()) {
   //    options.localPath = 
   // }
   // =>send command to execute from DAT
   let res = await connectDatSocket({
      event: 'ssh',
      name: 'scp',
      options,
   });
   if (res.status === 0) {
      let result = JSON.parse(res.data);
      return result;
   } else {
      return { code: res.status };
   }

}
/**************************************** */
export async function checkSSHInstalled() {
   return await checkCommand('ssh -V', 'OpenSSH', 'Open SSH not installed!');
}
/**************************************** */
// export async function sshpass(command: string, password: string) {
//    let res = await connectDatSocket({
//       event: 'ssh',
//       name: ''
//    })
// }