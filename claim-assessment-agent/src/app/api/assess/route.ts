import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { SYSTEM_PROMPT } from '@/agent/prompt';
import { 
  tools, 
  verifyDocumentLogic, 
  lookupPolicyLogic, 
  checkMedicalNecessityLogic, 
  calculateBenefitLogic 
} from '@/tools';

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
const modelName = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

const model = genAI.getGenerativeModel({
  model: modelName,
  tools: [{ functionDeclarations: tools }],
  systemInstruction: SYSTEM_PROMPT,
});

export async function POST(request: Request) {
  try {
    const { testCaseId } = await request.json();

    if (!testCaseId) {
      return NextResponse.json({ error: 'Missing testCaseId' }, { status: 400 });
    }

    // Fetch Test Case from PostgreSQL
    const testCase = await prisma.testCase.findUnique({
      where: { id: testCaseId }
    });

    if (!testCase) {
      return NextResponse.json({ error: 'Test case not found in database' }, { status: 404 });
    }

    const claimData = {
      claimDetails: testCase.claimDetails,
      policyData: { policyId: testCase.policyId },
      documents: testCase.documents
    };

    const toolCallLogs: any[] = [];
    let stepCounter = 0;

    const chat = model.startChat();
    let result = await chat.sendMessage(`Please assess this claim. Data: ${JSON.stringify(claimData)}`);

    // Agentic loop
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
              toolResult = await verifyDocumentLogic(args.documentId);
              break;
            case "lookupPolicy":
              toolResult = await lookupPolicyLogic(args.policyId);
              break;
            case "checkMedicalNecessity":
              toolResult = await checkMedicalNecessityLogic(args.diagnosis, args.procedures);
              break;
            case "calculateBenefit":
              toolResult = await calculateBenefitLogic(args.policyId, args.claimType, args.amount);
              break;
            default:
              toolResult = { error: "Unknown tool" };
          }

          toolCallLogs.push({
            step: stepCounter,
            tool: call.name!,
            input: args,
            output: toolResult
          });

          functionResponses.push({
            functionResponse: {
              name: call.name,
              response: toolResult
            }
          });
        }

        result = await chat.sendMessage(functionResponses);
      } else {
        const report = result.response.text();
        const outputData = {
          caseName: testCase.id,
          claimInput: claimData,
          toolCallLogs,
          assessmentReport: report,
          timestamp: new Date().toISOString()
        };

        // Write to output directory
        const outputDir = path.join(process.cwd(), 'output');
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        const outputPath = path.join(outputDir, `${testCase.id}.json`);
        fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf8');

        return NextResponse.json(outputData);
      }
    }
  } catch (error: any) {
    console.error("Error during assessment:", error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
