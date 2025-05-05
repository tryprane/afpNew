



import { autoPortal } from "./actions/autoPortal.ts";
export const adminPlugin = {
    name: "admin",
    description: "admin Plugin for Eliza",
    actions: [autoPortal],
    evaluators: [],
    providers: [],
};


export default adminPlugin;
