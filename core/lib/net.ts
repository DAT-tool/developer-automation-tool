import * as fs from "fs";
import * as path from "path";
import * as http from "http";
import * as https from "https";

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


export function scanPorts() {
   //https://github.com/alanhoff/node-portastic/blob/master/lib/portastic.js
}