
import { CommandRunArgv } from './common/interfaces';
import { errorLog } from './common/public';
import { Global } from './global';
// =>get process argvs
const argvs = process.argv;
// =>get current dir
Global.pwd = process.cwd();
// =>get execute dir path
Global.dirPath = __dirname;
// console.log('debug:', argvs, Global.pwd, __dirname);
// =>get command
// =>if not found command name
if (process.argv.length < 3) {
   process.argv.push('help');
}
// =>if help commands
if (process.argv[2] === '-h' || process.argv[2] === '--help') {
   process.argv[2] = 'help';
}
let commandName = process.argv[2];
boot();
/*************************************** */
async function boot() {
   // =>try to find and import command
   try {
      let effectArgvs = process.argv.slice(3);
      // =>parse all argvs
      let argvs: CommandRunArgv[] = [];
      for (let i = 0; i < effectArgvs.length; i++) {
         // =>init vars
         const argv = effectArgvs[i];
         let key = '';
         let value;
         let isAlias = false;
         // =>find argv name or alias
         if (argv.startsWith('--')) {
            key = argv.substr(2).split('=')[0];
            if (argv.split('=').length > 1) {
               value = argv.split('=')[1];
            }
         } else if (argv.startsWith('-')) {
            key = argv.substr(1);
            isAlias = true;
            // =>find argv in next 
            if (i + 1 < effectArgvs.length && !effectArgvs[i + 1].startsWith('-')) {
               value = effectArgvs[i + 1];
               i++;
            }
         } else {
            key = argv;
         }
         // =>add parsed argv
         argvs.push({
            key,
            value,
            isAlias,
         });
      }
      // =>init command class
      const commandClass = await import('./commands/' + commandName + '.js');
      // =>init command class
      let cmd = new (commandClass['init']())();
      // console.log('cmd:', cmd)
      // =>map command argvs
      cmd['mapRunArguments'](argvs);
      // =>pre run command
      cmd['preRun']();
   } catch (e) {
      // console.error(e);
      errorLog('err655', 'can not find such command: ' + commandName);
   }
}