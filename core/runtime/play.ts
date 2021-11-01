import { EventData } from './../common/interfaces';
import { BuildMetaData } from "../common/interfaces";
import * as FS from 'fs';
import * as PATH from 'path';
import * as TS from 'typescript';
import * as NET from 'net';
import { checkPortInUse, errorLog, messageLog, randomInt } from "../common/public";
import { Global } from '../global';


export class PlayScript {
   path: string;
   buildPath: string;
   tmpPlayPath: string;
   buildMetaPath: string;
   playPath: string;
   buildMeta: BuildMetaData = {};

   filename = 'play.ts';
   pwd: string;

   eventSocket: NET.Server;
   socketPort: number;
   socketClients: NET.Socket[] = [];
   /**************************************** */
   constructor(pwd: string, filename?: string) {
      this.pwd = pwd;
      if (filename) this.filename = filename;
   }
   /**************************************** */
   async beforeRun() {
      this.path = PATH.join(this.pwd, this.filename);
      this.buildPath = PATH.join(this.pwd, '.dat', 'build');
      this.playPath = PATH.join(this.buildPath, PATH.basename(this.path).split('.')[0] + '.js');
      this.tmpPlayPath = this.playPath + '.run';
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
      // =>set random open  socket port
      while (true) {
         this.socketPort = randomInt(10000, 65500);
         // =>check port is not listening
         if (!await checkPortInUse(this.socketPort)) break;
      }
      // =>set port on build meta data
      this.buildMeta.socket_port = this.socketPort;
   }
   /**************************************** */
   async play(argvs: string[]) {
      await this.beforeRun();
      try {
         // =>if not ignore compile
         if (!this.buildMeta.ignore_compile) {
            this.buildMeta.compile_started_at = new Date().getTime();
            // =>compile play file
            await this.compileTsFile();
            this.buildMeta.complied_at = new Date().getTime();
            this.buildMeta.compile_ms = new Date().getTime() - this.buildMeta.compile_started_at;
         }
         // =>inject 'initialize' function to script
         FS.writeFileSync(this.tmpPlayPath, FS.readFileSync(this.playPath) + `
function initialize() {
var dat_os = require('@dat/lib/os');
dat_os.SocketPort = ${this.socketPort};
}
exports.initialize = initialize;
      `);
      } catch (e) {
         errorLog('err439', e);
         return 2;
      }
      try {
         // =>import play script js file
         const playFile = await import(this.tmpPlayPath);
         // =>init socket server for events
         this.initEventSocket();
         this.buildMeta.ready_ms = new Date().getTime() - this.buildMeta.started_at;
         // =>save build meta data
         FS.writeFileSync(this.buildMetaPath, JSON.stringify(this.buildMeta, null, 2));
         // =>run init function
         playFile['initialize']();
         // =>set argvs, if not
         if (!argvs) argvs = [];
         // =>run main function
         let res = await playFile['main'](argvs);
         if (res === undefined) res = 0;
         // console.log('gghgg')
         // =>close event socket
         this.closeEventSocket();
         return Number(res);
      } catch (e) {
         // =>close event socket
         this.closeEventSocket();
         errorLog('err443', e);
         return 1;
      }

   }
   /**************************************** */
   async compileTsFile() {
      try {
         // console.log(Global.dirPath, Global.pwd)
         const options: TS.CompilerOptions = {
            target: TS.ScriptTarget.ES5,
            module: TS.ModuleKind.CommonJS,
            declaration: false,
            sourceMap: false,
            removeComments: true,
            importHelpers: false,
            strict: false,
            types: ['node'],
            sourceRoot: this.pwd,
            outDir: this.buildPath,
            resolveJsonModule: true,
            disableSizeLimit: true,
            moduleResolution: TS.ModuleResolutionKind.NodeJs,
            // rootDirs: [Global.dirPath],
            // baseUrl: Global.pwd,
            // rootDir: Global.pwd,
            // paths: {
            //    '*': [Global.dirPath + '/*'],
            //    "dat/*": [Global.dirPath + '/*'],
            // },
         };
         //=>clear old js file
         if (FS.existsSync(this.playPath)) {
            FS.unlinkSync(this.playPath);
         }
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
   /**************************************** */
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
   /**************************************** */
   initEventSocket() {
      // =>run socket server
      this.eventSocket = NET.createServer().listen(this.socketPort);
      // => listen on socket client connected
      this.eventSocket.on('connection', (socket) => {
         this.socketClients.push(socket);
         // console.log('connected ', socket.localPort)
         // =>listen on get data form socket client
         socket.on('data', async (data) => {
            // console.log('[debug] host', data.toString());
            // =>parse data
            try {
               let eventData = JSON.parse(data.toString()) as EventData;
               // =>if 'play' event
               if (eventData.event === 'play') {
                  let response = await this.runPlayEvent(eventData.name, eventData.argvs);
                  socket.write(String(response));
               }
               // =>if 'cwd' event
               else if (eventData.event === 'cwd') {
                  socket.write(Global.pwd);
               }
            } catch (e) {
               errorLog('err451', e);
            }
         });
      });
      // =>when error on socket
      this.eventSocket.on('error', (e) => {
         messageLog(e.message, 'error');
         this.eventSocket.close();
         this.eventSocket = undefined;
      });
   }
   /**************************************** */
   closeEventSocket() {
      // destroy all clients (this will emit the 'close' event above)
      for (var i in this.socketClients) {
         this.socketClients[i].destroy();
      }
      if (!this.eventSocket) return;
      this.eventSocket.close(() => {
         this.eventSocket.removeAllListeners();
         // console.log('server closed.');
         this.eventSocket.unref();
         this.eventSocket = undefined;
      });
   }
   /**************************************** */
   async runPlayEvent(name: string, argvs: string[]) {
      let parentPath: string;
      let filename = 'play.ts';
      // =>try to find play folder with name
      if (FS.existsSync(PATH.join(this.pwd, name))) {
         parentPath = PATH.join(this.pwd, name);
      }
      else if (FS.existsSync(PATH.join(PATH.dirname(this.pwd), name))) {
         parentPath = PATH.join(PATH.dirname(this.pwd), name);
      }
      // =>if not find
      else {
         console.log(this.pwd, name)
         return 10;
      }
      // =>create instance of play class
      let playClass = new PlayScript(parentPath, filename);
      // =>run play class
      let res = await playClass.play(argvs);
      return res;
   }
}