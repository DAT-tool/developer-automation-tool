import * as net from 'net';
import * as path from 'path';
import { argv } from 'process';
import { error } from './log';
import { connectDatSocket } from './os';



export async function play(name: string, argvs: string[] = [], debug = false): Promise<number> {
   let res = await connectDatSocket({
      event: 'play',
      name,
      argvs,
   }, debug);
   return res.status;
}
/***************************************** */
export async function playFromGit(url: string) {
   //TODO:
}