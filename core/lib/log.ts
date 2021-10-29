import { CommandInput } from '../common/command-input';
import { messageLog } from '../common/public';

export function info(text: string, end = '\n') {
   messageLog(text, 'info', end);
}
/**************************************** */
export function error(text: string, end = '\n') {
   messageLog(text, 'error', end);
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