import * as READLINE from 'readline';
import { messageLog } from './public';


export namespace CommandInput {
   /**************************************** */
   export function selectOptions(text: string, options: string[] | { text: string, value?: string }[], defaultOption?: string): Promise<string> {
      return new Promise((res) => {
         // =>init vars
         const selector = '*';
         let selectedIndex = 0;
         const input = process.stdin;
         const output = process.stdout;
         let optionsText: string[] = [];
         let optionsValue: string[] = [];
         const createOptionMenu = () => {
            const optionLength = options.length
            if (isFirstTimeShowMenu) {
               isFirstTimeShowMenu = false
            }
            else {
               output.write(ansiEraseLines(optionLength))
            }
            for (let i = 0; i < optionLength; i++) {
               const optionColored = ansiColors(selector + ' ' + optionsText[i], 'green')
               const selectedOption = i === selectedIndex
                  ? optionColored
                  : '  ' + optionsText[i]
               const ending = i !== optionLength - 1 ? '\n' : '' //4
               output.write(selectedOption + ending) //5
            }
         };
         let isFirstTimeShowMenu = true;
         // =>get options text, value
         if (typeof options[0] === 'object') {
            for (const opt of options as any[]) {
               optionsText.push(opt['text']);
               optionsValue.push(opt['value'] ? opt['value'] : opt['text']);
            }
         } else {
            optionsText = optionsValue = options as string[];
         }
         // =>set default selected index by selected option
         if (defaultOption && optionsValue.includes(defaultOption)) {
            selectedIndex = optionsValue.indexOf(defaultOption);
         }
         // =>show question text
         console.log(ansiColors('? ', 'green') + ansiColors(text, 'normal', true));
         READLINE.emitKeypressEvents(input);
         input.setRawMode(true);
         input.resume();
         if (selectedIndex >= 0) {
            createOptionMenu();
         }
         input.on('keypress', (_, key) => {
            if (key) {
               const optionLength = options.length - 1;
               // console.log('key:', key.name);
               if (key.name === 'down' && selectedIndex < optionLength) {
                  selectedIndex += 1;
                  createOptionMenu();
               }
               else if (key.name === 'up' && selectedIndex > 0) {
                  selectedIndex -= 1;
                  createOptionMenu();
               }
               else if (key.name === 'return') {
                  input.setRawMode(false)
                  input.pause();
                  console.log('');
                  res(optionsValue[selectedIndex]);
               }
               else if (key.name === 'escape' || (key.name === 'c' && key.ctrl)) {
                  input.setRawMode(false)
                  input.pause();
               }
            }
         });

      });
   }
   /**************************************** */
   export async function question(text: string, def?: string): Promise<string> {
      if (text[text.length - 1] !== ' ') {
         text += ' ';
      }
      const rl = READLINE.createInterface({
         input: process.stdin,
         output: process.stdout
      });
      return new Promise(res => {
         rl.question(ansiColors('? ', 'green') + ansiColors(text, 'normal', true), function (input) {
            rl.close();
            if (def && (!input || input.trim().length < 1)) input = def;
            res(input);
         });
      });
   }
   /**************************************** */
   function ansiEraseLines(count: number) {
      //adapted from sindresorhus ansi-escape module
      const ESC = '\u001B['
      const eraseLine = ESC + '2K';
      const cursorUp = (count = 1) => ESC + count + 'A'
      const cursorLeft = ESC + 'G'

      let clear = '';

      for (let i = 0; i < count; i++) {
         clear += eraseLine + (i < count - 1 ? cursorUp() : '');
      }

      if (count) {
         clear += cursorLeft;
      }

      return clear;

   }
   /**************************************** */
   export function ansiColors(text: string, color: 'green' | 'blue' | 'yellow' | 'red' | 'normal' = 'normal', bold = false) {
      const colors = {
         'green': 32,
         'blue': 34,
         'yellow': 33,
         'red': 31,
      }
      let coloredText = text;
      if (color != 'normal' && colors[color]) {
         coloredText = `\x1b[${colors[color]}m${bold ? '\x1b[1m' : ''}${text}\x1b[0m`;
      }
      else if (!color || color === 'normal') {
         coloredText = `${bold ? '\x1b[1m' : ''}${text}\x1b[0m`;
      }


      return coloredText;
   }
   /**************************************** */
   export function hr(char = '\u2500') {
      // console.log('Terminal size: ' + process.stdout.columns + 'x' + process.stdout.rows);
      process.stdout.write('\r');

      for (let i = 0; i < process.stdout.columns; i++) {
         process.stdout.write(char);
      }
   }
   /**************************************** */
   export function statusLine(text: string, status: 'success' | 'error' | 'loading' | 'info' = 'info', end = '\n') {
      if (status === 'loading') {
         messageLog(`☐ ${text}`, 'warning', end);
      } else if (status === 'success') {
         messageLog(`\u2713 ${text}`, 'success', end);
      } else if (status === 'error') {
         //\u274c
         messageLog(`✗ ${text}`, 'error', end);
      } else {
         messageLog(`\u2609 ${text}`, 'info', end);
      }
   }

}