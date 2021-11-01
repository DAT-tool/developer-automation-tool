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