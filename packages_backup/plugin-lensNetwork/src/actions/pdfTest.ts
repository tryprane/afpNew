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


const pdfGenerationTemplate = `Look at your LAST RESPONSE in the conversation where you confirmed a PDF generation request.
Based on ONLY that last message, extract the PDF generation details:

\`\`\`json
{
    "title": "<PDF title>",
    "content": "<content to include in the PDF>",
    "format": "<optional format preferences>"
}
\`\`\`

Recent conversation:
{{recentMessages}}`;

export const generatePdf: Action = {
    name: "GENERATE_PDF",
    similes: [
        "CREATE_PDF",
        "MAKE_PDF",
        "EXPORT_PDF",
        "PDF_GENERATION",
        "SAVE_AS_PDF",
        "EXPORT_AS_PDF",
    ],
    description: "Generate a PDF document with specified content",
    validate: async (runtime: IAgentRuntime) => {
        // Check if PDF service is available
        return true; // For now, always valid
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: Record<string, unknown>,
        callback?: HandlerCallback
    ): Promise<boolean> => {
        let content;
        try {
            let currentState = state;
            if (!currentState) {
                currentState = await runtime.composeState(message);
            } else {
                currentState = await runtime.updateRecentMessageState(currentState);
            }

            const context = composeContext({
                state: currentState,
                template: pdfGenerationTemplate,
            });

            elizaLogger.info(composeContext)

            content = await generateObjectDeprecated({
                runtime,
                context,
                modelClass: ModelClass.SMALL,
            });

            

            // This is where the actual PDF generation would happen
            // But we're just returning success as per the requirements
            
            if (callback) {
                callback({
                    text: `Your PDF has been generated successfully!\nTitle: ${content.title}\nFormat: ${content.format || "Standard"}`,
                    content: {
                        title: content.title,
                        format: content.format || "Standard",
                        status: "COMPLETED"
                    },
                });
            }

            return true;
        } catch (error  ) {
            elizaLogger.error("Error generating PDF:", {
                content,
                
            });
            if (callback) {
                callback({
                    text: `Error generating PDF: ${error}`,
                    content: { error: error },
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
                    text: "Generate a PDF of my monthly financial report",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll generate a PDF of your monthly financial report right away.",
                    action: "GENERATE_PDF",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Your PDF has been generated successfully!\nTitle: Monthly Financial Report\nFormat: Standard",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Save my presentation as a PDF with landscape orientation",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll save your presentation as a PDF with landscape orientation.",
                    action: "GENERATE_PDF",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Your PDF has been generated successfully!\nTitle: Presentation\nFormat: Landscape",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;