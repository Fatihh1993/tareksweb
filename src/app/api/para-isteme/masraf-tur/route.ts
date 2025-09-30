import { NextRequest, NextResponse } from 'next/server';
import sql from 'mssql';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let poolInstance: sql.ConnectionPool | null = null;

interface ParsedConn {
  server: string;
  instanceName?: string;
  database: string;
  user: string;
  password: string;
}

function parseConnectionString(cs: string): ParsedConn | null {
  const parts = Object.fromEntries(
    cs.split(';')
      .map(p => p.trim())
      .filter(Boolean)
      .map(p => {
        const [k, ...rest] = p.split('=');
        return [k.toLowerCase(), rest.join('=').trim()];
      })
  );
  if (!parts.server || !parts.database) return null;
  let server = parts.server;
  let instanceName: string | undefined;
  if (server.includes('\\')) {
    const [host, inst] = server.split('\\');
    server = host;
    instanceName = inst;
  }
  return {
    server,
    instanceName,
    database: parts.database,
    user: parts['user id'] ?? parts.user,
    password: parts.password
  };
}

async function getPool(): Promise<sql.ConnectionPool> {
  if (poolInstance) return poolInstance;

  const parsed = process.env.DATABASE_URL ? parseConnectionString(process.env.DATABASE_URL) : null;
  const encrypt = process.env.DB_ENCRYPT === 'true' || process.env.DB_ENCRYPT === '1';

  const cfg: sql.config = {
    user: parsed?.user || process.env.DB_USER,
    password: parsed?.password || process.env.DB_PASSWORD || process.env.DB_PASS,
    server: parsed?.server || process.env.DB_HOST || 'localhost',
    database: parsed?.database || process.env.DB_NAME,
    options: {
      encrypt,
      trustServerCertificate: !encrypt,
      instanceName: parsed?.instanceName || process.env.DB_INSTANCE || undefined
    },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    requestTimeout: 30000,
    connectionTimeout: 30000
  };

  poolInstance = await new sql.ConnectionPool(cfg).connect();
  return poolInstance;
}

type Row = { kdvoran: number; tarekskayittip: number; adi: string };

export async function GET(_req: NextRequest) {
  try {
    const pool = await getPool();
    const result = await pool.request().query<Row>(`
      SELECT kdvoran, tarekskayittip, adi
      FROM sgm_masraftur
      WHERE tarekskayittip IN (0,1,2)
      ORDER BY tarekskayittip
    `);
    return NextResponse.json({ success: true, data: result.recordset });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}