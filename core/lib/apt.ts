import { execSync } from "child_process";
import * as http from 'http';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { generateString } from "../common/public";
import { exec } from "./os";
import { error } from "./log";

export async function install(packages: string[] | string, showOutput = false) {
   if (typeof packages === 'string') {
      packages = [packages];
   }
   let output = await exec(`sudo apt-get install -y ${packages.join(' ')}`);
   if (showOutput) {
      console.log(output.stdout);
      if (output.stderr && output.stderr.length > 0) error(output.stderr);
   }
   return output;
}
/****************************************** */
/**
 * get gpg key file from url and add to apt-key
 * @param url 
 */
export async function gnupg(url: string) {
   return new Promise((res) => {
      let gpgPath = path.join(os.tmpdir(), generateString(4) + '.key')
      const file = fs.createWriteStream(gpgPath);
      // =>download gpg key file form url
      http.get(url, (response) => {
         response.pipe(file);
         res(execSync(`sudo apt-key add ${gpgPath}`));
      });
   })
}
/****************************************** */
export async function addRepository(url: string, options?: string[]) {
   let result = execSync(`sudo add-apt-repository -y "deb [arch=${os.arch()}] ${url} ${options ? options.join(' ') : ''}"`).toString();
   return result;
}