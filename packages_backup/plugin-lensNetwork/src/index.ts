
import { loginSamarthPortal } from "./actions/fetchName.ts";
import { initializeSamarthPortal } from "./providers/portal.ts";
import { portalManager } from "./providers/newPortalManager.ts";
import { feeHistory } from "./actions/feeHistory.ts";
import {generatePdf} from './actions/pdfTest.ts'

import { autoPortal } from "./actions/autoPortal.ts";
export const lensPlugin = {
    name: "Lens",
    description: "Lens Plugin for Eliza",
    actions: [autoPortal],
    evaluators: [],
    providers: [],
};

export { portalManager };
export default lensPlugin;
