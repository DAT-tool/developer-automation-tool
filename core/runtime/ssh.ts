import { ExecResponse } from './../common/interfaces';
import { ExitCode } from './../common/types';

import * as SSH from 'ssh2';
import * as FS from 'fs';
import * as PATH from 'path';
import { errorLog, messageLog } from '../common/public';
import { CommandInput } from '../common/command-input';
import * as child_process from 'child_process';

export type SSHClient = SSH.Client; //SSH2Promise
import * as readline from 'readline';
import { Global } from '../global';
import { SSHHostConfig } from '../common/interfaces';


export class SSHConnection {
   ssh: SSHClient;
   server: SSHHostConfig;
   stream: SSH.ClientChannel;
   stdoutBuffer: string;
   isLocalHost = false;
   os = 'linux';
   machine: string; // machine hardware name like x86_64
   kernel_version: string;
   hostname: string;
   linux_distro: 'debian';

   /**************************************** */
   constructor(server: SSHHostConfig, ssh?: SSHClient) {
      this.ssh = ssh;
      server.connection = undefined;
      this.server = server;
      // =>check if localhost
      if (server.host === 'localhost' || server.host === '127.0.0.1') {
         this.isLocalHost = true;
      }
   }
   /**************************************** */
   async init() {
      // =>if local host
      if (this.isLocalHost) {
         await this.getBasicHostInfo();
      } else {
         await this.initShell();
         if (!await this.getBasicHostInfo()) return;
      }
   }
   /**************************************** */
   async getBasicHostInfo() {
      let res;
      // =>os
      res = await this.exec('uname -o');
      this.os = String(res[0]).trim();
      if (!this.os || this.os.startsWith('\x1b')) {
         // console.error(res);
         // =>try to add ssh key
         SSHConnection.addSSHKeyFingerprint(this.server);
         this.os = undefined;
         return false;
      }
      // =>machine type
      res = await this.exec('uname -m');
      this.machine = String(res[0]).trim();
      // console.log(res)

      // =>kernel version
      res = await this.exec('uname -r');
      this.kernel_version = String(res[0]).trim();
      // =>hostname
      res = await this.exec('hostname');
      this.hostname = String(res[0]).trim();
      // =>detect linux distro
      res = await this.exec(`python -c 'import platform; print(platform.linux_distribution()[0])'`);
      this.linux_distro = res[0];

      return true;

   }
   /**************************************** */
   async initShell(): Promise<boolean> {
      return new Promise((res) => {
         this.ssh.shell((err, stream) => {
            if (err) {
               errorLog('ssh', err.message);
               res(false);
               return;
            }
            this.stream = stream;
            // this.stream.stdout.on('data', (data) => this.streamDataEvent(data));
            // this.stream.stderr.on('data', (data) => this.streamDataEvent(data));
            // this.stream.on('close', (code, signal) => {
            //    errorLog('close', String(code) + String(signal));
            // });
            res(true);
            // stream.on('close', (code, signal) => {
            //    // console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
            //    // this.ssh.end();
            //    res([undefined, 'stderr', { code, message: 'close stream' }]);

            // }).on('data', (data) => {
            //    res([String(data), 'stdout']);
            //    console.log('STDOUT: ' + data);
            // }).stderr.on('data', (data) => {
            //    res([data, 'stderr']);
            //    // console.log('STDERR: ' + data);
            // });
         });
      });
   }
   /**************************************** */
   async exec(command: string): Promise<[result: any, mode: 'stdout' | 'stderr', error?: Error | { code?: number; message?: string }]> {
      // =>if localhost
      if (this.isLocalHost) {
         return await this.localExec(command);
      }
      return new Promise((res) => {
         this.ssh.exec(command, {
            pty: true,
         }, (err, stream) => {
            if (err) {
               res([undefined, 'stderr', err]);
               return;
            }
            stream.on('close', (code, signal) => {
               res(['', 'stdout', { code }]);
               // res([undefined, 'stderr', { code, message: 'close stream' }]);
            }).on('data', (data) => {
               let sudoPass = this.askSudoPassword(data);
               if (sudoPass) {
                  stream.write(sudoPass + '\n');
                  return;
               }
               // if (String(data).indexOf(`[sudo] password for ${this.server.username}:`) !== -1) {
               //    stream.write(this.server.password + '\n');
               //    return;
               // }
               res([String(data), 'stdout']);
               // console.log('STDOUT: ' + data);
            }).stderr.on('data', (data) => {
               res([String(data), 'stderr']);
               // console.log('STDERR: ' + data);
            });
         });

      });
   }
   /**************************************** */
   async localExec(command: string): Promise<[result: any, mode: 'stdout' | 'stderr', error?: Error | { code?: number; message?: string }]> {
      return new Promise((res) => {
         // let stdout = '';
         // let stderr = '';
         // let split = command.split(' ');
         // console.log('command:', command)
         // let prc = child_process.spawn('/usr/bin/sudo', split, { shell: true });
         // prc.stdin.on('pipe', () => {
         //    console.log('pip:')
         // })
         // process.stdin.pipe(prc.stdin)
         // setTimeout(function () {
         //    prc.stdin.write('dfddd\n\n');
         //    // process.stdout.write('Something I want to print\n\n');
         // }, 1000);
         // prc.on('message', (msg) => {
         //    console.log('msg:', msg)
         // })
         // // console.log(String(process.output))
         // // console.log(String(process.stdout))
         // // process.stdin.write(command + '\n');
         // prc.stdout.on('data', (data) => {
         //    console.log('out:', String(data))

         //    stdout += String(data) + '\n';
         //    res([String(data), 'stdout']);
         // });
         // prc.on('close', (code) => {
         //    console.log('close:', code)
         //    res([stdout, code === 0 ? 'stdout' : 'stderr', { code, message: stderr }]);
         // });
         // prc.on('error', (err) => {
         //    console.log('err1:', err)

         //    res([undefined, 'stderr', err]);
         // });
         // prc.stderr.on('data', (data) => {
         //    console.log('err:', String(data))
         //    // console.log('err:', String(data).replace(/\n/g, '---'))
         //    // =>check for sudo password
         //    let sudoPass = this.askSudoPassword(data);
         //    console.log('fff:', String(data).replace(/\n/g, '---'), sudoPass)
         //    if (sudoPass) {
         //       process.stdin.write(sudoPass + '\n');
         //       return;
         //    }


         //    stderr += String(data) + '\n';
         // });



         // console.log('gggg:', command)
         const process1 = child_process.exec(command, (error, stdout, stderr) => {
            if (error) {
               res([undefined, 'stderr', error]);
               return;
            }
            if (stderr) {
               res([undefined, 'stderr', { code: 1, message: stderr }]);
               return;
            }
            // =>check for sudo password
            // let sudoPass = this.askSudoPassword(stdout);
            // // process.stdin.write()
            // process.stdin.end('fffff\n');
            // if (sudoPass) {
            //    console.log('fhfdh', sudoPass)
            // }
            res([stdout, 'stdout']);
         });

      });
   }
   /**************************************** */
   askSudoPassword(data: string) {
      if (String(data).indexOf(`[sudo] password for ${this.server.username}:`) > -1) {
         return this.server.password;
      }
      return undefined;
   }
   /**************************************** */
   // async shell(command: string): Promise<[result: any, mode: 'stdout' | 'stderr', error?: Error | { code?: number; message?: string }]> {
   //    return new Promise((res) => {
   //       this.ssh.shell((err, stream) => {
   //          if (err) {
   //             res([undefined, 'stderr', err]);
   //             return;
   //          }
   //          stream.on('close', (code, signal) => {
   //             // console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
   //             // this.ssh.end();
   //             res([undefined, 'stderr', { code, message: 'close stream' }]);
   //          }).on('data', (data) => {
   //             res([String(data), 'stdout']);
   //             console.log('STDOUT: ' + data);
   //          }).stderr.on('data', (data) => {
   //             res([data, 'stderr']);
   //             // console.log('STDERR: ' + data);
   //          });
   //          stream.write(command + '\n');
   //       });
   //       // this.ssh.sftp((err, sftp) => {
   //       //    if (err) {
   //       //       res([undefined, 'stderr', err]);
   //       //       return;
   //       //    }
   //       //    sftp.
   //       // });
   //    });
   // }
   /**************************************** */
   async close() {
      if (this.ssh) {
         if (this.stream) {
            this.stream.end('exit\nexit\n');
         }
         this.ssh.end();
      }
   }
   /**************************************** */
   async sftpSession(): Promise<[Error, SSH.SFTPWrapper]> {
      return new Promise((res) => {
         this.ssh.sftp((err, sftp) => {
            res([err, sftp]);
         });
      })
   }
   /**************************************** */
   async mkdir(sftp: SSH.SFTPWrapper, remotePath: string): Promise<ExecResponse> {
      return new Promise(async (res) => {
         sftp.mkdir(remotePath, (err) => {
            let code = 0;
            if (err) code = ExitCode.FAILED_MKDIR;
            res({ code, stderr: err });
         });
      });
   }
   /**************************************** */
   async stat(sftp: SSH.SFTPWrapper, remotePath: string): Promise<ExecResponse> {
      return new Promise(async (res) => {
         sftp.stat(remotePath, (err, stats) => {
            let code = 0;
            if (err) code = ExitCode.FAILED_STAT;
            res({ code, stderr: err, stdout: JSON.stringify(stats) });
         });
      });
   }
   /**************************************** */
   async scp(sftp: SSH.SFTPWrapper, mode: 'putFile' | 'putDirectory' | 'getFile' | 'getDirectory', remotePath: string, localPath: string): Promise<ExecResponse> {
      return new Promise(async (res) => {
         // =>if transfer a file to remote
         if (mode === 'putFile') {
            sftp.fastPut(localPath, remotePath, (err) => {
               let code = 0;
               if (err) code = ExitCode.FAILED_COPY;
               res({ code, stderr: err });
            });
         }
         // =>if transfer a dir to remote
         else if (mode === 'putDirectory') {
            const sftpCopyDirectory = async (remote: string, local: string): Promise<ExecResponse> => {
               // => list all files, dirs in path
               const files = FS.readdirSync(local, { withFileTypes: true });
               for (const f of files) {
                  // =>if file
                  if (f.isFile()) {
                     // =>transfer file
                     let res1 = await this.scp(sftp, 'putFile', PATH.join(remote, f.name), PATH.join(local, f.name));
                     if (res1.code !== 0) return res1;
                  }
                  //=> if dir
                  if (f.isDirectory()) {
                     // =>add folder
                     let res2 = await this.mkdir(sftp, PATH.join(remote, f.name));
                     if (res2.code !== 0) return res2;
                     // =>copy dir
                     let res3 = await sftpCopyDirectory(PATH.join(remote, f.name), PATH.join(local, f.name));
                     if (res3.code !== 0) return res3;
                  }
               }
               return { code: ExitCode.SUCCESS };
            };
            // =>check remote path folder, exist
            let stat = await this.stat(sftp, remotePath);
            if (stat.code !== 0) {
               let res4 = await this.mkdir(sftp, remotePath);
               if (res4.code !== 0) res(res4);
            }
            // =>call sftp copy directory function
            res(await sftpCopyDirectory(remotePath, localPath));
         }
         // =>if transfer a file from remote
         if (mode === 'getFile') {
            sftp.fastGet(remotePath, localPath, (err) => {
               let code = 0;
               if (err) code = ExitCode.FAILED_COPY;
               res({ code, stderr: err });
            });
         }
         else {
            res({ code: 0 });
         }
      });
   }
   /**************************************** */
   /**************************************** */
   /**************************************** */
   static async connectSSH(server: SSHHostConfig): Promise<SSH.Client | string> {
      return new Promise((res) => {
         const conn = new SSH.Client();
         conn.on('ready', (details) => {
            // console.log(conn.shell)
            res(conn);
         })
            .on('timeout', (message) => {
               res('timeout');
            })
            .on('close', () => {
               res('closed');
            })
            .on('error', (message) => {
               // messageLog(`error on ssh ${server.name}: ${message}`);
               res(message.message || message.name);
            })
            .connect({
               host: server.host,
               port: server.port,
               password: server.password,
               username: server.username,
               tryKeyboard: true,
               hostHash: 'sha1',
               // debug: (info) => {
               //    console.log('debug:', info)
               // }
            });
      });

   }
   /**************************************** */
   static async addSSHKeyFingerprint(server: SSHHostConfig) {
      // ssh-keyscan - H - p 2222 192.168.1.107 >> ~/.ssh/known_hosts
      try {
         // =>find host in known_hosts
         const res = child_process.execSync(`ssh-keygen -F ${server.host}`).toString();
         if (res.length > 10) {
            console.log('exist host in known_hosts!');
            return;
         }
      } catch (e) { }
      const res1 = child_process.execSync(`ssh-keyscan -H -p ${server.port} ${server.host} >> ~/.ssh/known_hosts`).toString();
      console.log(res1);
      console.log('\n\r***please reset script!***');
   }
}