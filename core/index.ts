
import { CommandRunArgv } from './common/interfaces';
import { errorLog, getFilesList } from './common/public';
import { Global } from './global';
import * as FS from 'fs';
import * as PATH from 'path';
/*************************************** */
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
      // =>init vars
      let commandClass: any;
      let commandsPath = PATH.join(Global.dirPath, 'commands');
      let commandPath = PATH.join(commandsPath, commandName + '.js');
      // =>parse all argvs
      let argvs = parseArgvs();
      // =>check command name not exist
      if (!FS.existsSync(commandPath)) {
         try {
            // =>get all commands
            let commands = getFilesList(commandsPath, /.*.js$/);
            // console.log('ffff', commandsPath, commands)
            // =>iterate all commands
            for (const command of commands) {
               // =>init command class
               const cClass = await import(command.path);
               // console.log(cClass['init'](), commandName)
               // =>get command alias
               let alias = cClass['init']()['alias'];
               if (alias && alias === commandName) {
                  commandClass = cClass['init']()['class'];
               }
            }
         } catch (e) {
            errorLog('er75', e);
            console.error(e)
         }
      }
      else {
         // =>import command js file
         let importFile = await import(commandPath);
         // =>get command class
         commandClass = importFile['init']()['class'];
      }
      // =>init command class
      let cmd = new commandClass();
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
/*************************************** */
function parseArgvs() {
   let effectArgvs = process.argv.slice(3);
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
   return argvs;
}