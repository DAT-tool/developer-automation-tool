import { CommandClass } from "../common/command";
import { BuildMetaData, CommandModel, PlayModel } from "../common/interfaces";
import * as path from 'path';
import * as fs from 'fs';
import { Global } from "../global";
import { PlayScript } from "../runtime/play";
import { MakeCommand } from "./make";
import { log } from "../lib/log";
import { warningLog } from "../common/public";
import { select } from "../lib/input";

export function init() {
   return { class: DiscoveryCommand, alias: 'd' };
}

export type argvName = 'name' | 'password' | 'depth' | 'filename';

/******************************************* */
export class DiscoveryCommand extends CommandClass<argvName> {
   allowUnknownArgvs = true;
   /********************************** */
   define(): CommandModel<argvName> {
      return {
         name: 'discovery',
         description: "discover play scripts in sub directories",
         alias: 'd',
         argvs: [
            {
               name: 'depth',
               alias: '#d',
               description: "sub directories depth to scan play scripts (default: 1)",
               type: 'number',
               defaultValue: 1,
            },
            {
               name: 'name',
               alias: '#n',
               description: "play script directory name to discover and play",
            },
            {
               name: 'filename',
               alias: '#fn',
               description: "play script name to detect (default: 'play.ts')",
               defaultValue: 'play.ts',
            },
            {
               name: 'password',
               alias: '#p',
               description: "password of encrypted play file",
            },
         ],
      };
   }
   /********************************** */
   async run() {
      let currentPath = Global.pwd;
      let maxDepth = this.getArgv<number>('depth');
      let depth = 0;
      let specificDatProject = this.getArgv<string>('name');
      // console.log('params:', { specificDatProject, maxDepth })
      // =>scan on sub directories
      let filename = this.getArgv<string>('filename');
      let paths = [currentPath];
      let datProjects: { name: string; path: string }[] = [];
      while (true) {
         // console.log('first:', { maxDepth, depth, paths, datProjects })
         let pathsLen = paths.length;
         let index = 0;
         while (index <= pathsLen) {
            index++;
            if (paths.length === 0) break;
            let pt = paths.shift();
            // =>check if dat project
            if (fs.existsSync(path.join(pt, filename))) {
               datProjects.push({
                  name: path.basename(pt),
                  path: path.join(pt),
               });
            }
            try {
               let dirs = fs.readdirSync(pt, { withFileTypes: true });
               // =>check depth limit
               if (depth >= maxDepth) break;
               for (const dir of dirs) {
                  // =>if directory
                  if (dir.isDirectory()) {
                     paths.push(path.join(pt, dir.name));

                  }
               }
            } catch (e) { }

         }
         depth++;
         // console.log('last:', { maxDepth, depth, paths, datProjects })

         if (depth >= maxDepth && paths.length === 0) break;
      }
      // =>check projects found
      if (datProjects.length === 0) {
         warningLog('discovery', 'not found any dat projects (you can increase depth to find more!)');
         return true;
      }
      let projectPath: string;
      // =>if exist specific project
      if (specificDatProject && specificDatProject.length > 0) {
         projectPath = datProjects.find(i => i.name === specificDatProject)?.path;
         if (!projectPath) {
            warningLog('discovery', `not found any dat project with name '${specificDatProject}' (you can increase depth to find more!)`);

         }
      }
      // =>show all projects
      if (!projectPath) {
         projectPath = await select('select DAT project to play', datProjects.map(i => {
            return {
               text: i.name,
               value: i.path,
            };
         }));
      }
      if (!projectPath) return false;
      // console.log(path, filename)
      // =>check exist 'node_modules'
      if (!fs.existsSync(path.join(projectPath, 'node_modules'))) {
         // =>init make class
         let makeClass = new MakeCommand();
         if (!await makeClass.preRun()) {
            return false;
         }
      }
      // =>create instance of play class
      let playClass = new PlayScript(projectPath, filename);
      let password = this.getArgv('password');

      // =>run play class
      let res = await playClass.play(process.argv.slice(3) ?? [], password);
      if (res === 0) return true;
      return false;
   }
   /********************************** */
}