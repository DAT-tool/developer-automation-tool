import * as fs from "fs";
import * as path from "path";
import * as http from "http";
import * as https from "https";
import { RequestOptions, RequestResponse } from "../common/interfaces";

export async function downloadFile(url: string, destPath: string): Promise<true | Error> {
   return new Promise((res) => {
      const file = fs.createWriteStream(destPath);
      // =>detect http, https
      let httpInstance: any = http;
      if (url.startsWith('https:')) {
         httpInstance = https;
      }
      // =>try to get file
      var request = httpInstance.get(url, async (response: http.IncomingMessage) => {
         // =>if redirection
         if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            let redirectResponse = await downloadFile(response.headers.location, destPath);
            res(redirectResponse);
            return;
         }
         // =>if error
         else if (response.statusCode >= 400) {
            res(new Error('Response status was ' + response.statusCode));
            return;
         }
         response.pipe(file);
         response.on('error', (err) => {
            fs.unlinkSync(destPath); // Delete the file async. (But we don't check the result)
            res(err);
         });
         file.on('finish', () => {
            file.close();
            res(true);
         });
      }).on('error', (err) => { // Handle errors
         fs.unlinkSync(destPath);
         res(err);
      });
   });
}
/****************************************** */
export function simpleServer(port: number, request: (req: http.IncomingMessage, res: http.ServerResponse) => void) {
   // =>run a simple webserver
   let app = http.createServer((req, res) => {
      // Set a response type of plain text for the response
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      // Send back a response and end the connection
      request(req, res);
   });

   // Start the server on port 
   app.listen(port, '0.0.0.0');
}

export async function request<T = any>(options: RequestOptions): Promise<RequestResponse<T>> {
   const parseUrl = new URL(options.url);
   // =>set defaults
   if (!options.method) options.method = 'GET';
   if (!options.contentType) options.contentType = 'application/json';
   if (!options.headers) options.headers = {};
   let headers = {
      'Content-Type': options.contentType,
      ...options.headers,
   };
   if (!options.body) options.body = {};
   if (options.method === 'GET') {
      for (const key of Object.keys(options.body)) {
         parseUrl.searchParams.append(key, options.body[key]);
      }
   }
   let requestOptions: http.RequestOptions = {
      host: parseUrl.hostname,
      port: parseUrl.port,
      protocol: parseUrl.protocol,
      path: parseUrl.pathname,
      method: options.method,
      headers,
   };
   // console.log('options:', options, post_data);
   return new Promise((resolve) => {
      var requestInstance = http.request(requestOptions, (res) => {
         let data = '';
         let response: RequestResponse = {
            status: res.statusCode,
            success: false,
         };
         if (res.statusCode < 300) {
            response.success = true;
         }

         // console.log('Status Code:', res.statusCode);

         res.on('data', (chunk) => {
            data += chunk;
         });

         res.on('end', () => {
            // console.log('Body: ', data);
            response.data = data;
            if (options.contentType === 'application/json') {
               try {
                  response.data = JSON.parse(response.data);
               } catch (e) { }
            }
            resolve(response);
         });

      }).on("error", (err) => {
         console.log("Error: ", err.message);
      });
      // post the data
      if (options.contentType === 'application/json') {
         requestInstance.write(JSON.stringify(options.body));
      } else if (options.method !== 'GET') {
         requestInstance.write(options.body);
      }
      requestInstance.end();
   });
}


export function scanPorts() {
   //https://github.com/alanhoff/node-portastic/blob/master/lib/portastic.js
}