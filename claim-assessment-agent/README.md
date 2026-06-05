# Claim Assessment AI Agent

This project is an AI-powered claim assessment system built to automate the review of insurance claims. It uses the Gemini LLM via function-calling to deterministically verify policies, calculate benefits, check medical necessity, and validate documents.

## Technology Stack
- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **AI**: Google Generative AI (Gemini Flash)
- **UI**: Tailwind CSS, Lucide React

## Getting Started

1. Ensure Docker Desktop is running.
2. Copy `.env.example` to `.env` and fill in your `GEMINI_API_KEY`.
3. Run `docker compose up -d --build` to start the PostgreSQL database and the Next.js application.
4. Run `docker compose exec app npx prisma db push` to push the schema to the database.
5. Run `sudo docker compose exec app npx ts-node --compilerOptions "{\"module\":\"CommonJS\"}" prisma/seed.ts` to insert the 3 mock test cases.
6. Navigate to `http://localhost:3007` to use the application.

## System Prompt & Tool Design Decisions

### Tool Design
The agent is provided with 4 strictly scoped tools to prevent hallucination and enforce deterministic business logic:
1. **`verifyDocument(documentId)`**: Queries the database to return the document's type, completeness, and any potential issues (e.g., "Missing clinic signature").
2. **`lookupPolicy(policyId)`**: Retrieves the ground-truth policy terms, including coverage limits, copay percentages, exclusions, and the specific `requiredDocuments` for different claim types.
3. **`checkMedicalNecessity(diagnosis, procedures)`**: Evaluates whether the requested procedures are standard and medically appropriate for the given diagnosis, based on an internal medical rules engine.
4. **`calculateBenefit(policyId, claimType, amount)`**: Offloads the mathematical calculation from the LLM to standard code, ensuring accuracy. It automatically caps the covered amount at the policy limit and calculates the exact member responsibility.

### System Prompt Engineering
The system prompt (`src/agent/prompt.ts`) is designed to strictly constrain the agent's behavior to meet the evaluation criteria:
- **Forced Sequence**: The prompt explicitly commands the agent to call tools in a logical order (verify documents → lookup policy → check medical necessity → calculate benefits) and to prefix its actions with `[THOUGHT]` to ensure traceable reasoning.
- **Missing Document Handling**: The prompt contains an explicit rule: *"If ANY required document is missing, isComplete=false, or has issues, your final recommendation MUST be REQUEST_MORE_INFO (do not reject)."* The agent cross-references the submitted document types against the `requiredDocuments` array returned by `lookupPolicy` to accurately detect missing files.
- **Citation Enforcement**: The `REPORT FORMAT` section dictates the exact Markdown structure of the output and strictly mandates that every point in the final recommendation must cite specific policy clauses, limits, or dates.
- **No Hallucination**: The prompt forbids the agent from inventing policy terms and forces it to rely solely on the data returned by the tools.

## Output Logs
When an assessment is run via the web UI, the detailed assessment report and the exact sequence of tool calls (with inputs and outputs) are automatically logged to the `/output` directory as JSON files for auditing purposes.
