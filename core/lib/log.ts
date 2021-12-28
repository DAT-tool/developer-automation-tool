import { platform } from 'os';
import { CommandInput } from '../common/command-input';
import { messageLog } from '../common/public';
import { DebugMode } from './os';

export function info(text: string, end = '\n') {
   messageLog(text, 'info', end);
}
/**************************************** */
export function error(text: string | object, end = '\n') {
   messageLog(String(text), 'error', end);
   // =>if debug mode enabled
   if (DebugMode && typeof text === 'object') {
      console.error(text);
   }
}
/**************************************** */
export function debug(text: string, type: 'info' | 'error' | 'warning' | 'normal' = 'error', end = '\n') {
   // =>check for debug mode, enabled
   if (!DebugMode) return;
   messageLog(text, type, end);
}
/**************************************** */
export function success(text: string, end = '\n') {
   messageLog(text, 'success', end);
}
/**************************************** */
export function warning(text: string, end = '\n') {
   messageLog(text, 'warning', end);
}
/**************************************** */
export function log(text: string, end = '\n') {
   messageLog(text, 'normal', end);
}
/**************************************** */
export function successStatus(text, end = '\n') {
   CommandInput.statusLine(text, 'success', end);
}
/**************************************** */
export function errorStatus(text, end = '\n') {
   CommandInput.statusLine(text, 'error', end);
}
/**************************************** */
export function infoStatus(text, end = '\n') {
   CommandInput.statusLine(text, 'info', end);
}
/**************************************** */
/**
 * clear all screen
 */
export function clear() {
   if (platform() === 'win32') {
      process.stdout.write('\x1Bc');
   } else if (platform() === 'linux') {
      process.stdout.write('\x1Bc');
   } else {
      var lines = process.stdout.getWindowSize()[1];
      for (var i = 0; i < lines; i++) {
         process.stdout.write('\r\n');
      }
      process.stdout.cursorTo(0, 0);
   }
}
/**************************************** */
export class ProgressBar extends CommandInput.CreateProgressBar {

}