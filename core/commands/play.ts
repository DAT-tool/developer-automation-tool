import { CommandClass } from "../common/command";
import { BuildMetaData, CommandModel, PlayModel } from "../common/interfaces";
import * as PATH from 'path';
import { deleteDirectory, errorLog, infoLog, messageLog } from "../common/public";
import { copyDirectory } from '../common/public';
import * as FS from 'fs';
import { Global } from "../global";
import * as TS from 'typescript';

export function init() {
   return PlayCommand;
}

export type argvName = 'filename';

/******************************************* */
export class PlayCommand extends CommandClass<argvName> {
   path: string;
   buildPath: string;
   buildMetaPath: string;
   playPath: string;
   buildMeta: BuildMetaData = {};
   /********************************** */
   define(): CommandModel<argvName> {
      return {
         name: 'play',
         description: "play a script file (default play 'play.ts' file)",
         alias: 'p',
         argvs: [
            {
               name: 'filename',
               alias: 'f',
               description: "filename of play script file",
            },
         ],
      };
   }
   /********************************** */
   async beforeRun() {
      let filename = 'play.ts';
      if (this.hasArgv('filename')) {
         filename = this.getArgv('filename');
      } else {
      }
      this.path = PATH.join(Global.pwd, filename);
      this.buildPath = PATH.join(Global.pwd, '.dat', 'build');
      this.playPath = PATH.join(this.buildPath, PATH.basename(this.path).split('.')[0] + '.js');
      this.buildMetaPath = PATH.join(this.buildPath, '.build');

      this.buildMeta.started_at = new Date().getTime();
      // =>create build dir
      FS.mkdirSync(this.buildPath, { recursive: true });
      // =>get stat of ts file
      let stat = FS.statSync(this.path);
      // =>get last modified of ts file
      this.buildMeta.last_modified = stat.mtimeMs;
      this.buildMeta.filename = PATH.basename(this.path);
      // =>check must be ignore compile
      this.buildMeta.ignore_compile = await this.checkIgnoreCompile();

   }
   /********************************** */
   async run() {
      await this.beforeRun();

      // =>if not ignore compile
      if (!this.buildMeta.ignore_compile) {
         this.buildMeta.compile_started_at = new Date().getTime();
         // =>compile play file
         await this.compileTsFile();
         this.buildMeta.complied_at = new Date().getTime();
         this.buildMeta.compile_ms = new Date().getTime() - this.buildMeta.compile_started_at;
      }
      // =>import play file
      // console.log('input:', this.input);
      const playFile = await import(this.playPath);
      this.buildMeta.ready_ms = new Date().getTime() - this.buildMeta.started_at;
      // =>save build meta data
      FS.writeFileSync(this.buildMetaPath, JSON.stringify(this.buildMeta, null, 2));
      // =>run main function
      await playFile['main']();
      // console.log('gghgg')

      return true;
   }
   /********************************** */
   async compileTsFile() {
      try {
         const options: TS.CompilerOptions = {
            target: TS.ScriptTarget.ES5,
            module: TS.ModuleKind.CommonJS,
            declaration: false,
            sourceMap: false,
            removeComments: true,
            importHelpers: false,
            strict: false,
            types: ['node'],
            sourceRoot: Global.pwd,
            outDir: this.buildPath,
         };


         const file = { fileName: PATH.basename(this.path), content: FS.readFileSync(this.path).toString() };
         // =>create ts compiler instance 
         const compilerHost = TS.createCompilerHost(options);

         const originalGetSourceFile = compilerHost.getSourceFile;
         compilerHost.getSourceFile = (fileName) => {
            // console.log(fileName);
            if (fileName === file.fileName) {
               file['sourceFile'] = file['sourceFile'] || TS.createSourceFile(fileName, file.content, TS.ScriptTarget.ES2015, true);
               return file['sourceFile'];
            }
            else return originalGetSourceFile.call(compilerHost, fileName);
         };
         // =>compile ts file
         const program = TS.createProgram([file.fileName], options, compilerHost);
         program.emit();
         // messageLog('compiled TS File', 'info');
         return true;
      } catch (e) {
         errorLog('err4', e);
         return false;
      }
   }
   /********************************** */
   async checkIgnoreCompile() {
      // =>check exist .build file
      if (!FS.existsSync(this.buildMetaPath)) return false;
      // =>check exist play file
      if (!FS.existsSync(this.playPath)) return false;
      // =>read build meta file
      let buildData: BuildMetaData = JSON.parse(FS.readFileSync(this.buildMetaPath).toString());
      // =>get file stat
      let stat = FS.statSync(this.path);
      // =>check last modified 
      if (stat.mtimeMs <= buildData.last_modified) {
         return true;
      }
      return false;
   }
}