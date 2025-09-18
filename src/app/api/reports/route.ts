import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const base = process.env.REPORTS_BASE_URL;
    if (!base) {
      return NextResponse.json({ error: 'Missing REPORTS_BASE_URL' }, { status: 500 });
    }
    const url = `${base.replace(/\/$/, '')}/latest/index.json`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json({ error: `Fetch failed ${res.status}` }, { status: 502 });
    }
    const json = await res.json();
    return NextResponse.json(json, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'unknown error' }, { status: 500 });
  }
}
