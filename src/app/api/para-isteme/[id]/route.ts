import { NextRequest, NextResponse } from 'next/server';
import { getParaIstemeRepository } from '../../../../lib/repositories';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!params?.id) return NextResponse.json({ error: 'id gerekli' }, { status: 400 });
  try {
    const repo = getParaIstemeRepository();
    await repo.delete(params.id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinmeyen hata';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}