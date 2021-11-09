import { EventResponse } from "../common/interfaces";
import { ExitCode } from "../common/types";
import { error } from "./log";
import { connectDatSocket } from "./os";


export async function showStatistics() {
   let res = await connectDatSocket({ event: 'settings', name: 'show_statistics' });
   if (res.data) res.data = String(res.data);

   return res;
}
/****************************************** */
export async function encryptSourceCode(password: string): Promise<EventResponse> {
   if (!password || password.length < 3) {
      error('Minimum password length for encrypt source code is 3 characters!');
      return { status: ExitCode.INVALID_INPUT };
   }
   let res = await connectDatSocket({ event: 'settings', name: 'encrypt_source_code', argvs: [password] });
   if (res.data) res.data = String(res.data);

   return res;
}
