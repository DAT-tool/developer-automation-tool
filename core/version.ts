
export const VERSION = "0.1.8";
export const VERSION_NAME = 'BETA';

const BETA_VERSION_STARTED = '2021.09.20';


export const MIN_NODE_VERSION = "12";
export const SUPPORTED_PLATFORMS = ["linux"];
export const AUTHORS = ["madkne"];


export function VERSION_NUMBER() {
   let section = VERSION.split('.');
   let version = 0;
   let unit = 1000;
   for (const sec of section) {
      // console.log('version:', version, sec, unit);
      version += Number(sec) * unit;
      unit /= 10;
      if (unit === 10) unit = 1;
   }
   // console.log('final version:', version);
   return version;
}