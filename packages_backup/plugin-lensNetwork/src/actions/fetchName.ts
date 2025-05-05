// src/actions/samarthPortal.ts
import {
    IAgentRuntime,
    Memory,
    State,
    HandlerCallback,
    elizaLogger,
    Action,
    ActionExample,
    composeContext,
    generateObject,
    ModelClass,
    generateObjectDeprecated,
} from "@elizaos/core";
import fs from 'fs/promises';
import { initializeSamarthPortal, SamarthPortalService } from "../providers/portal";
import { portalManager } from "../providers/portalManager";
import { testActions } from "viem";

// Define an interface for the expected credential structure
interface SamarthCredentials {
    username?: string; // Enrollment number starting with GGV
    password?: string;
}

async function getStudentProfile() {
    const portal = portalManager.getPortal();
    if (!portal) {
        throw new Error("Portal not initialized");
    }
    return await portal.getStudentProfile();
}

async function getExam() {
    const portal = portalManager.getPortal();
    if (!portal) {
        throw new Error("Portal not initialized");
    }
    return await portal.examHistory();
}

export const loginSamarthPortal: Action = {
    name: "LOGIN_SAMARTH_PORTAL",
    description: "Log in to the Samarth Portal to access student information, grades, fee receipts, and course registration",
    similes: [
        "LOGIN_SAMARTH_PORTAL",
        "SIGN_IN_SAMARTH",
        "SAMARTH_PORTAL_LOGIN",
        "ACCESS_SAMARTH_PORTAL",
        "ENTER_SAMARTH_SYSTEM",
        "LOGIN_TO_SAMARTH",
        "LOGIN_TO_GGV_SAMARTH",
        "LOG_IN_SAMARTH",
        "AUTHENTICATE_SAMARTH",
        "SIGN_INTO_SAMARTH_PORTAL",
        "ENTER_SAMARTH_CREDENTIALS",
        "ACCESS_GGV_PORTAL",
        "LOGIN_GGV",
        "SIGN_IN_GGV_PORTAL",
    ],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        elizaLogger.info("Validating Samarth Portal login action");
        // Keep validation simple for now, focus on handler extraction
        return true; 
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.info("Handling Samarth Portal login action");

        let currentState: State;
        if (!state) {
            currentState = (await runtime.composeState(message)) as State;
        } else {
            currentState = await runtime.updateRecentMessageState(state);
        }

        let responseText = "";
        let data = null;
        let username = options.username as string || '';
        let password = options.password as string || '';

        try {
            if (!portalManager.isPortalReady()) {
                if (!username || !password) {
                    if (callback) {
                        callback({
                            text: "To access the Samarth Portal, I need your enrollment number (starting with GGV) and password. Please provide them in the format: username: GGV... password: your_password",
                        });
                    }
                    return false;
                }

                const success = await portalManager.initializePortal(username, password);
                if (!success) {
                    if (callback) {
                        callback({
                            text: "Failed to initialize or login to the Samarth Portal. Please try again.",
                        });
                    }
                      return false;
                }
            }

            const portal = portalManager.getPortal();
            if (!portal) {
                throw new Error("Portal not initialized");
            }

            const messageText = message.content?.text?.toLowerCase() || '';
            responseText = "I've successfully logged into your Samarth Portal account.";
            
            if (messageText.includes('profile') || messageText.includes('information')) {
                data = await getExam();
                // const testing = 'Want The its PDF generation?'
                // if (data) {
                //     responseText += `\n\nStudent Profile Information:
                //     Name: ${data.fullname || 'Not available'}
                //     Date of Birth: ${data.dateofbirth || 'Not available'}
                //     Category: ${data.category || 'Not available'}
                //     Email: ${data.applicantsemail || 'Not available'}
                //     Mobile Number: ${data.mobilenumber || 'Not available'}
                //     Address Line 1: ${data.addressline1 || 'Not available'}
                //     Address Line 2: ${data.addressline2 || 'Not available'}
                //     State & Pin Code: ${data.statepincode || 'Not available'}`;

                    
                // } else {
                //     responseText += "\n\nCould not retrieve student profile information.";
                // }

                if (callback) {
                    callback({
                        text: responseText ,
                        content: { data: data }
                    });
                }
            } else if (messageText.includes('course history') || messageText.includes('selection history')) {
                responseText += "\n\nHere is the Course selection details";
                const paymentData = await portal.courseSelection();
                
                if (paymentData && paymentData.screenshotPath) {
                    responseText += "\n\nHere's a screenshot of your course selection history:";
                    
                    const imageBuffer = await fs.readFile(paymentData.screenshotPath);
                    const base64Image = imageBuffer.toString('base64');
                    const dataUrl = `data:image/png;base64,${base64Image}`;
                    
                    if (callback) {
                        callback({
                            text: responseText,
                            content: { data: paymentData.feeInfo },
                            attachments: [
                                {
                                    id: "payment-screenshot",
                                    url: dataUrl,
                                    title: "Payment History",
                                    source: "samarth-portal",
                                    description: "Screenshot of your payment history from Samarth Portal",
                                    text: "Payment history details from Samarth Portal",
                                    contentType: "image/png"
                                }
                            ]
                        });
                    }
                } else {
                    responseText += "\n\nI couldn't retrieve your payment information. Please make sure you're logged in and try again.";
                    
                    if (callback) {
                        callback({
                            text: responseText,
                            content: { data: paymentData }
                        });
                    }
                }
            } else if (messageText.includes('fee')) {
                const paymentData = await portal.fetchFeeDetails();
                
                if (paymentData && paymentData.screenshotPath) {
                    responseText += "\n\nHere's a screenshot of your payment history:";
                    
                    const imageBuffer = await fs.readFile(paymentData.screenshotPath);
                    const base64Image = imageBuffer.toString('base64');
                    const dataUrl = `data:image/png;base64,${base64Image}`;
                    
                    if (callback) {
                        callback({
                            text: responseText,
                            content: { data: paymentData },
                            attachments: [
                                {
                                    id: "payment-screenshot",
                                    url: dataUrl,
                                    title: "Payment History",
                                    source: "samarth-portal",
                                    description: "Screenshot of your payment history from Samarth Portal",
                                    text: "Payment history details from Samarth Portal",
                                    contentType: "image/png"
                                }
                            ]
                        });
                    }
                } else {
                    responseText += "\n\nI couldn't retrieve your payment information. Please make sure you're logged in and try again.";
                    
                    if (callback) {
                        callback({
                            text: responseText,
                            content: { data: paymentData }
                        });
                    }
                }
            } else if (messageText.includes('all payments') || messageText.includes('last payment')) {
                const paymentData = await portal.fetchMyPayments();
                
                if (paymentData && paymentData.screenshotPath) {
                    responseText += "\n\nHere's a screenshot of your payment history:";
                    
                    const imageBuffer = await fs.readFile(paymentData.screenshotPath);
                    const base64Image = imageBuffer.toString('base64');
                    const dataUrl = `data:image/png;base64,${base64Image}`;
                    
                    if (callback) {
                        callback({
                            text: responseText,
                            content: { data: paymentData },
                            attachments: [
                                {
                                    id: "payment-screenshot",
                                    url: dataUrl,
                                    title: "Payment History",
                                    source: "samarth-portal",
                                    description: "Screenshot of your payment history from Samarth Portal",
                                    text: "Payment history details from Samarth Portal",
                                    contentType: "image/png"
                                }
                            ]
                        });
                    }
                } else {
                    responseText += "\n\nI couldn't retrieve your payment information. Please make sure you're logged in and try again.";
                    
                    if (callback) {
                        callback({
                            text: responseText,
                            content: { data: paymentData }
                        });
                    }
                }
            } else {
                responseText += "\n\nWhat specific information would you like from the portal (e.g., profile, grades, fee receipt)?";
                
                if (callback) {
                    callback({
                        text: responseText,
                        content: { data: data }
                    });
                }
            }
            
            return true;

        } catch (error) {
            elizaLogger.error("Error handling Samarth Portal login action", error);
            if (callback) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                callback({
                    text: `I encountered an error while accessing the Samarth Portal: ${errorMessage}`,
                    content: { error: errorMessage }
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
                    text: "Can you check my grades on the Samarth portal?",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I can help you check your grades on the Samarth portal. To do this, I'll need your enrollment number and password. Please provide them in the format: username: your_enrollment_number, password: your_password",
                    action: "LOGIN_SAMARTH_PORTAL",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Login to my Samarth portal with username: GGV20210001 and password: Pass@1234",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll help you log in to the Samarth portal with the provided credentials...",
                    action: "LOGIN_SAMARTH_PORTAL",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Can you get my fee receipt from Samarth?",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I can help you access your fee receipts from the Samarth portal. For this, I'll need your enrollment number and password. Please provide them in the format: username: your_enrollment_number, password: your_password",
                    action: "LOGIN_SAMARTH_PORTAL",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Check course registration on Samarth portal with username GGV20210001 and password Pass@1234",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll check your course registration on the Samarth portal with the provided credentials...",
                    action: "LOGIN_SAMARTH_PORTAL",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;

