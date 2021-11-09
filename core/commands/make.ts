import { CommandClass } from "../common/command";
import { CommandModel, PlayModel } from "../common/interfaces";
import * as PATH from 'path';
import { deleteDirectory, errorLog, getFilesList, infoLog } from "../common/public";
import { copyDirectoryAsync } from '../common/public';
import * as FS from 'fs';
import { Global } from "../global";
import { VERSION } from "../version";

export function init() {
   return { class: MakeCommand, alias: 'm' };
}

export type argvName = 'name';

/******************************************* */
export class MakeCommand extends CommandClass<argvName> {
   path: string;
   /********************************** */
   define(): CommandModel<argvName> {
      return {
         name: 'make',
         description: 'make an environment for develop and test script files',
         alias: 'm',
         argvs: [
            {
               name: 'name',
               alias: 'n',
               description: "name of environment (create directory with this name)",
            },
         ],
      };
   }
   /********************************** */
   async run() {
      if (this.hasArgv('name')) {
         this.path = PATH.join(Global.pwd, this.getArgv('name'));
      } else {
         this.path = Global.pwd;
      }
      // =>create dir with path
      FS.mkdirSync(this.path, { recursive: true });
      return await this.makeEnvironment();

   }
   /********************************** */
   async makeEnvironment() {
      try {
         // =>get play name
         let playName = this.getArgv('name');
         if (!playName) playName = PATH.basename(this.path);
         // =>copy all files to @dat
         await this.copyDatFiles();

         // =>create play ts file, if not
         if (!FS.existsSync(PATH.join(this.path, 'play.ts'))) {
            FS.writeFileSync(PATH.join(this.path, 'play.ts'), `
import { info } from "@dat/lib/log";

export async function main(): Promise<number> {
   info('Play This Script by DAT!');

   return 0;
}
            `.trim());
         }
         // =>create 'package.json' file, if not
         if (!FS.existsSync(PATH.join(this.path, 'package.json'))) {
            FS.writeFileSync(PATH.join(this.path, 'package.json'), JSON.stringify({
               name: playName,
               version: "1.0.0",
               main: ".dat/play.js",
               dependencies: {
                  // "dat": `^${VERSION}`,
               },
               devDependencies: {
                  "@types/node": "^16.11.6",
               },
            }, null, 2));
         }
         // =>create 'README.md' file, if not
         if (!FS.existsSync(PATH.join(this.path, 'README.md'))) {
            FS.writeFileSync(PATH.join(this.path, 'README.md'), `
# ${playName} Play Script

## Install & Use
- install node 12 or higher version
- install DAT by \`npm install -g dat-tool\`
- go to \`${playName}\` folder
- type \`npm install\` to install node types
- then, type \`dat m \`, if you want to develop script
- And for use ${playName} script, type \`dat play\` or just \`dat p\`

## Debug Play Script

For debugging play script, you must install \`source-map-support\` package by type \`dat npm -n source-map-support\`

## Install Node.js 12

### Ubuntu / Debian / Linux Mint
- sudo apt update
- sudo apt -y install curl dirmngr apt-transport-https lsb-release ca-certificates
- curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -
- sudo apt -y install nodejs

## Authors
${playName} was built by DAT ${VERSION}
            `.trim());
         }
         infoLog('make', `environment makes in '${this.path}' for '${playName}' play script`);
         return true;
      } catch (e) {
         errorLog('err4', e);
         return false;
      }

   }
   /********************************** */
   async copyDatFiles() {
      // =>init vars
      const datPath = PATH.join(this.path, 'node_modules', '@dat');
      // =>create dat types dir
      FS.mkdirSync(datPath, { recursive: true });
      // =>create 'package.json' file
      FS.writeFileSync(PATH.join(datPath, 'package.json'), JSON.stringify({
         name: '@dat',
         version: VERSION,
         "dependencies": {},
         files: [
            "lib",
            "common",
         ],
      }, null, 2));
      // =>create dat dir
      let dirs = ['lib', 'common'];
      for (const dir of dirs) {
         // =>create types dir
         FS.mkdirSync(PATH.join(datPath, dir), { recursive: true });
         // =>create package.json file
         FS.writeFileSync(PATH.join(Global.dirPath, dir, 'package.json'), JSON.stringify({ name: dir, dependencies: {} }, null, 2));
         // =>get list of all type files
         let types = await getFilesList(PATH.join(Global.dirPath, dir));
         for (const f of types) {
            FS.copyFileSync(f.path, PATH.join(datPath, dir, PATH.basename(f.path)));
         }
      }
   }
   /********************************** */

}