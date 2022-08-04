import * as fs from 'fs';
import { cwd } from './os';
import * as path from 'path';
import { error } from './log';
import { EnvFileOptions } from '../common/interfaces';


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
/************************************* */
/************************************* */
export function parseEnvFile(src: string) {
   const obj = {}

   // Convert buffer to string
   let lines = src.toString()

   // Convert line breaks to same format
   lines = lines.replace(/\r\n?/mg, '\n')
   const LINE = /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/mg
   let match
   while ((match = LINE.exec(lines)) != null) {
      const key = match[1]

      // Default undefined or null to empty string
      let value = (match[2] || '')

      // Remove whitespace
      value = value.trim()

      // Check if double quoted
      const maybeQuote = value[0]

      // Remove surrounding quotes
      value = value.replace(/^(['"`])([\s\S]*)\1$/mg, '$2')

      // Expand newlines if double quoted
      if (maybeQuote === '"') {
         value = value.replace(/\\n/g, '\n')
         value = value.replace(/\\r/g, '\r')
      }

      // Add to object
      obj[key] = value
   }

   return obj
}
/**
 * load .env file
 */
export async function loadEnvFile(options?: EnvFileOptions) {
   let dotenvPath = path.join(await cwd(), '.env');
   if (options && options.path) {
      dotenvPath = options.path;
   }
   const debug = Boolean(options && options.debug);
   const override = Boolean(options && options.override);
   try {
      // Specifying an encoding returns a string instead of a buffer
      const parsed = parseEnvFile(fs.readFileSync(dotenvPath, { encoding: 'utf-8' }).toString());

      Object.keys(parsed).forEach(function (key) {
         if (!Object.prototype.hasOwnProperty.call(process.env, key)) {
            process.env[key] = parsed[key]
         } else {
            if (override === true) {
               process.env[key] = parsed[key]
            }

            if (debug) {
               if (override === true) {
                  console.log(`"${key}" is already defined in \`process.env\` and WAS overwritten`)
               } else {
                  console.log(`"${key}" is already defined in \`process.env\` and was NOT overwritten`)
               }
            }
         }
      })

      return { parsed }
   } catch (e) {
      if (debug) {
         console.log(`Failed to load ${dotenvPath} ${e.message}`)
      }

      return { error: e }
   }
}