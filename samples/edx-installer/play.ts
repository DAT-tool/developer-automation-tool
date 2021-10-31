import { info, log, clear } from "@dat/lib/log";
import { play } from '@dat/lib/play';
import { push, clone } from '@dat/lib/git';
import { ps, exec } from '@dat/lib/docker';
import { exec as osExec } from '@dat/lib/os';

export async function main(argvs) {
   clear();
   log('args:' + argvs.join(','))

   let VERSION = '1.3';
   info(
      '\n***************************************' +
      '\n***EDX Installer - v ' + VERSION + ' (by madkne)***' + '\n***************************************'
   );

   let res = await play('install-docker');
   info('result:' + res)

   console.log((await ps({ fields: ['ID', 'Image', 'Command'] })));

   // console.log(await clone({
   //    username: 'root',
   //    cloneUrl: 'http://server12.berkco.ir:10000/root/DAT.git'
   // }));
   console.log(await osExec('git --version'))
}
