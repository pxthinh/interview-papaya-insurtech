import { FunctionDeclaration, SchemaType } from '@google/generative-ai';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// --- TOOL DEFINITIONS FOR LLM ---
export const tools: FunctionDeclaration[] = [
  {
    name: "verifyDocument",
    description: "Returns document type, completeness status, and any issues found.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: { documentId: { type: SchemaType.STRING } },
      required: ["documentId"]
    }
  },
  {
    name: "lookupPolicy",
    description: "Returns policy terms: benefits, limits, exclusions, copay, waiting periods.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: { policyId: { type: SchemaType.STRING } },
      required: ["policyId"]
    }
  },
  {
    name: "checkMedicalNecessity",
    description: "Returns whether the treatment is clinically appropriate for the diagnosis.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: { 
        diagnosis: { type: SchemaType.STRING }, 
        procedures: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } } 
      },
      required: ["diagnosis", "procedures"]
    }
  },
  {
    name: "calculateBenefit",
    description: "Calculates covered amount, copay, and remaining limit.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: { 
        policyId: { type: SchemaType.STRING },
        claimType: { type: SchemaType.STRING },
        amount: { type: SchemaType.NUMBER }
      },
      required: ["policyId", "claimType", "amount"]
    }
  }
];

// --- TOOL IMPLEMENTATIONS ---
export async function verifyDocumentLogic(documentId: string) {
  console.log(`[EXEC] verifyDocument called with ID: ${documentId}`);
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) {
    return { type: "Unknown", isComplete: false, issues: "Document not found in database." };
  }
  return doc;
}

export async function lookupPolicyLogic(policyId: string) {
  console.log(`[EXEC] lookupPolicy called with ID: ${policyId}`);
  const policy = await prisma.policy.findUnique({ where: { id: policyId } });
  if (!policy) {
    return { error: "Policy not found." };
  }
  return policy;
}

export async function checkMedicalNecessityLogic(diagnosis: string, procedures: string[]) {
  console.log(`[EXEC] checkMedicalNecessity called for ${diagnosis} -> ${procedures}`);
  const rule = await prisma.medicalRule.findUnique({ where: { diagnosis } });
  const validProcedures = rule?.procedures || [];
  const isAppropriate = procedures.every(p => validProcedures.includes(p));
  return {
    diagnosis,
    procedures,
    isAppropriate,
    reasoning: isAppropriate ? "Procedures are standard for this diagnosis." : `Procedures are not standard for ${diagnosis}.`
  };
}

export async function calculateBenefitLogic(policyId: string, claimType: string, amount: number) {
  console.log(`[EXEC] calculateBenefit called: Policy ${policyId}, Type ${claimType}, Amount ${amount}`);
  const policy = await prisma.policy.findUnique({ where: { id: policyId } });
  if (!policy) return { error: "Policy not found" };

  // Check if the claim type is a covered benefit
  if (!policy.benefits.includes(claimType)) {
    return {
      submittedAmount: amount,
      coveredAmount: 0,
      copayPercentage: policy.copay,
      memberResponsibility: amount,
      remainingLimit: policy.limit,
      note: `Claim type '${claimType}' is not a covered benefit under this policy.`
    };
  }

  let coveredAmount = amount - (amount * policy.copay);
  if (coveredAmount > policy.limit) {
    coveredAmount = policy.limit; // Cap at limit
  }

  return {
    submittedAmount: amount,
    coveredAmount: coveredAmount,
    copayPercentage: policy.copay,
    memberResponsibility: amount - coveredAmount,
    remainingLimit: policy.limit - coveredAmount
  };
}