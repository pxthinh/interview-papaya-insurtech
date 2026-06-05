import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const testCases = await prisma.testCase.findMany();
    return NextResponse.json(testCases);
  } catch (error: any) {
    console.error("Error fetching test cases:", error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
