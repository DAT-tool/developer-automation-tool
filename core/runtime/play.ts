import { SourceCodeEncryption } from './encryption';
import { EventData, PlayScriptSettings, SSHConfig, ExecResponse, TemplateOptions } from './../common/interfaces';
import { BuildMetaData } from "../common/interfaces";
import * as FS from 'fs';
import * as PATH from 'path';
import * as TS from 'typescript';
import * as NET from 'net';
import * as SSH from 'ssh2';
import { checkPortInUse, convertMSToHumanly, errorLog, generateString, messageLog, randomInt } from "../common/public";
import { Global } from '../global';
import { ExitCode } from '../common/types';
import { SSHConnection } from './ssh';
import { TemplateParser } from './template';
import { CommandInput } from '../common/command-input';
import { VERSION, VERSION_NUMBER } from '../version';
import { error } from '../lib/log';

export class PlayScript {
   static defaultTypeScriptCompilerOptions: TS.CompilerOptions = {
      // target: TS.ScriptTarget.ES2016,
      // module: TS.ModuleKind.CommonJS,
      target: "ES6" as any,
      module: "CommonJS" as any,
      declaration: false,
      removeComments: true,
      importHelpers: false,
      strict: false,
      types: ['node'],
      resolveJsonModule: true,
      disableSizeLimit: true,
      experimentalDecorators: true,
      // moduleResolution: TS.ModuleResolutionKind.NodeJs,
      moduleResolution: "Node" as any,
      inlineSourceMap: true,
      emitDecoratorMetadata: true,
      checkJs: true,
   };
   path: string;
   buildPath: string;
   tmpPlayPath: string;
   buildMetaPath: string;
   playPath: string;
   buildMeta: BuildMetaData = {};
   sourceEncrypted = false;
   filenameWithoutExt: string;

   filename = 'play.ts';
   pwd: string;
   password: string;

   eventSocket: NET.Server;
   socketPort: number;
   socketClients: NET.Socket[] = [];
   settings: PlayScriptSettings = {
   };
   /**************************************** */
   constructor(pwd: string, filename?: string) {
      this.pwd = pwd;
      if (filename) this.filename = filename;
   }
   /**************************************** */
   async beforeRun() {
      try {
         let filenameSplit = this.filename.split('.');
         filenameSplit.pop();
         this.filenameWithoutExt = filenameSplit.join('.');
         this.path = PATH.join(this.pwd, this.filename);
         this.buildPath = PATH.join(this.pwd, '.dat', 'build');
         this.playPath = PATH.join(this.buildPath, this.filenameWithoutExt + '.js');
         this.tmpPlayPath = this.playPath + '.run';
         this.buildMetaPath = PATH.join(this.buildPath, '.build');
         // =>check for .ts file
         if (PATH.extname(this.path) !== '.ts') {
            errorLog('err670', `'${this.filename}' file must has .ts extension (${PATH.extname(this.path)} is invalid)`);
            return false;
         }
         this.buildMeta.started_at = new Date().getTime();
         // =>create build dir
         FS.mkdirSync(this.buildPath, { recursive: true });
         // =>check play script encrypted 
         if (!this.password && await (new SourceCodeEncryption().checkFileEncrypted(this.path))) {
            this.sourceEncrypted = true;
            this.password = await CommandInput.askPassword('Enter Password');
         }
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

         return true;
      } catch (e) {
         errorLog('err884', e);
         return false;
      }
   }
   /**************************************** */
   async play(argvs: string[], password?: string) {
      if (password) {
         this.password = password;
         this.sourceEncrypted = true;
      }
      // =>init vars before run
      if (!await this.beforeRun()) {
         return ExitCode.INVALID_INPUT;
      }
      // =>set argvs, if not
      if (!argvs) argvs = [];
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
async function initialize() {
   var dat_os = require('@dat/lib/os');
   // var dat_log = require('@dat/lib/log');
   dat_os.SocketPort = ${this.socketPort};
   dat_os.DebugMode = ${Global.isDebug ? 'true' : 'false'};
   dat_os.ScriptArgvs = ${JSON.stringify(argvs)};
   try{
      require('source-map-support').install({
          environment: 'node',
          hookRequire: true,
      });
   } catch(e){}
}
exports.initialize = initialize;
      `);
      } catch (e) {
         errorLog('err439', e);
         return ExitCode.FAILED_COMPILE;
      }
      try {
         // =>import play script js file
         const playFile = await import(this.tmpPlayPath);
         // =>init socket server for events
         this.initEventSocket();
         this.buildMeta.ready_at = new Date().getTime();
         this.buildMeta.ready_ms = this.buildMeta.ready_at - this.buildMeta.started_at;
         // =>save build meta data
         FS.writeFileSync(this.buildMetaPath, JSON.stringify(this.buildMeta, null, 2));
         // =>run init function
         playFile['initialize']();

         // =>run main function
         let res = await playFile['main'](argvs);
         if (res === undefined) res = 0;
         // console.log('gghgg')
         // =>close event socket
         this.closeEventSocket();
         // =>show play statistics, if allowed
         this.showPlayStatistics();
         return Number(res);
      } catch (e) {
         // =>close event socket
         this.closeEventSocket();
         errorLog('err443', e);
         return ExitCode.FAILED_IMPORT;
      }

   }
   /**************************************** */
   async checkRequiredVersion() {
      // =>get current version number
      let currentVersionNumber = VERSION_NUMBER();
      // =>get required version number
      let requiredVersionNumber = VERSION_NUMBER(this.settings.require_version);
      // console.log(currentVersionNumber, requiredVersionNumber, this.settings.require_version_mode, requiredVersionNumber >= currentVersionNumber)
      // =>decide by mode
      switch (this.settings.require_version_mode) {
         case 'exact':
            return requiredVersionNumber === currentVersionNumber;
         case 'exactOrBigger':
            return currentVersionNumber >= requiredVersionNumber;
         case 'exactOrSmaller':
            return currentVersionNumber <= requiredVersionNumber;
         default:
            return false;
      }
   }
   /**************************************** */
   showPlayStatistics() {
      // console.log('stat', this.settings.show_statistics)
      if (!this.settings.show_statistics) return;
      let data = {
         'Play Script': PATH.basename(PATH.dirname(this.path)),
      };
      // =>add last modified
      data['Last Modified'] = new Date(this.buildMeta.last_modified).toLocaleTimeString();
      // =>add started at
      data['Started At'] = new Date(this.buildMeta.started_at).toLocaleTimeString();
      // =>add compiled at, if exist
      if (this.buildMeta.complied_at) {
         let time = convertMSToHumanly(this.buildMeta.compile_ms);
         data['Compiled At'] = new Date(this.buildMeta.complied_at).toLocaleTimeString() + ` (${time.time} ${time.unit})`;
      }
      // =>add ready at
      let time1 = convertMSToHumanly(this.buildMeta.ready_ms);
      data['Ready At'] = new Date(this.buildMeta.ready_at).toLocaleTimeString() + ` (${time1.time} ${time1.unit})`;
      // =>add finished at
      let time2 = convertMSToHumanly(new Date().getTime() - this.buildMeta.started_at);
      data['Finished At'] = new Date().toLocaleTimeString() + ` (${time2.time} ${time2.unit})`;
      // =>Show table
      console.table(data);
   }
   /**************************************** */
   async compileTsFile() {
      try {
         // console.log(Global.dirPath, Global.pwd)
         const options: TS.CompilerOptions = {
            target: TS.ScriptTarget.ES2016,
            module: TS.ModuleKind.CommonJS,
            declaration: false,
            removeComments: true,
            importHelpers: false,
            strict: false,
            types: ['node'],
            sourceRoot: this.pwd,
            outDir: this.buildPath,
            resolveJsonModule: true,
            disableSizeLimit: true,
            experimentalDecorators: true,
            moduleResolution: TS.ModuleResolutionKind.NodeJs,
            inlineSourceMap: true,
            emitDecoratorMetadata: true,
            checkJs: true,
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
         // =>if play ts file, encrypted
         let srcEnc = new SourceCodeEncryption();
         if (await srcEnc.checkFileEncrypted(this.path)) {
            srcEnc.setPassword(this.password);
            let tmpPath = await srcEnc.decryptFile(this.path);
            if (!tmpPath) return false;
            // =>replace decrypted content with original encrypted file
            FS.unlinkSync(this.path);
            FS.writeFileSync(this.path, FS.readFileSync(tmpPath));
            // console.log(this.path, tmpPath, FS.readFileSync(tmpPath).toString())
         }
         const file = { fileName: PATH.basename(this.path), content: FS.readFileSync(this.path).toString(), sourceFile: null, compiled: false };
         // =>create ts compiler instance 
         const compilerHost = TS.createCompilerHost(options);

         const originalGetSourceFile = compilerHost.getSourceFile;
         compilerHost.getSourceFile = (fileName) => {
            // console.log(fileName, file.fileName);
            let isMainSource = false;
            // =>check for compile main source
            if (!file.compiled && fileName === file.fileName) {
               isMainSource = true;
            }
            //  else if (!file.compiled && this.sourceEncrypted) {
            //    isMainSource = true;
            // }
            // =>if main source
            if (isMainSource) {
               file.compiled = true;
               file['sourceFile'] = file['sourceFile'] || TS.createSourceFile(fileName, file.content, TS.ScriptTarget.ES2015, true);
               // =>encrypt play source file, if need
               if (this.sourceEncrypted) {
                  new SourceCodeEncryption(this.password).encryptFile(this.path, PATH.join(this.buildPath, generateString(10))).then(destPath => {
                     // console.log(destPath)
                     FS.unlinkSync(this.path);
                     FS.renameSync(destPath, this.path);
                  });
               }

               return file['sourceFile'];
            }
            // =>if other sources
            return originalGetSourceFile.call(compilerHost, fileName);
         };
         // =>compile ts file
         const program = TS.createProgram([file.fileName], options, compilerHost);
         program.emit();
         // console.log('source:', file['sourceFile'])
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
      // console.log('connect server', this.socketPort)
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
                  socket.write(this.pwd);
               }
               // =>if 'settings' event
               else if (eventData.event === 'settings') {
                  let response = await this.runSettingsEvent(eventData.name as any, eventData.argvs);
                  socket.write(String(response));
               }
               // =>if 'template' event
               else if (eventData.event === 'template') {
                  let response = await this.runTemplateEvent(eventData.name as any, eventData.options);
                  socket.write(String(response));
               }
               // =>if 'ssh' event
               else if (eventData.event === 'ssh') {
                  let response = await this.runSSHEvent(eventData.name as any, eventData.options as any);
                  socket.write(JSON.stringify(response));
               }
            } catch (e) {
               errorLog('err451', e);
            }
         });
      });
      // =>when error on socket
      this.eventSocket.on('error', (e) => {
         errorLog('err898', e);
         this.eventSocket.close();
         this.eventSocket = undefined;
      });
   }
   /**************************************** */
   closeEventSocket() {
      // console.log('close socket')
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
         // console.log(this.pwd, name)
         return 10;
      }
      // =>create instance of play class
      let playClass = new PlayScript(parentPath, filename);
      // =>run play class
      let res = await playClass.play(argvs);
      return res;
   }
   /**************************************** */
   async runSettingsEvent(name: keyof PlayScriptSettings, argvs: string[]) {
      // =>if show statistics
      if (name === 'show_statistics') {
         this.settings.show_statistics = true;
         return ExitCode.SUCCESS;
      }
      // =>if encrypt source code
      else if (name === 'encrypt_source_code') {
         this.settings.encrypt_source_code = argvs[0];
         // =>if want to encrypt play file
         new SourceCodeEncryption(this.settings.encrypt_source_code).encryptFile(this.path, PATH.join(this.pwd, this.filenameWithoutExt + '.enc.ts'));
         return ExitCode.SUCCESS;
      }
      // =>if check dat version
      else if (name === 'require_version') {
         this.settings.require_version = argvs[0];
         this.settings.require_version_mode = argvs[1] as any;
         // =>check dat version
         if (!await this.checkRequiredVersion()) {
            error(`invalid DAT version! (required: v${this.settings.require_version}, current: v${VERSION})`);
            return ExitCode.INVALID_VERSION;
         }
         return ExitCode.SUCCESS;
      }
      //TODO:
      return ExitCode.NOT_FOUND_KEY;
   }
   /**************************************** */
   async runTemplateEvent(name: 'render_string' | 'render_file', options: TemplateOptions) {
      // =>init template parser
      let templateParser = new TemplateParser(options);
      // =>if render string
      if (name === 'render_string') {
         return await templateParser.renderString(options['src']);
      }
      // =>if render file
      else if (name === 'render_file') {
         await templateParser.initEnv();
         return await templateParser.render(options['filename']);
      }
      //TODO:
      return ExitCode.NOT_FOUND_KEY;
   }
   /**************************************** */
   async runSSHEvent(name: 'scp', options: {
      config: SSHConfig;
      mode?: 'putFile' | 'putDirectory' | 'getFile' | 'getDirectory';
      remotePath?: string;
      localPath?: string;
   }): Promise<ExecResponse> {

      let stdout = '';
      let stderr = '';
      let code = ExitCode.SUCCESS;
      // =>try to ssh connect
      const conn = await SSHConnection.connectSSH(options.config);
      // =>if failed
      if (typeof conn === 'string') {
         return { code: ExitCode.FAILED_SSH, stderr: conn };
      }
      // =>create new ssh connection instance
      let connection = new SSHConnection(options.config, conn);
      await connection.init();
      // =>if scp command
      if (name === 'scp') {
         let sftp = await connection.sftpSession();
         if (sftp[0]) {
            return { code: ExitCode.FAILED_SFTP, stderr: String(sftp[0]) };
         }
         // =>scp file or dir
         let result = await connection.scp(sftp[1], options.mode, options.remotePath, options.localPath);
         // =>parse results
         stderr = result.stderr;
         code = result.code;
      }
      //TODO:
      else {
         code = ExitCode.NOT_FOUND_KEY;
      }
      // =>disconnect ssh
      await connection.close();

      return { code, stderr, stdout };
   }
}