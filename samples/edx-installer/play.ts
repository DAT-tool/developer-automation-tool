import { info, log } from "@dat/lib/log";
import { play } from '@dat/lib/play';
import { ps, exec } from '@dat/lib/docker';

export async function main(argvs) {
   log('args:' + argvs.join(','))
   let VERSION = '1.3';
   info(
      '\n***************************************' +
      '\n***EDX Installer - v ' + VERSION + ' (by madkne)***' + '\n***************************************'
   );

   let res = await play('install-docker');
   info('result:' + res)

   console.log(await exec('21e30fe54f0c', 'echo "hello"'));
}
