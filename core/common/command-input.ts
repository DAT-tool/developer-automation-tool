import * as READLINE from 'readline';
import { ProgressBarOptions } from './interfaces';
import { getCursorPosition, messageLog } from './public';


export namespace CommandInput {
   /**************************************** */
   export async function selectOptions(text: string, options: string[] | { text: string, value?: string }[], defaultOption?: string): Promise<string> {
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
   export async function askPassword(text: string): Promise<string> {
      if (text[text.length - 1] !== ' ') {
         text += ' ';
      }
      return new Promise(res => {
         let prompt = ansiColors('? ', 'green') + ansiColors(text, 'normal', true);
         process.stdout.write(prompt);
         var stdin = process.stdin;
         stdin.resume();
         stdin.setRawMode(true);
         stdin.resume();
         stdin.setEncoding('utf8');

         var password = '';
         stdin.on('data', (ch) => {
            let ch1 = ch.toString('utf8');
            switch (ch1) {
               case "\n":
               case "\r":
               case "\u0004":
                  // They've finished typing their password
                  process.stdout.write('\n');
                  stdin.setRawMode(false);
                  stdin.pause();
                  res(password);
                  break;
               case "\u0003":
                  // Ctrl-C
                  process.stdout.write('\n');
                  stdin.setRawMode(false);
                  stdin.pause();
                  res('');
                  break;
               case String.fromCharCode(127):// BACKSPACE
                  if (password.length === 0) return;
                  password = password.slice(0, password.length - 1);
                  process.stdout.clearLine(0);
                  process.stdout.cursorTo(0);
                  process.stdout.write(prompt);
                  process.stdout.write(password.split('').map(() => '*').join(''));
                  break;
               default:
                  // More password characters
                  process.stdout.write('*');
                  password += ch;
                  break;
            }
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
   /**************************************** */
   export class CreateProgressBar {
      protected title: string;
      protected options: ProgressBarOptions;
      protected defaultOptions: ProgressBarOptions = { mode: 'basic', size: 100, label: '%' };
      protected cursor = 0;
      protected value = 0;
      protected bgChar = '-';
      protected forChar = '=';
      protected yPosition = 0;
      /**************************** */
      constructor(title: string, options?: ProgressBarOptions) {
         this.title = title;
         if (options) {
            this.options = options;
         }
         // =>fill options with defaults
         for (const key of Object.keys(this.defaultOptions)) {
            if (this.options[key] === undefined) this.options[key] = this.defaultOptions[key];
         }
         // =>check mode
         switch (options.mode) {
            case 'graphics1':
               this.bgChar = '░';
               this.forChar = '█';
               break;
            default:
               this.bgChar = '-';
               this.forChar = '=';
               break;
         }
         process.stdout.write('\n');

         this.update(0);
      }
      /**************************** */
      async update(value: number, payload = {}) {
         // =>check value by size
         if (value < 0) value = 0;
         else if (value > this.options.size) value = this.options.size;
         this.value = value;
         await this.render(payload);
      }
      /**************************** */
      async increment(payload = {}) {
         await this.update(this.value + 1, payload);
      }
      /**************************** */
      async stop() {
         // =>reset cursor on line
         // READLINE.cursorTo(process.stdout, 0, this.yPosition);
         process.stdout.write('\r\n');
      }
      /**************************** */
      async render(payload = {}) {
         // =>init vars
         let terminalWidth = process.stdout.columns;
         let maxProgressWidth = terminalWidth;
         let valueRatio = this.value;
         this.cursor = 0;
         let showValue = '';
         let payloadsString = '';
         // =>get current position
         let position = await getCursorPosition(false);
         // =>check by last y position
         if (position.row < this.yPosition) {
            position.row = this.yPosition;
         }
         this.yPosition = position.row;
         // =>set cursor on line
         READLINE.cursorTo(process.stdout, 0, position.row);
         // =>disable cursor
         process.stdout.write("\x1B[?25l");
         // =>write title
         process.stdout.write(ansiColors(this.title + ' ', 'blue', true));
         this.cursor = this.title.length + 1;
         process.stdout.write("[");
         maxProgressWidth -= this.cursor + 2;
         this.cursor++;
         // =>if show value
         if (this.options.showValue) {
            showValue = ` ${this.value}${this.options.label}`;
            maxProgressWidth -= showValue.length;
         }
         // =>if has payload
         let payloadKeys = Object.keys(payload);
         for (let i = 0; i < payloadKeys.length; i++) {
            if (i > 0 || (i === 0 && this.options.showValue)) {
               payloadsString += ' |';
            }
            payloadsString += ` ${payloadKeys[i]}: ${payload[payloadKeys[i]]}`;
         }
         maxProgressWidth -= payloadsString.length;
         // =>calculate value ratio
         valueRatio = (valueRatio * maxProgressWidth) / this.options.size;
         // =>fill with bg
         for (let i = 0; i < maxProgressWidth; i++) {
            process.stdout.write(this.bgChar);
         }
         process.stdout.write("]");
         // =>print value
         process.stdout.write(showValue);
         // =>print payloads
         process.stdout.write(payloadsString);

         // =>set new cursor
         READLINE.cursorTo(process.stdout, this.cursor, position.row);
         // =>progress value
         for (let i = 0; i < Math.ceil(valueRatio); i++) {
            process.stdout.write(this.forChar);
         }
      }
   }

}