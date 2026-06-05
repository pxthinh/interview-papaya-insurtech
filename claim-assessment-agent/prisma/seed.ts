import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DUMMY_POLICIES = [
  { id: "POL-001", status: "Active", coverageStartDate: new Date("2026-01-01"), coverageEndDate: new Date("2026-12-31"), coveredMembers: ["MEM-001", "MEM-002"], benefits: ["Surgery", "Hospitalization"], limit: 10000, exclusions: ["Cosmetic"], copay: 0.1, waitingPeriod: "None", requiredDocuments: { "Surgery": ["MedicalReport", "Invoice"] } },
  { id: "POL-002", status: "Active", coverageStartDate: new Date("2026-01-01"), coverageEndDate: new Date("2026-12-31"), coveredMembers: ["MEM-003"], benefits: ["Dental"], limit: 1000, exclusions: ["Cosmetic Crown", "Teeth Whitening"], copay: 0.2, waitingPeriod: "None", requiredDocuments: { "Dental": ["Invoice"] } },
  { id: "POL-003", status: "Active", coverageStartDate: new Date("2026-01-01"), coverageEndDate: new Date("2026-12-31"), coveredMembers: ["MEM-004", "MEM-005"], benefits: ["Therapy", "Consultation"], limit: 2000, exclusions: [], copay: 0.0, waitingPeriod: "None", requiredDocuments: { "Therapy": ["MedicalReport", "Invoice"] } }
];

const DUMMY_DOCUMENTS = [
  { id: "DOC-101", type: "MedicalReport", isComplete: true, issues: null },
  { id: "DOC-102", type: "Invoice", isComplete: true, issues: null },
  { id: "DOC-201", type: "Invoice", isComplete: true, issues: null },
  { id: "DOC-301", type: "MedicalReport", isComplete: true, issues: null },
  { id: "DOC-302", type: "Invoice", isComplete: false, issues: "Missing clinic signature and stamp." }
];

const MEDICAL_RULES = [
  { diagnosis: "Appendicitis", procedures: ["Appendectomy", "Ultrasound"] },
  { diagnosis: "Tooth Decay", procedures: ["Filling", "Extraction"] },
  { diagnosis: "Back Pain", procedures: ["Physical Therapy", "X-Ray"] }
];

const TEST_CASES = [
  {
    id: "case1_approve",
    claimDetails: { memberId: "MEM-001", claimType: "Surgery", amount: 5000, diagnosis: "Appendicitis", procedures: ["Appendectomy"], treatmentDate: "2026-05-10" },
    policyId: "POL-001",
    documents: ["DOC-101", "DOC-102"]
  },
  {
    id: "case2_reject",
    claimDetails: { memberId: "MEM-003", claimType: "Dental", amount: 3500, diagnosis: "Tooth Decay", procedures: ["Cosmetic Crown"], treatmentDate: "2026-05-15" },
    policyId: "POL-002",
    documents: ["DOC-201"]
  },
  {
    id: "case3_request_info",
    claimDetails: { memberId: "MEM-004", claimType: "Therapy", amount: 500, diagnosis: "Back Pain", procedures: ["Physical Therapy"], treatmentDate: "2026-05-20" },
    policyId: "POL-003",
    documents: ["DOC-102"] 
  }
];

async function main() {
  console.log(`Start seeding ...`);
  for (const p of DUMMY_POLICIES) {
    const policy = await prisma.policy.upsert({
      where: { id: p.id },
      update: {},
      create: p,
    });
    console.log(`Created policy with id: ${policy.id}`);
  }
  for (const d of DUMMY_DOCUMENTS) {
    const doc = await prisma.document.upsert({
      where: { id: d.id },
      update: {},
      create: d,
    });
    console.log(`Created document with id: ${doc.id}`);
  }
  for (const m of MEDICAL_RULES) {
    const rule = await prisma.medicalRule.upsert({
      where: { diagnosis: m.diagnosis },
      update: {},
      create: m,
    });
    console.log(`Created medical rule for diagnosis: ${rule.diagnosis}`);
  }
  for (const t of TEST_CASES) {
    const tc = await prisma.testCase.upsert({
      where: { id: t.id },
      update: {},
      create: t,
    });
    console.log(`Created testcase with id: ${tc.id}`);
  }
  console.log(`Seeding finished.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
