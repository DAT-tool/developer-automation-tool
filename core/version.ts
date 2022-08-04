
export const VERSION = "0.5.7";
export const VERSION_NAME = 'BETA';

const BETA_VERSION_STARTED = '2021.10.28';


export const MIN_NODE_VERSION = "12";
export const SUPPORTED_PLATFORMS = ["linux"];
export const AUTHORS = ["madkne"];


export function VERSION_NUMBER(version?: string) {
   if (!version) {
      version = VERSION;
   }
   let section = version.split('.');
   if (section.length === 1) section.push('0');
   if (section.length === 2) section.push('0');
   let versionNumber = 0;
   let unit = 1000;
   for (const sec of section) {
      // console.log('version:', version, sec, unit);
      versionNumber += Number(sec) * unit;
      unit /= 10;
      if (unit === 10) unit = 1;
   }
   // console.log('final version:', version);
   return versionNumber;
}