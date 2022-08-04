import { NpmCommand } from './npm';
import { CommandClass } from "../common/command";
import { CommandModel, PlayModel } from "../common/interfaces";
import * as PATH from 'path';
import { deleteDirectory, errorLog, getFilesList, infoLog, outputStreamExec } from "../common/public";
import { copyDirectoryAsync } from '../common/public';
import * as FS from 'fs';
import { Global } from "../global";
import { VERSION } from "../version";
import { CommandInput } from '../common/command-input';
import { PlayScript } from '../runtime/play';

export function init() {
   return { class: MakeCommand, alias: 'm' };
}

export type argvName = 'name' | 'skip-gitignore' | 'skip-readme' | 'skip-npm';

/******************************************* */
export class MakeCommand extends CommandClass<argvName> {
   path: string;
   initWithPath = false;
   verbose = 1;
   playName: string;
   noSpecificPlayName = false;
   /********************************** */
   constructor(path?: string, verbose = 1) {
      super();
      if (path) {
         this.path = path;
         this.initWithPath = true;
      }
      if (verbose) {
         this.verbose = verbose;
      }
   }
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
            {
               name: 'skip-gitignore',
               alias: 's1',
               type: 'boolean',
               description: "skip to create .gitignore file",
            },
            {
               name: 'skip-readme',
               alias: 's2',
               type: 'boolean',
               description: "skip to create README.md file",
            },
            {
               name: 'skip-npm',
               alias: 's3',
               type: 'boolean',
               description: "skip to run 'npm install' to install node dependencies",
            },
         ],
      };
   }
   /********************************** */
   async run() {
      if (!this.initWithPath) {
         if (this.hasArgv('name')) {
            this.path = PATH.join(Global.pwd, this.getArgv('name'));
         } else {
            this.path = Global.pwd;
         }
      }
      // =>create dir with path
      FS.mkdirSync(this.path, { recursive: true });
      // =>get play name
      this.playName = this.getArgv('name');
      if (!this.playName) {
         this.playName = PATH.basename(this.path);
         this.noSpecificPlayName = true;
      }
      // =>check if exist 'play.ts'
      if (FS.existsSync(PATH.join(this.path, 'play.ts'))) {
         // =>just update env
         return await this.updateEnvironment();
      }
      // =>create new env
      return await this.makeEnvironment();

   }
   /********************************** */
   async makeEnvironment() {
      try {
         // =>check if not have specific play name
         if (this.noSpecificPlayName) {
            let newPlayName = await CommandInput.question(`Enter A Play Name: (default: '${this.playName}')`, this.playName);
            // =>if different play name
            if (newPlayName !== this.playName) {
               // =>update play name
               this.playName = newPlayName;
               // =>update path
               this.path = PATH.join(Global.pwd, this.playName);
               // =>create dir with path
               FS.mkdirSync(this.path, { recursive: true });
            }
         }
         // =>npm install and copy all files to @dat
         if (!await this.npmInstall() || !await this.copyDatFiles()) {
            if (this.verbose >= 1) {
               errorLog('make', `environment failed to make in '${this.path}' for '${this.playName}' play script`);
            }
            return false;
         }
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

         // =>create 'README.md' file, if not and allowed
         if (!this.hasArgv('skip-readme') && !FS.existsSync(PATH.join(this.path, 'README.md'))) {
            FS.writeFileSync(PATH.join(this.path, 'README.md'), `
# ${this.playName} Play Script

## Install & Use
- install node 12 or higher version
- install DAT by \`npm install -g dat-tool\`
- go to \`${this.playName}\` folder
- type \`npm install\` to install node types
- then, type \`dat m \`, if you want to develop script
- And for use ${this.playName} script, type \`dat play\` or just \`dat p\`

## Debug Play Script

For debugging play script, you must install \`source-map-support\` package by type \`dat npm -n source-map-support\`

## Install Node.js 12

### Ubuntu / Debian / Linux Mint
- sudo apt update
- sudo apt -y install curl dirmngr apt-transport-https lsb-release ca-certificates
- curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -
- sudo apt -y install nodejs

## Authors
${this.playName} was built by DAT ${VERSION}
            `.trim());
         }
         // =>create '.gitignore' file, if not and allowed
         if (!this.hasArgv('skip-gitignore') && !FS.existsSync(PATH.join(this.path, '.gitignore'))) {
            FS.writeFileSync(PATH.join(this.path, '.gitignore'), `
node_modules
package-lock.json
.dat
`);
         }
         if (this.verbose >= 1) {
            infoLog('make', `environment makes in '${this.path}' for '${this.playName}' play script`);
         }
         return true;
      } catch (e) {
         errorLog('err4', e);
         return false;
      }

   }
   /********************************** */
   async npmInstall() {
      // =>create 'package.json' file, if not
      if (!FS.existsSync(PATH.join(this.path, 'package.json'))) {
         FS.writeFileSync(PATH.join(this.path, 'package.json'), JSON.stringify({
            name: this.playName,
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
      // =>run npm command, if allowed
      if (!this.hasArgv('skip-npm')) {
         if (this.verbose >= 1) {
            infoLog('make', 'installing dependencies ...');
         }
         let code = await outputStreamExec(`npm install`, this.path);
         // console.log('code:', code)
         if (code !== 0) return false;
      }
      return true;
   }
   /********************************** */
   async copyDatFiles() {
      try {
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
         let dirs = ['lib', 'common', 'raw'];
         for (const dir of dirs) {
            // =>create types dir
            FS.mkdirSync(PATH.join(datPath, dir), { recursive: true });
            // =>create package.json file
            FS.writeFileSync(PATH.join(datPath, dir, 'package.json'), JSON.stringify({ name: dir, dependencies: {} }, null, 2));
            // =>get dir path
            let dirPath = PATH.join(Global.dirPath, dir);
            // =>get list of all type files
            let types = await getFilesList(dirPath);
            for (const f of types) {
               FS.writeFileSync(PATH.join(datPath, dir, PATH.basename(f.path)), FS.readFileSync(f.path));
               // FS.copyFileSync(f.path, PATH.join(datPath, dir, PATH.basename(f.path)));
            }
         }
         return true;
      } catch (e) {
         errorLog('err90', e);
         return false;
      }
   }
   /********************************** */
   async updateEnvironment() {
      try {
         // =>copy all files to @dat
         if (!await this.copyDatFiles()) {
            if (this.verbose >= 1) {
               errorLog('make', `environment failed to update in '${this.path}'`);
            }
            return false;
         }
         // =>create 'tsconfig.json' file
         if (!FS.existsSync(PATH.join(this.path, 'tsconfig.json'))) {
            FS.writeFileSync(PATH.join(this.path, 'tsconfig.json'), JSON.stringify({
               compilerOptions: PlayScript.defaultTypeScriptCompilerOptions,
            }, null, 2));
         }

         if (this.verbose >= 1) {
            infoLog('make', `environment updated in '${this.path}'`);
         }
         return true;
      } catch (e) {
         errorLog('err89', e);
         return false;
      }
   }
}