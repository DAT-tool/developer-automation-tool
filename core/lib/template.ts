import { TemplateOptions } from "../common/interfaces";
import { connectDatSocket } from "./os";
import * as path from 'path';
import * as fs from 'fs';
import { ExitCode } from "../common/types";

export async function renderFile(filename: string, options?: TemplateOptions) {
   options['filename'] = filename;
   // =>if template path not set
   if (!options.templatePath) {
      options.templatePath = path.dirname(path.resolve(filename));
   }
   // =>try to render file
   let res = await connectDatSocket({
      event: 'template',
      name: 'render_file',
      options,
   });
   res.data = String(res.data);
   return res;
}
/***************************************** */
export async function saveRenderFile(filename: string, destDirPath: string, options?: TemplateOptions) {
   // =>render file
   let res = await renderFile(filename, options);
   // console.log(res)
   // =>check for error
   if (!res || res.status !== ExitCode.SUCCESS) return res.status;
   // =>if not exist dest dir
   if (!fs.existsSync(destDirPath)) {
      fs.mkdirSync(destDirPath, { recursive: true });
   }
   // =>get dest filename
   let destFilename = path.basename(path.resolve(filename));
   let destPath = path.join(destDirPath, destFilename);
   // =>save file
   fs.writeFileSync(destPath, res.data);

   return destPath;
}
/***************************************** */
export async function renderString(src: string, options?: TemplateOptions) {
   options['src'] = src;
   let res = await connectDatSocket({
      event: 'template',
      name: 'render_string',
      options,
   });
   res.data = String(res.data);

   return res;
}