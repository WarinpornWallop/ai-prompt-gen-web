import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const base = process.env.REPORTS_BASE_URL || '';
  const testUrl = base ? `${base.replace(/\/$/, '')}/latest/index.json` : '';
  let headStatus: number | null = null;
  try {
    if (testUrl) {
      const head = await fetch(testUrl, { method: 'HEAD', cache: 'no-store' });
      headStatus = head.status;
    }
  } catch {
    headStatus = -1; // fetch ล้ม (เช่น DNS/เน็ต)
  }
  return NextResponse.json({ base, testUrl, headStatus });
}
