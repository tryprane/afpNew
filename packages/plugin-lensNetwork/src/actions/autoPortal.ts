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
import fs from "fs/promises";
import path from "path";
import { portalManager } from "src/providers/newPortalManager";

interface PortalRequest {
  index: number; // number from last response or 0 for all records
  isPDF: number; // 0 if PDF requested, 1 if not
  functionType: string; // type of function to call (fee, course, exam, admit)
}

const portalTemplate = `Look at ONLY your LAST RESPONSE message in this conversation, where you confirmed to check portal information.
Based on ONLY that last message from user and last response from agent, extract information about what the user wants.

Extract:
1. If the user wants a specific record by number
2. If the user wants a PDF version
3. What type of information they want (fee history, course history, exam history, or admit card)

fee - use this when any kind of fee details and fee history
course - use this only when last or history of course submission is needed
admit - when admit card is needed
exam - use this only when last or history of exam form submission is needed
coursesubmit - when user want to perform course submission or do not use this when any history needed
examsubmit - when user want to perform examination form or exam form submission or do not use this when any history needed

For example:
- If your last message was "I'll fetch your complete fee history..." -> return index: 0, isPDF: 1, functionType: "fee"
- If your last message was "I'll check your 2nd fee receipt..." -> return index: 2, isPDF: 1, functionType: "fee"
- If your last message was "I need the PDF of my 3rd fee receipt..." -> return index: 3, isPDF: 0, functionType: "fee"
- If your last message was "Show me my course history..." -> return index: 0, isPDF: 1, functionType: "course"
- If your last message was "I need my exam history..." -> return index: 0, isPDF: 1, functionType: "exam"
- If your last message was "I need my exam history..." -> return index: 0, isPDF: 1, functionType: "coursesubmit"
- If your last message was "I want to do exam submission..." -> return index: 0, isPDF: 1, functionType: "examsubmit"
- If your last message was "Download my admit card..." -> return index: 0, isPDF: 0, functionType: "admit"

\`\`\`json
{
    "index": <number from your LAST response or 0 for all records>,
    "isPDF": <0 if PDF requested, 1 if not>,
    "functionType": <"fee" | "course" | "exam" | "admit" | "coursesubmit" | "examsubmit">
}
\`\`\`

Last part of conversation:
{{recentMessages}}`;

export const autoPortal: Action = {
  name: "AUTO_PORTAL",
  similes: [
    "CHECK_PORTAL",
    "PORTAL_INFO",
    "VIEW_PORTAL",
    "SHOW_PORTAL",
    "FEE_HISTORY",
    "COURSE_HISTORY",
    "EXAM_HISTORY",
    "ADMIT_CARD",
    "GET_FEE_RECEIPT",
    "GET_COURSE_DETAILS",
    "GET_EXAM_DETAILS",
    "GET_ADMIT_CARD",
  ],
  description:
    "Get various information from the Samarth portal including fee history, course history, exam history, and admit cards",
  validate: async (runtime: IAgentRuntime) => {
    return true;
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<boolean> => {
    let currentState = state;
    if (!currentState) {
      currentState = (await runtime.composeState(message)) as State;
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
    }

    const portalContext = composeContext({
      state: currentState,
      template: portalTemplate,
    });

    const content = (await generateObjectDeprecated({
      runtime,
      context: portalContext,
      modelClass: ModelClass.LARGE,
    })) as PortalRequest;

    elizaLogger.error(content);

    try {
      if (!portalManager.isPortalReady()) {
        if (callback) {
          callback({
            text: "To access the Samarth Portal, I need your enrollment number (starting with GGV) and password. Please provide them in the format: username: GGV... password: your_password",
          });
        }
        return false;
      }

      const portal = portalManager.getPortal();
      if (!portal) {
        throw new Error("Portal not initialized");
      }

      const index = Number(content.index);
      const isPDF = Number(content.isPDF);

      let result;
      let functionName = "";

      switch (content.functionType.toLowerCase()) {
        case "fee":
          result = await portal.feeHistory(index, isPDF);
          functionName = "fee receipt";
          break;
        case "course":
          result = await portal.courseHistory(index, isPDF);
          functionName = "course details";
          break;
        case "exam":
          result = await portal.examHistory(index, isPDF);
          functionName = "exam details";
          break;
        case "admit":
          result = await portal.admidCard(index, isPDF);
          functionName = "admit card";
          break;
        case "examsubmit":
          {
            const responseText =
              "There is no any Exam Submission is Happening right now";

            // Path to the local image file
            const screenshotPath = path.join(process.cwd(), 'examSubmit.png');

            const imageBuffer = await fs.readFile(screenshotPath);
            const base64Image = imageBuffer.toString("base64");
            const dataUrl = `data:image/png;base64,${base64Image}`;

            if (callback) {
              callback({
                text: responseText,

                attachments: [
                  {
                    id: "exam-submission-screenshot",
                    url: dataUrl,
                    title: "Exam Submission Status",
                    source: "samarth-portal",
                    description:
                      "Screenshot showing no active exam submissions in Samarth Portal",
                    text: "Exam submission status from Samarth Portal",
                    contentType: "image/png",
                  },
                ],
              });
            }
          }
          return true;
          break;
        case "coursesubmit":
          {
            const responseText =
              "There is no any Course Submission is Happening right now";

             // Path to the local image file
             const screenshotPath = path.join(process.cwd(), 'courseSubmit.png');

             const imageBuffer = await fs.readFile(screenshotPath);

            
            const base64Image = imageBuffer.toString("base64");
            const dataUrl = `data:image/png;base64,${base64Image}`;

            if (callback) {
              callback({
                text: responseText,

                attachments: [
                  {
                    id: "course-submission-screenshot",
                    url: dataUrl,
                    title: "Course Submission Status",
                    source: "samarth-portal",
                    description:
                      "Screenshot showing no active course submissions in Samarth Portal",
                    text: "Course submission status from Samarth Portal",
                    contentType: "image/png",
                  },
                ],
              });
            }
          }
          return true;
          break;
        default:
          throw new Error("Invalid function type requested");
      }

      if (isPDF < 1 && index > 0) {
        const pdfResult = result as { [key: string]: string; pdfPath: string };
        if (callback) {
          callback({
            text: `I've downloaded the PDF for your ${functionName} #${index}.`,
            content: { data: pdfResult[Object.keys(pdfResult)[0]] },
            attachments: [
              {
                id: `${functionName}-${index}`,
                url: pdfResult.pdfPath,
                title: `${
                  functionName.charAt(0).toUpperCase() + functionName.slice(1)
                } #${index}`,
                source: "samarth-portal",
                description: `PDF of your ${functionName} #${index}`,
                text: `${functionName} details for #${index}`,
                contentType: "application/pdf",
              },
            ],
          });
        }
      } else if (index > 0) {
        if (callback) {
          callback({
            text: `Here is your ${functionName} #${index}:`,
            content: { data: result },
          });
        }
      } else {
        if (callback) {
          callback({
            text: `Here is your complete ${functionName}:`,
            content: { data: result },
          });
        }
      }

      return true;
    } catch (error) {
      elizaLogger.error("Error fetching portal information:", error);
      if (callback) {
        callback({
          text: `There was an error fetching your information from the portal`,
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
          action: "AUTO_PORTAL",
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
          text: "I need my admit card",
        },
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll fetch your admit card from the Samarth portal.",
          action: "AUTO_PORTAL",
        },
      },
      {
        user: "{{agent}}",
        content: {
          text: "I've downloaded your admit card. You can find it in the attachments below.",
          attachments: [
            {
              id: "admit-card-1",
              url: "path/to/admit-card.pdf",
              title: "Admit Card",
              source: "samarth-portal",
              description: "Your exam admit card",
              text: "Admit card details",
              contentType: "application/pdf",
            },
          ],
        },
      },
    ],
  ] as ActionExample[][],
} as Action;
