import * as nunjucks from 'nunjucks';
import { TemplateOptions } from '../common/interfaces';

export class TemplateParser {

   loader: nunjucks.FileSystemLoader;
   options: TemplateOptions;
   instance: nunjucks.Environment;
   /************************************ */
   constructor(options: TemplateOptions) {
      this.options = options;
      // =>init loader for fs
      if (options.templatePath) {
         this.loader = new nunjucks.FileSystemLoader(options.templatePath, { noCache: options.noCache });
      }
   }
   /************************************ */
   async initEnv() {
      // =>create env instance
      this.instance = new nunjucks.Environment(this.loader, {
         autoescape: this.options.autoescape,
         noCache: this.options.noCache,
         // debug: this.templateInfo.debug,
         // auto_reload: config('DEBUG_MODE'),
         // cache: PATH.join(config('STORAGE_PATH'), 'cache', 'templates'),
         // strict_variables: true,
      });

   }
   /************************************ */
   async renderString(src: string) {
      return await nunjucks.renderString(src, this.options.data);
   }
   /************************************ */
   async render(name: string) {
      return await this.instance.render(name, this.options.data);
   }
}