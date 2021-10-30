import { VERSION, VERSION_NAME } from './../version';
import { CommandClass } from "../common/command";
import { CommandModel } from "../common/interfaces";
import { messageLog } from "../common/public";

export function init() {
   return { class: VersionCommand, alias: 'v' };
}

export type argvName = '';

/******************************************* */
export class VersionCommand extends CommandClass<argvName> {
   /********************************** */
   define(): CommandModel<argvName> {
      return {
         name: 'version',
         description: 'show version',
         alias: 'v',
         argvs: [],
      };
   }
   /********************************** */
   async run() {
      messageLog(`Developer Automation Tool ${VERSION} (${VERSION_NAME})`);
      return true;
   }
}