import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { prompt, imageUrls = [] } = await req.json();
  if (!prompt || typeof prompt !== 'string') {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
  }
  const base = 'https://lovable.dev/?autosubmit=true#';
  const params = new URLSearchParams();
  params.set('prompt', prompt);
  for (const img of imageUrls) params.append('images', img);
  const url = `${base}${params.toString()}`;
  return NextResponse.json({ url });
}
