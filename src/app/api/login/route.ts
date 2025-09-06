import { NextResponse } from 'next/server';
import { authenticate } from '../../../lib/services/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password } = body || {};

    if (!username || !password) {
      return NextResponse.json({ error: 'Eksik parametre' }, { status: 400 });
    }

    // Log the username attempt (DO NOT log passwords)
    console.log('[login API] Login attempt for user:', username);

    const result = await authenticate(username, password);
    if (result.success) {
      return NextResponse.json({ success: true, user: result.user });
    }
    return NextResponse.json({ success: false, message: result.message || 'Kullanıcı adı veya şifre hatalı' }, { status: 401 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error('Login API error:', message, stack || '');
    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.json({ error: 'Sunucu hatası', detail: message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
