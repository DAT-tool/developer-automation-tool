import { connectDatSocket } from "./os";


export async function showStatistics() {
   return await connectDatSocket({ event: 'settings', name: 'show_statistics' });
}
