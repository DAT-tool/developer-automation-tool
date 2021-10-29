import { CommandInput } from "../common/command-input";


export async function select(text: string, options: string[] | { text: string, value?: string }[], defaultOption?: string): Promise<string> {
   return CommandInput.selectOptions(text, options, defaultOption);
}
/****************************************** */
export async function input(text: string, defaultValue?: string): Promise<string> {
   return CommandInput.question(text, defaultValue);
}
/****************************************** */
