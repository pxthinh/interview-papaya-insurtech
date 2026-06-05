import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { 
  tools, 
  verifyDocumentLogic, 
  lookupPolicyLogic, 
  checkMedicalNecessityLogic, 
  calculateBenefitLogic 
} from './tools';
import { SYSTEM_PROMPT } from './agent/prompt';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash";

const model = genAI.getGenerativeModel({
  model: modelName,
  tools: [{ functionDeclarations: tools }],
  systemInstruction: SYSTEM_PROMPT,
});

const testCasesPath = path.join(__dirname, 'data', 'testCases.json');
const testCases = JSON.parse(fs.readFileSync(testCasesPath, 'utf8'));

// Ensure output directory exists
const outputDir = path.join(__dirname, '..', 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

interface ToolCallLog {
  step: number;
  tool: string;
  input: Record<string, any>;
  output: Record<string, any>;
}

async function runAgentForClaim(caseName: string, claimData: any) {
  const separator = '='.repeat(60);
  console.log(`\n${separator}`);
  console.log(`🚀 STARTING ASSESSMENT: ${caseName.toUpperCase()}`);
  console.log(`${separator}\n`);

  const toolCallLogs: ToolCallLog[] = [];
  let stepCounter = 0;

  const chat = model.startChat();
  let result = await chat.sendMessage(`Please assess this claim. Data: ${JSON.stringify(claimData)}`);

  // Agentic loop — process function calls until the model produces a final text response
  while (true) {
    const functionCalls = result.response.functionCalls && typeof result.response.functionCalls === 'function'
      ? result.response.functionCalls()
      : result.response.functionCalls;

    if (functionCalls && functionCalls.length > 0) {
      const functionResponses = [];

      for (const call of functionCalls) {
        stepCounter++;
        const args = call.args as any;
        let toolResult: Record<string, any> = {};

        switch (call.name) {
          case "verifyDocument":
            toolResult = verifyDocumentLogic(args.documentId);
            break;
          case "lookupPolicy":
            toolResult = lookupPolicyLogic(args.policyId);
            break;
          case "checkMedicalNecessity":
            toolResult = checkMedicalNecessityLogic(args.diagnosis, args.procedures);
            break;
          case "calculateBenefit":
            toolResult = calculateBenefitLogic(args.policyId, args.claimType, args.amount);
            break;
          default:
            toolResult = { error: "Unknown tool" };
        }

        // Log tool call
        const log: ToolCallLog = {
          step: stepCounter,
          tool: call.name!,
          input: args,
          output: toolResult
        };
        toolCallLogs.push(log);

        console.log(`  [Step ${stepCounter}] 🔧 ${call.name}(${JSON.stringify(args)})`);
        console.log(`           ➜ ${JSON.stringify(toolResult)}\n`);

        functionResponses.push({
          functionResponse: {
            name: call.name,
            response: toolResult
          }
        });
      }

      result = await chat.sendMessage(functionResponses);
    } else {
      // Final text response — the assessment report
      const report = result.response.text();
      console.log(`\n✅ ASSESSMENT COMPLETE\n`);
      console.log(report);

      // Save structured output to file
      const outputData = {
        caseName,
        claimInput: claimData,
        toolCallLogs,
        assessmentReport: report,
        timestamp: new Date().toISOString()
      };

      const outputPath = path.join(outputDir, `${caseName}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf8');
      console.log(`\n📄 Output saved to: output/${caseName}.json`);

      break;
    }
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║         CLAIM ASSESSMENT AI AGENT — RUN START          ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  await runAgentForClaim("case1_approve", testCases.case1_approve);
  await runAgentForClaim("case2_reject", testCases.case2_reject);
  await runAgentForClaim("case3_request_info", testCases.case3_request_info);

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║         ALL 3 CASES ASSESSED SUCCESSFULLY              ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
}

main().catch(console.error);