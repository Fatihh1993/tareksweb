import { NextResponse } from 'next/server';
import sql from 'mssql';
import { getPool } from '@/lib/db';
import archiver from 'archiver';
import { PassThrough } from 'stream';
import { Readable } from 'stream';
import ftp from 'basic-ftp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/tareks/arsiv/zip?beyannameid=GUID&ids=ID1,ID2
export async function GET(req: Request) {
  const url = new URL(req.url);
  const modulid = url.searchParams.get('beyannameid') || url.searchParams.get('modulid');
  const idsParam = url.searchParams.get('ids');
  if (!modulid) {
    return NextResponse.json({ error: 'beyannameid/modulid gerekli' }, { status: 400 });
  }

  try {
    const pool = await getPool();

    // 1) FTP parametreleri
    const p = await pool.request().query(`SELECT TOP 1 arsivftpuser, arsivftppass, arsivftpip FROM sbr_parametre WITH (NOLOCK)`);
    if (!p.recordset?.length) {
      return NextResponse.json({ error: 'FTP parametreleri bulunamadı' }, { status: 500 });
    }
    const { arsivftpuser, arsivftppass, arsivftpip } = p.recordset[0] as { arsivftpuser: string; arsivftppass: string; arsivftpip: string };

    // 2) Arşiv satırlarını getir
    const reqSql = pool.request();
    reqSql.input('modulid', sql.VarChar(100), modulid);
    let sqlText = `
      SELECT ad, arsivftpklasor, modulkod, modulid, ftpad, arsivid,
             kayitgiristarih, guncellemetarih
      FROM sbr_arsiv WITH (NOLOCK)
      WHERE modulid = @modulid
    `;
    const ids: string[] = idsParam ? idsParam.split(',').map(s => s.trim()).filter(Boolean) : [];
    if (ids.length) {
      const placeholders: string[] = [];
      ids.forEach((id, idx) => {
        const key = `id${idx}`;
        placeholders.push(`@${key}`);
        reqSql.input(key, sql.VarChar(100), id);
      });
      sqlText += ` AND arsivid IN (${placeholders.join(',')})`;
    }
    sqlText += ` ORDER BY ISNULL(guncellemetarih, kayitgiristarih) DESC, arsivid DESC`;

    const list = await reqSql.query(sqlText);
    const rows = (list.recordset || []) as Array<{
      ad: string; arsivftpklasor: string; modulkod: string; modulid: string; ftpad: string; arsivid: string;
    }>;
    if (!rows.length) {
      return NextResponse.json({ error: 'Arşiv kaydı bulunamadı' }, { status: 404 });
    }

    // 3) ZIP stream hazırlığı
    const zipStream = new PassThrough();
    const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err: Error) => zipStream.destroy(err));
    archive.pipe(zipStream);

    // 4) FTP client kur
    const client = new ftp.Client(30000);
    client.ftp.verbose = false;
    await client.access({ host: arsivftpip, user: arsivftpuser, password: arsivftppass, secure: false });

    // 5) Her dosyayı sırayla zip'e ekle (stream)
    for (const row of rows) {
      const remotePath = `${row.arsivftpklasor}/${row.modulkod}/{${row.modulid}}/${row.ftpad}.sbr`.replace(/\\/g, '/');

      // Dosya adı: .pdf olarak
      const rawName = String(row.ad || 'arsiv');
      const withoutExt = rawName.replace(/\.[^./\\]+$/, '');
      const entryName = `${withoutExt}.pdf`;

      const fileStream = new PassThrough();
      archive.append(fileStream, { name: entryName });
      await client.downloadTo(fileStream, remotePath);
    }

    // 6) Bitir
    await archive.finalize();
    client.close();

    const webStream = Readable.toWeb(zipStream) as unknown as ReadableStream;
    const fileName = `arsiv_${modulid}.zip`;
    return new Response(webStream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[arsiv zip] error:', msg);
    return NextResponse.json({ error: 'Sunucu hatası', detail: process.env.NODE_ENV !== 'production' ? msg : undefined }, { status: 500 });
  }
}
