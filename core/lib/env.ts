import * as fs from 'fs';
import { cwd } from './os';
import * as path from 'path';
import { error } from './log';


export async function save(key: string, value: any) {
   // =>read .env file , overwrite it
   let env = await loadAll();
   // =>overwrite new value for key
   env[key] = value;
   // =>save env file
   fs.writeFileSync(path.join(await cwd(), '.dat', '.env'), JSON.stringify(env, null, 2));

   return true;
}
/************************************* */
export async function load<T = string>(key: string, def?: T): Promise<T> {
   // =>load all .env file
   let env = await loadAll();
   if (env[key] === undefined) return def;
   return env[key] as T;
}
/************************************* */
export async function has(key: string): Promise<boolean> {
   // =>load all .env file
   let env = await loadAll();
   if (env[key] === undefined || env[key] === null) return false;
   return true;
}
/************************************* */
/**
 * load all env variables
 * @returns {}
 */
export async function loadAll(): Promise<object> {
   try {
      // =.create .dat dir, if not
      fs.mkdirSync(path.join(await cwd(), '.dat'), { recursive: true });
      // =>check .env file exists
      if (!fs.existsSync(await getEnvPath())) return {};
      // =>read .env file
      return JSON.parse(fs.readFileSync(await getEnvPath()).toString());
   } catch (e) {
      error('err4562', e);
      return {};
   }
}
/************************************* */
export async function getEnvPath() {
   return path.join(await cwd(), '.dat', '.env');
}
/************************************* */