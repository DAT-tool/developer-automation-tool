import * as net from 'net';
import * as path from 'path';
import { error } from './log';

export let SocketPort: number;

export async function play(name: string, argvs: string[] = [], debug = false): Promise<number> {
   // console.log('port:', SocketPort);
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
         res(Number(data));
      })
      client.on('connect', () => {
         client.write(JSON.stringify({ event: 'play', name, argvs }));
      });
      client.once('close', () => res(101));
      client.once('error', (e) => {
         if (debug) error(e.message);
         res(100);
      });
   });
}
/***************************************** */
export async function playFromGit(url: string) {
   //TODO:
}