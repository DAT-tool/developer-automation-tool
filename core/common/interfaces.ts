
import { baseArgvName, CommandType } from "./types";
import * as FS from 'fs';
import { SSHConnection } from "../runtime/ssh";



export interface CommandModel<A extends string = string> {
   name: CommandType;
   description: string;
   longDescription?: string; // md file name
   alias?: string;
   implement?: [filename: string, classname: string,];
   argvs: CommandArgvModel<A>[];
}

export interface CommandArgvModel<A extends string = string> {
   name: A | baseArgvName;
   description: string;
   force?: boolean;
   alias?: string;
   type?: 'boolean' | 'number' | 'string';
   defaultValue?: any;
}

export interface CommandRunArgv<A extends string = string> {
   key: A | baseArgvName;
   value?: any;
   isAlias?: boolean;
}


export interface PlayModel {
   // hosts: string[];
   // tasks: TaskModel[];

   compiled_at?: string;
   version?: number;
}

export interface FileInfo {
   path: string;
   type: 'dir' | 'file';
   stat: FS.Stats;
}

export interface BuildMetaData {
   filename?: string;
   last_modified?: number;
   compile_started_at?: number;
   compile_ms?: number;
   complied_at?: number;
   ready_ms?: number; //time to ready to run play script
   ready_at?: number;
   ignore_compile?: boolean;
   started_at?: number;
   socket_port?: number;
}

export interface EventData {
   event: 'play' | 'cwd' | 'settings' | 'ssh' | 'template';
   name?: string; // used for 'play', 'settings', 'template' event
   argvs?: string[]; // used for 'play', 'settings' events
   options?: {}; // used for 'ssh', 'options' event
}

export interface EventResponse {
   status: number;
   data?: any;
}
export interface PlayScriptSettings {
   show_statistics?: boolean;
   encrypt_source_code?: string;
   require_version?: string;
   require_version_mode?: 'exact' | 'exactOrBigger' | 'exactOrSmaller';
}

export interface ExecResponse {
   stdout?: string;
   stderr?: string;
   code: number;
   result?: any;
}

export interface SSHConfig {
   host?: string;
   port?: number;
   username?: string;
   password?: string;
   privateKey?: string;
}

export interface SSHHostConfig extends SSHConfig {
   connection?: SSHConnection;
}


export interface TemplateOptions {
   noCache?: boolean;
   templatePath?: string
   autoescape?: boolean;
   data?: object;
}

export interface SymbolicLinkInfo {
   target: string;
   path: string;
   type: 'file' | 'dir';
}

export interface ProgressBarOptions {
   mode: 'basic' | 'graphics1';
   showValue?: boolean;
   size: number;
   label: string;
}

export interface EnvFileOptions {
   path?: string;
   override?: boolean;
   debug?: boolean;
}

export interface RequestOptions {
   url: string;
   /**
    * @default GET
    */
   method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
   headers?: object;
   /**
    * @default application/json
    */
   contentType?: 'application/json' | string;
   body?: object;
   /**
    * @default 30000
    */
   timeout?: number;
}

export interface RequestResponse<T = any> {
   data?: T;
   error?: Error;
   status: number;
   success: boolean;
}