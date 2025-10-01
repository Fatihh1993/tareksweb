import { NextResponse } from 'next/server';
import sql from 'mssql';
import { getPool } from '@/lib/db';
import { PassThrough } from 'stream';
import { Readable } from 'stream';
import ftp from 'basic-ftp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/tareks/arsiv/download?beyannameid=GUID&arsivid=ID
export async function GET(req: Request) {
  const url = new URL(req.url);
  const modulid = url.searchParams.get('beyannameid') || url.searchParams.get('modulid');
  const arsivid = url.searchParams.get('arsivid');
  if (!modulid) {
    return NextResponse.json({ error: 'modulid (beyannameid) gerekli' }, { status: 400 });
  }

  try {
    const pool = await getPool();
    // 1) sbr_arsiv satırını al
    const arsiv = await pool
      .request()
      .input('modulid', sql.VarChar(100), modulid)
      .input('arsivid', sql.VarChar(100), arsivid ?? null)
      .query(`
        SELECT TOP 1 ad, arsivftpklasor, modulkod, modulid, ftpad, arsivid,
               kayitgiristarih, guncellemetarih
        FROM sbr_arsiv WITH (NOLOCK)
        WHERE modulid = @modulid
          AND (@arsivid IS NULL OR arsivid = @arsivid)
        ORDER BY ISNULL(guncellemetarih, kayitgiristarih) DESC, arsivid DESC
      `);

    if (!arsiv.recordset?.length) {
      return NextResponse.json({ error: 'Arşiv kaydı bulunamadı' }, { status: 404 });
    }

    const row = arsiv.recordset[0] as {
      ad: string; arsivftpklasor: string; modulkod: string; modulid: string; ftpad: string; arsivid: string;
      kayitgiristarih?: string | Date | null; guncellemetarih?: string | Date | null;
    };

    // 2) FTP parametrelerini sbr_parametre'den çek
    const p = await pool.request().query(`SELECT TOP 1 arsivftpuser, arsivftppass, arsivftpip FROM sbr_parametre WITH (NOLOCK)`);
    if (!p.recordset?.length) {
      return NextResponse.json({ error: 'FTP parametreleri bulunamadı' }, { status: 500 });
    }
    const { arsivftpuser, arsivftppass, arsivftpip } = p.recordset[0] as { arsivftpuser: string; arsivftppass: string; arsivftpip: string };

    // 3) FTP yolu (C# ile uyumlu) – modül klasörü ve {GUID} klasörü
    // C# örneğinde \\ kullanımı var; FTP için ileri slash ile normalize edelim
    const remotePath = `${row.arsivftpklasor}/${row.modulkod}/{${row.modulid}}/${row.ftpad}.sbr`;

    // 4) FTP'den stream et ve response olarak döndür
    const client = new ftp.Client(20000);
    client.ftp.verbose = false;
    const passThrough = new PassThrough();

    // başlat ve arka planda akıt
    (async () => {
      try {
        await client.access({ host: arsivftpip, user: arsivftpuser, password: arsivftppass, secure: false });
        await client.downloadTo(passThrough, remotePath.replace(/\\/g, '/'));
      } catch (e) {
        passThrough.destroy(e as Error);
      } finally {
        client.close();
      }
    })().catch(() => { /* swallow */ });

  // dosya adı: her zaman .pdf olarak indirilsin (içerik .sbr olsa bile)
  const rawName = String(row.ad || 'arsiv');
  const withoutExt = rawName.replace(/\.[^./\\]+$/, '');
  const fileName = rawName.toLowerCase().endsWith('.pdf') ? rawName : `${withoutExt}.pdf`;

    const webStream = Readable.toWeb(passThrough) as unknown as ReadableStream;
    return new Response(webStream, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[arsiv download] error:', msg);
    return NextResponse.json({ error: 'Sunucu hatası', detail: process.env.NODE_ENV !== 'production' ? msg : undefined }, { status: 500 });
  }
}
