import {
  type ActionExample,
  composeContext,
  elizaLogger,
  generateObjectDeprecated,
  type HandlerCallback,
  type IAgentRuntime,
  generateText,
  type Memory,
  ModelClass,
  type State,
  
  type Action,
} from "@elizaos/core";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { StudentFilter } from "../providers/newPortal";

// Get the directory path using import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read and parse the dummy data
let dummyData: any[];
let filter: StudentFilter;

async function initializeData() {
  const data = await fs.readFile(path.join(__dirname, 'dummy.json'), 'utf-8');
  dummyData = JSON.parse(data);
  filter = new StudentFilter(dummyData);
}

// Initialize the data
initializeData().catch(err => {
  elizaLogger.error("Error initializing dummy data:", err);
});

interface StudentCriteria {
  courseSubmitted?: boolean;
  examFormSubmitted?: boolean;
  feeSubmitted?: boolean;
  feeVerified?: boolean;
  minAttendance?: number;
  maxAttendance?: number;
  searchTerm?: string;
  isSubmitted?: boolean;
  isVerified?: boolean;
}

interface StudentRequest {
  functionType: string;
  filterType?: string;
  criteria?: StudentCriteria;
}



const studentTemplate = `You are an AI assistant helping with student data analysis. Based on the recent conversation, determine what information the user is requesting.

Available Function Types:
1. getAllStudents - Get all students in the database
2. filterByCourse - Filter students by course submission status
3. filterByExamForm - Filter students by examination form submission status
4. filterByFee - Filter students by fee submission status
5. filterByFeeVerification - Filter students by fee verification status
6. filterByAttendance - Filter students by attendance criteria
7. filterByFeeStatus - Combined filter for fee submission and verification
8. filterByCourseAndExam - Combined filter for course and exam form submission
9. filterByExamAndFee - Combined filter for exam form and fee submission
10. filterBySubmissions - Filter by submission completion status
11. filterByVerification - Filter by verification status
12. filterByEligibility - Filter students by exam eligibility
13. advancedFilter - Custom filter with multiple criteria
14. searchStudents - Search students by name or email
15. getStatistics - Get overall statistics about students

Context Rules:
- Identify the primary function type based on the user's request
- For filter operations, determine which specific filter method to use
- Include only relevant criteria in the response
- Omit any criteria that are not specified or not relevant
- For search operations, extract the search term
- If the request doesn't clearly match any function, return a null functionType

Recent Conversation:
{{recentMessages}}

\`\`\`json
{
    "functionType": "string from the list above",
    "filterType": "specific filter method if applicable",
    "criteria": {
        "courseSubmitted": true/false,
        "examFormSubmitted": true/false,
        "feeSubmitted": true/false,
        "feeVerified": true/false,
        "minAttendance": number,
        "maxAttendance": number,
        "searchTerm": "string",
        "isSubmitted": true/false,
        "isVerified": true/false
    }
}
\`\`\`

IMPORTANT: Only include criteria that are explicitly mentioned or relevant to the request. Only return the JSON data, Do not include null values or unspecified criteria.`;

export const autoPortal: Action = {
  name: "AUTO_PORTAL",
  similes: [
    "STUDENT_STATS",
    "FILTER_STUDENTS",
    "SEARCH_STUDENTS",
    "EXAM_ELIGIBILITY",
    "STUDENT_ANALYSIS",
    "COURSE_SUBMISSION",
    "FEE_VERIFICATION",
    "ATTENDANCE_TRACKING"
  ],
  description:
    "Analyze student data including statistics, filtering by various criteria, searching, and exam eligibility",
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

    // Ensure data is initialized
    if (!filter) {
      await initializeData();
    }

    const studentContext = composeContext({
      state: currentState,
      template: studentTemplate,
    });

    let validation = await generateText({
      runtime,
      context: studentContext,
      modelClass: ModelClass.LARGE,
    });



    elizaLogger.error(validation);
    let content : StudentRequest;

    try {
      // Remove any potential non-JSON text
      const jsonStr = validation.substring(
          validation.indexOf('{'),
          validation.lastIndexOf('}') + 1
      );
      content  = JSON.parse(jsonStr) as StudentRequest;
      console.log(content)
      
      // Validate the structure
      
      
      // Validate recommendedPosition
     
  } catch (parseError) {
      elizaLogger.error('JSON parsing error:', parseError);
      return false;
  }

    try {
      if (!content.functionType) {
        if (callback) {
          callback({
            text: "I'm sorry, but your request is outside the scope of what I can help with regarding student data analysis.",
          });
        }
        return false;
      }

      // Clean up criteria by removing null/undefined values
      if (content.criteria) {
        const criteria = content.criteria;
        (Object.keys(criteria) as Array<keyof StudentCriteria>).forEach(key => {
          if (criteria[key] === null || criteria[key] === undefined) {
            delete criteria[key];
          }
        });
      }

      let result;
      let functionName = "";

      switch (content.functionType.toLowerCase()) {
        case "getallstudents":
          result = filter.getAllStudents();
          functionName = "all students";
          break;
          
        case "filterbycourse":
          if (content.criteria?.isSubmitted !== undefined) {
            result = filter.filterByCourseSubmission(content.criteria.isSubmitted);
            functionName = content.criteria.isSubmitted ? 
              "students who submitted their courses" : 
              "students who haven't submitted their courses";
          } else {
            result = filter.filterByCourseSubmission(true);
            functionName = "students who submitted their courses";
          }
          break;
          
        case "filterbyexamform":
          if (content.criteria?.isSubmitted !== undefined) {
            result = filter.filterByExamFormSubmission(content.criteria.isSubmitted);
            functionName = content.criteria.isSubmitted ? 
              "students who submitted exam forms" : 
              "students who haven't submitted exam forms";
          } else {
            result = filter.filterByExamFormSubmission(true);
            functionName = "students who submitted exam forms";
          }
          break;
          
        case "filterbyfee":
          if (content.criteria?.isSubmitted !== undefined) {
            result = filter.filterByFeeSubmission(content.criteria.isSubmitted);
            functionName = content.criteria.isSubmitted ? 
              "students who submitted fees" : 
              "students who haven't submitted fees";
          } else {
            result = filter.filterByFeeSubmission(true);
            functionName = "students who submitted fees";
          }
          break;
          
        case "filterbyfeeverification":
          if (content.criteria?.isVerified !== undefined) {
            result = filter.filterByFeeVerification(content.criteria.isVerified);
            functionName = content.criteria.isVerified ? 
              "students with verified fees" : 
              "students with unverified fees";
          } else {
            result = filter.filterByFeeVerification(true);
            functionName = "students with verified fees";
          }
          break;
          
        case "filterbyattendance":
          if (content.criteria?.minAttendance && content.criteria?.maxAttendance) {
            result = filter.filterByAttendanceRange(
              content.criteria.minAttendance,
              content.criteria.maxAttendance
            );
            functionName = `students with attendance between ${content.criteria.minAttendance}% and ${content.criteria.maxAttendance}%`;
          } else if (content.criteria?.minAttendance) {
            result = filter.filterByMinAttendance(content.criteria.minAttendance);
            functionName = `students with attendance above ${content.criteria.minAttendance}%`;
          } else {
            result = filter.filterByMinAttendance(75); // Default
            functionName = "students with attendance above 75%";
          }
          break;
          
        case "filterbyfeestatus":
          if (content.criteria?.feeSubmitted !== undefined && content.criteria?.feeVerified !== undefined) {
            result = filter.filterByFeeStatus(
              content.criteria.feeSubmitted,
              content.criteria.feeVerified
            );
            functionName = describeFeeStatus(content.criteria.feeSubmitted, content.criteria.feeVerified);
          } else {
            result = filter.filterByFeeStatus(true, true);
            functionName = "students with submitted and verified fees";
          }
          break;
          
        case "filterbycourseandexam":
          if (content.criteria?.courseSubmitted !== undefined && content.criteria?.examFormSubmitted !== undefined) {
            result = filter.filterByCourseAndExamStatus(
              content.criteria.courseSubmitted,
              content.criteria.examFormSubmitted
            );
            functionName = describeCourseAndExamStatus(
              content.criteria.courseSubmitted, 
              content.criteria.examFormSubmitted
            );
          } else {
            result = filter.filterByCourseAndExamStatus(true, true);
            functionName = "students who submitted both courses and exam forms";
          }
          break;
          
        case "filterbyexamandfee":
          if (content.criteria?.examFormSubmitted !== undefined && content.criteria?.feeSubmitted !== undefined) {
            result = filter.filterByExamAndFeeStatus(
              content.criteria.examFormSubmitted,
              content.criteria.feeSubmitted
            );
            functionName = describeExamAndFeeStatus(
              content.criteria.examFormSubmitted, 
              content.criteria.feeSubmitted
            );
          } else {
            result = filter.filterByExamAndFeeStatus(true, true);
            functionName = "students who submitted both exam forms and fees";
          }
          break;
          
        case "filterbysubmissions":
          if (content.filterType === "allComplete") {
            result = filter.filterByAllSubmissionsComplete();
            functionName = "students with all submissions complete";
          } else if (content.filterType === "anyMissing") {
            result = filter.filterByAnySubmissionMissing();
            functionName = "students with any submission missing";
          } else {
            // Default
            result = filter.filterByAllSubmissionsComplete();
            functionName = "students with all submissions complete";
          }
          break;
          
        case "filterbyverification":
          if (content.filterType === "complete") {
            result = filter.filterByCompleteVerification();
            functionName = "students with complete verification";
          } else if (content.filterType === "incomplete") {
            result = filter.filterByIncompleteVerification();
            functionName = "students with incomplete verification";
          } else {
            // Default
            result = filter.filterByCompleteVerification();
            functionName = "students with complete verification";
          }
          break;
          
        case "filterbyeligibility":
          if (content.filterType === "eligible") {
            const minAttendance = content.criteria?.minAttendance || 75;
            result = filter.filterByExamEligibility(minAttendance);
            functionName = `students eligible for exams (min attendance: ${minAttendance}%)`;
          } else if (content.filterType === "ineligible") {
            const minAttendance = content.criteria?.minAttendance || 75;
            result = filter.filterByExamIneligibility(minAttendance);
            functionName = `students not eligible for exams (min attendance: ${minAttendance}%)`;
          } else {
            // Default
            result = filter.filterByExamEligibility();
            functionName = "students eligible for exams";
          }
          break;
          
        case "advancedfilter":
          result = filter.advancedFilter(content.criteria || {});
          functionName = "students matching all criteria";
          break;
          
        case "searchstudents":
          if (content.filterType === "byName" && content.criteria?.searchTerm) {
            result = filter.searchByName(content.criteria.searchTerm);
            functionName = `students with name matching "${content.criteria.searchTerm}"`;
          } else if (content.filterType === "byEmail" && content.criteria?.searchTerm) {
            result = filter.searchByEmail(content.criteria.searchTerm);
            functionName = `students with email matching "${content.criteria.searchTerm}"`;
          } else if (content.criteria?.searchTerm) {
            // Search both name and email
            const nameResults = filter.searchByName(content.criteria.searchTerm);
            const emailResults = filter.searchByEmail(content.criteria.searchTerm);
            
            // Combine and remove duplicates
            const combinedIds = new Set();
            result = [...nameResults, ...emailResults].filter(student => {
              if (combinedIds.has(student.email)) {
                return false;
              }
              combinedIds.add(student.email);
              return true;
            });
            
            functionName = `students matching "${content.criteria.searchTerm}"`;
          } else {
            result = [];
            functionName = "search results (no search term provided)";
          }
          break;
          
        case "getstatistics":
          result = filter.getStatistics();
          functionName = "student statistics";
          break;
          
        default:
          if (callback) {
            callback({
              text: "I'm sorry, but your request is outside the scope of what I can help with regarding student data analysis.",
            });
          }
          return false;
      }

      const updatedResult = JSON.stringify(result)

      elizaLogger.error(updatedResult);

      

      let updatedTemplate= `I generated some results based on the some recent messages from the user about the student info:
You have to frame that data and return it to as text make sure that the text should be beautifully framed:

Result because these funciton are called:
${validation}

Here is the fetched result 
${updatedResult}


`;

const validationContent = await generateText({
  runtime,
  context: updatedTemplate,
  modelClass: ModelClass.LARGE,
});

      
      if (callback) {
        callback({
          text: `Here are the ${functionName}: ${validationContent}`,
          
        });
      }

      return true;
    } catch (error) {
      elizaLogger.error("Error analyzing student data:", error);
      if (callback) {
        callback({
          text: `There was an error analyzing the student data: ${error}`,
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
          text: "What's the overall course submission rate?",
        },
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll fetch the student statistics.",
          action: "AUTO_PORTAL",
        },
      },
      {
        user: "{{agent}}",
        content: {
          text: "Here are the student statistics:",
          content: { data: {} },
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Show me students with attendance > 80%",
        },
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll filter the students based on attendance.",
          action: "AUTO_PORTAL",
        },
      },
      {
        user: "{{agent}}",
        content: {
          text: "Here are the filtered students:",
          content: { data: [] },
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Which students have submitted course materials but not exam forms?",
        },
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll check for students with course submissions but missing exam forms.",
          action: "AUTO_PORTAL",
        },
      },
      {
        user: "{{agent}}",
        content: {
          text: "Here are the students who submitted courses but not exam forms:",
          content: { data: [] },
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Find all students named Smith",
        },
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll search for students with 'Smith' in their name.",
          action: "AUTO_PORTAL",
        },
      },
      {
        user: "{{agent}}",
        content: {
          text: "Here are the students matching \"Smith\":",
          content: { data: [] },
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "List students who have paid fees but verification is pending",
        },
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll find students with incomplete verification status.",
          action: "AUTO_PORTAL",
        },
      },
      {
        user: "{{agent}}",
        content: {
          text: "Here are the students with incomplete verification:",
          content: { data: [] },
        },
      },
    ],
  ] as ActionExample[][],
} as Action;

// Helper functions to generate descriptive strings
function describeFeeStatus(feeSubmitted: boolean, feeVerified: boolean): string {
  if (feeSubmitted && feeVerified) {
    return "students with submitted and verified fees";
  } else if (feeSubmitted && !feeVerified) {
    return "students with submitted but unverified fees";
  } else if (!feeSubmitted && feeVerified) {
    return "students with verified fees but no submission record";
  } else {
    return "students without fee submission or verification";
  }
}

function describeCourseAndExamStatus(courseSubmitted: boolean, examFormSubmitted: boolean): string {
  if (courseSubmitted && examFormSubmitted) {
    return "students who submitted both courses and exam forms";
  } else if (courseSubmitted && !examFormSubmitted) {
    return "students who submitted courses but not exam forms";
  } else if (!courseSubmitted && examFormSubmitted) {
    return "students who submitted exam forms but not courses";
  } else {
    return "students who haven't submitted courses or exam forms";
  }
}

function describeExamAndFeeStatus(examFormSubmitted: boolean, feeSubmitted: boolean): string {
  if (examFormSubmitted && feeSubmitted) {
    return "students who submitted both exam forms and fees";
  } else if (examFormSubmitted && !feeSubmitted) {
    return "students who submitted exam forms but not fees";
  } else if (!examFormSubmitted && feeSubmitted) {
    return "students who submitted fees but not exam forms";
  } else {
    return "students who haven't submitted exam forms or fees";
  }
}