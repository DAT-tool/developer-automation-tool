import { CommandInput } from "../common/command-input";


export async function select(text: string, options: string[] | { text: string, value?: string }[], defaultOption?: string): Promise<string> {
   return await CommandInput.selectOptions(text, options, defaultOption);
}
/****************************************** */
export async function input(text: string, defaultValue?: string): Promise<string> {
   return await CommandInput.question(text, defaultValue);
}
/****************************************** */
export async function password(text: string): Promise<string> {
   return await CommandInput.askPassword(text);
}
/****************************************** */
export async function boolean(text: string, defaultValue?: boolean): Promise<boolean> {
   let options = '[Y/n]';
   if (!defaultValue) {
      options = '[y/N]';
   }
   options = CommandInput.ansiColors(options, 'yellow');
   let res = await CommandInput.question(`${text} ${options}`, String(defaultValue));
   // console.log('res:', res);
   let result = false;
   if (res.toLowerCase() === 'y' || res === 'true') result = true;
   else if (res === undefined || res.trim() === '') {
      result = defaultValue;
   }
   return result;
}