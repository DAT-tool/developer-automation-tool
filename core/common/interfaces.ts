
import { baseArgvName, CommandType } from "./types";
import * as FS from 'fs';



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
   ignore_compile?: boolean;
   started_at?: number;
   socket_port?: number;
}

export interface EventData {
   event: 'play' | 'cwd';
   name?: string; // used for 'play' event
   argvs?: string[]; // used for 'play' event
}

export interface EventResponse {
   status: number;
   data?: any;
}