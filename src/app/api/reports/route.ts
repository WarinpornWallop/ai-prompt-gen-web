import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // กัน cache/stale ใน Edge/Node runtime

export async function GET() {
  try {
    const base = process.env.REPORTS_BASE_URL;
    if (!base) {
      console.error('[reports] Missing REPORTS_BASE_URL env');
      return NextResponse.json({ error: 'Missing REPORTS_BASE_URL' }, { status: 500 });
    }

    const trimmed = base.replace(/\/$/, '');
    const url = `${trimmed}/latest/index.json`;

    // ยิง HEAD เช็คก่อน (จะได้รู้สถานะ upstream)
    const head = await fetch(url, { method: 'HEAD', cache: 'no-store' });
    if (!head.ok) {
      console.error('[reports] HEAD failed', { url, status: head.status, statusText: head.statusText });
      return NextResponse.json({ error: `Upstream ${head.status} at ${url}` }, { status: 502 });
    }

    // ดึงเนื้อหา
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[reports] GET failed', { url, status: res.status, body: text.slice(0, 500) });
      return NextResponse.json({ error: `Fetch ${res.status} from ${url}` }, { status: 502 });
    }

    // พยายาม parse JSON แล้วสะท้อน error ถ้าโครงไม่ถูก
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      return NextResponse.json(json, { status: 200 });
    } catch (e) {
      console.error('[reports] JSON parse error', { url, sample: text.slice(0, 300) });
      return NextResponse.json({ error: 'Invalid JSON from upstream' }, { status: 502 });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    console.error('[reports] Server error', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
