import * as crypto from 'crypto';
import * as zlib from 'zlib';
import * as fs from 'fs';
import * as Path from 'path';
import * as os from 'os';
import { Transform } from 'stream';
import { errorLog, generateString } from '../common/public';

class AppendInitVect extends Transform {
   initVect;
   appended;
   constructor(initVect, opts?) {
      super(opts);
      this.initVect = initVect;
      this.appended = false;
   }

   _transform(chunk, encoding, cb) {
      if (!this.appended) {
         this.push(this.initVect);
         this.appended = true;
      }
      this.push(chunk);
      cb();
   }
}




export class SourceCodeEncryption {
   password: string;
   /********************************** */
   constructor(password?: string) {
      if (password) {
         this.setPassword(password);
      }
   }
   /********************************** */
   async encryptFile(path: string, destPath?: string): Promise<string> {
      return new Promise((res) => {
         try {
            // =>if dest path not set
            if (!destPath) {
               destPath = Path.join(os.tmpdir(), generateString(10));
            }
            // Generate a secure, pseudo random initialization vector.
            const initVect = crypto.randomBytes(16);
            // Generate a cipher key from the password.
            const CIPHER_KEY = this.getCipherKey(this.password);
            const readStream = fs.createReadStream(path);
            const gzip = zlib.createGzip();
            const cipher = crypto.createCipheriv('aes256', CIPHER_KEY, initVect);
            const appendInitVect = new AppendInitVect(initVect);
            // Create a write stream with a different file extension.
            const writeStream = fs.createWriteStream(destPath);

            readStream
               .pipe(gzip)
               .pipe(cipher)
               .pipe(appendInitVect)
               .pipe(writeStream);
            readStream.on('end', () => {
               // console.log('finished')
               res(destPath);
            });
         } catch (e) {
            errorLog('err659', e);
            res(undefined);
         }
      });
   }
   /********************************** */
   async checkFileEncrypted(path: string): Promise<boolean> {
      const readIv = fs.readFileSync(path);

      return /[\x00-\x1F]/.test(readIv.toString().substr(0, 20));

      return false;
   }
   /********************************** */
   setPassword(password: string) {
      this.password = password;
   }
   /********************************** */
   async decryptFile(path: string, destPath?: string): Promise<string> {
      return new Promise((res) => {
         try {
            // =>if dest path not set
            if (!destPath) {
               destPath = Path.join(os.tmpdir(), generateString(10));
            }
            // First, get the initialization vector from the file.
            const readInitVect = fs.createReadStream(path, { end: 15 });

            let initVect;
            readInitVect.on('data', (chunk) => {
               initVect = chunk;
            });
            // Once we’ve got the initialization vector, we can decrypt the file.
            readInitVect.on('close', () => {
               const cipherKey = this.getCipherKey(this.password);
               const readStream = fs.createReadStream(path, { start: 16 });
               const decipher = crypto.createDecipheriv('aes256', cipherKey, initVect);
               const unzip = zlib.createUnzip();
               const writeStream = fs.createWriteStream(destPath, { encoding: 'utf-8' });
               readStream
                  .pipe(decipher)
                  .pipe(unzip)
                  .pipe(writeStream);
               readStream.on('end', () => {
                  // console.log('finished')
                  res(destPath);
               });
            });
         } catch (e) {
            errorLog('err658', e);
            res(undefined);
         }
      });

   }
   /********************************** */
   getCipherKey(password: string) {
      return crypto.createHash('sha256').update(password).digest();
   }
}