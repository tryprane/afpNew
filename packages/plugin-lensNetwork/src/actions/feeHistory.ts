import {
    type ActionExample,
    composeContext,
    elizaLogger,
    generateObjectDeprecated,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    ModelClass,
    type State,
    type Action,
} from "@elizaos/core";
import { truncate } from "fs";

import { portalManager } from "src/providers/newPortalManager";

interface FeeHistoryRequest {
    index: number;   // number from last response or 0 for all records
    isPDF: number;  // true if PDF was requested, false otherwise
  }
  



const feeHistoryTemplate = `Look at ONLY your LAST RESPONSE message in this conversation, where you confirmed to check fee history.
Based on ONLY that last message from user and last response from agent
, extract information about what fee history the user wants.

Extract:
1. If the user wants a specific fee history record by number
2. If the user wants a PDF version of a specific fee receipt

For example:
- If your last message was "I'll fetch your complete fee history..." -> return index: 0, isPDF: 1
- If your last message was "I'll check your 2nd fee receipt..." -> return index: 2, isPDF: 1
- If your last message was "I need the pdf of 4 number" -> return index: 4, isPDF: 0

\`\`\`json
{
    "index": <number from your LAST response or 0 for all records>,
    "isPDF": <0 if yes 1 if false>
}
\`\`\`

Last part of conversation:
{{recentMessages}}`;

export const feeHistory: Action = {
    name: "GET_FEE_HISTORY",
    similes: [
        "CHECK_FEE_HISTORY",
        "FEE_HISTORY",
        "VIEW_FEE_HISTORY",
        "SHOW_FEE_HISTORY",
        "FEE_RECEIPT",
        "GET_FEE_RECEIPT",
        "FEE_PAYMENT_HISTORY",
    ],
    description: "Get fee payment history or specific fee receipts from the Samarth portal",
    validate: async (runtime: IAgentRuntime) => {
       return true
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        // Initialize or update state
        let currentState = state;
        if (!currentState) {
            currentState = (await runtime.composeState(message)) as State;
        } else {
            currentState = await runtime.updateRecentMessageState(currentState);
        }

        const feeHistoryContext = composeContext({
            state: currentState,
            template: feeHistoryTemplate,
        });

        let test: boolean;
        const content = (await generateObjectDeprecated({
            runtime,
            context: feeHistoryContext,
            modelClass: ModelClass.SMALL,
        })) as FeeHistoryRequest;

        elizaLogger.error(content.isPDF) 


      

       

        try {

            if (!portalManager.isPortalReady()){

                if (callback) {
                    callback({
                        text: "To access the Samarth Portal, I need your enrollment number (starting with GGV) and password. Please provide them in the format: username: GGV... password: your_password",
                    });
                }
                return false;
            }

            if(callback){

                callback({
                    text: "I am just cheking the details"
                })
            }

            const portal = portalManager.getPortal();
            if (!portal) {
                throw new Error("Portal not initialized");
            }
            
            // Convert content values to proper types
           
            const index = Number(content.index);

            const iSPDF = Number(content.isPDF)
           
           

            const result = await portal.feeHistory(index , iSPDF);

          
            if (content.isPDF < 1 && content.index > 0) {
                const pdfResult = result as { feeHistory: string; pdfPath: string };
                if (callback) {
                    callback({
                        text: `I've downloaded the PDF for fee receipt #${content.index}.`,
                        content: { data: pdfResult.feeHistory },
                        attachments: [
                            {
                                id: `fee-receipt-${content.index}`,
                                url: pdfResult.pdfPath,
                                title: `Fee Receipt #${content.index}`,
                                source: "samarth-portal",
                                description: `PDF of your fee receipt #${content.index}`,
                                text: `Fee receipt details for #${content.index}`,
                                contentType: "application/pdf"
                            }
                        ]
                    });
                }
                return true;
            } else if (content.index > 0) {
                if (callback) {
                    callback({
                        text: `Here is your fee receipt #${content.index}:`,
                        content: { data: result },
                    });
                }
                return true;
            } else {
                if (callback) {
                    callback({
                        text: `Here is your complete fee payment history:`,
                        content: { data: result },
                    });
                }
            }
            return true;

            
        } catch (error) {
            elizaLogger.error("Error fetching fee history:", error);
            if (callback) {
                callback({
                    text: `There was an error fetching your fee history`,
                    content: { error },
                });
            }
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Show me my fee history",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll fetch your complete fee history from the Samarth portal.",
                    action: "GET_FEE_HISTORY",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Here is your complete fee payment history:\nSemester 1: ₹45,000 (Paid on: 12/08/2023)\nSemester 2: ₹45,000 (Paid on: 15/01/2024)\nSemester 3: ₹47,500 (Paid on: 10/08/2024)",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Can I see my 2nd semester fee receipt?",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll check your 2nd fee receipt from the Samarth portal.",
                    action: "GET_FEE_HISTORY",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Here is your fee receipt #2:\nReceipt No: GGV24-25/002\nDate: 15/01/2024\nAmount: ₹45,000\nPayment Mode: Online\nTransaction ID: SAMRTH789456123",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Download PDF of my first semester fee receipt",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll get the PDF for your 1st fee receipt from the Samarth portal.",
                    action: "GET_FEE_HISTORY",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I've downloaded the PDF for fee receipt #1. You can find it at: /path/to/pdfs/document_.pdf",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;