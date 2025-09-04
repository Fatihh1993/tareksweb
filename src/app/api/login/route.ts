import { NextResponse } from 'next/server';
import sql, { config as SqlConfig, ConnectionPool } from 'mssql';

// Simple connection caching for serverless/hot-reload environments
let pool: ConnectionPool | null = null;

function normalizeEnv(v?: string | undefined) {
  if (!v) return '';
  const trimmed = v.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseBool(v?: string | undefined, fallback = false) {
  if (!v) return fallback;
  const val = normalizeEnv(v).toLowerCase();
  return val === 'true' || val === '1' || val === 'yes';
}

function getConfigFromEnv(): SqlConfig | string {
  // Prefer DATABASE_URL or DB_CONNECTION_STRING if provided (connection string format)
  const dbUrl = normalizeEnv(process.env.DATABASE_URL || process.env.DB_CONNECTION_STRING);
  if (dbUrl) {
    return dbUrl; // return plain connection string so mssql.connect can accept it
  }

  // Otherwise build from components. These names are assumed — update your .env accordingly if different.
  const server = normalizeEnv(process.env.DB_HOST || process.env.DB_SERVER || 'localhost');
  const user = normalizeEnv(process.env.DB_USER || process.env.DB_USERNAME || '');
  const password = normalizeEnv(process.env.DB_PASSWORD || '');
  const database = normalizeEnv(process.env.DB_NAME || process.env.DB_DATABASE || '');
  const instance = normalizeEnv(process.env.DB_INSTANCE || process.env.DB_INSTANCE_NAME);

  const config: SqlConfig = {
    server,
    user,
    password,
    database,
    options: {
      encrypt: parseBool(process.env.DB_ENCRYPT, false),
      trustServerCertificate: parseBool(process.env.DB_TRUST_CERT, true),
    },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  } as unknown as SqlConfig;

  // If a named instance is provided, pass it to options.instanceName
  if (instance) {
    const opts = config.options as Record<string, unknown>;
    opts.instanceName = instance;
    // reassign back in case of structural typing
 
  config.options = opts as unknown as SqlConfig['options'];
  }

  return config;
}

async function getPool() {
  if (pool && pool.connected) return pool;
  const config = getConfigFromEnv();

  try {
    if (typeof config === 'string') {
      console.log('[login API] Using connection string from env (DATABASE_URL/DB_CONNECTION_STRING)');

      // Ensure connection string honors DB_ENCRYPT / DB_TRUST_CERT env vars when provided
      let connStr = config;
      const wantEncrypt = parseBool(process.env.DB_ENCRYPT, false);
      const wantTrust = parseBool(process.env.DB_TRUST_CERT, true);

      const lower = connStr.toLowerCase();
      if (wantTrust && !lower.includes('trustservercertificate')) {
        if (!connStr.endsWith(';')) connStr += ';';
        connStr += 'TrustServerCertificate=true;';
      }
      if (!wantEncrypt && !lower.includes('encrypt')) {
        if (!connStr.endsWith(';')) connStr += ';';
        connStr += 'Encrypt=false;';
      }

      pool = await sql.connect(connStr);
      console.log('[login API] DB connected');
      return pool;
    } else {
      const c = config as SqlConfig;
      const instanceName = (c.options && (c.options as Record<string, unknown>).instanceName) || '';
      console.log(`[login API] Connecting to SQL Server: server=${c.server} database=${c.database} user=${c.user} instance=${instanceName}`);
    }

    pool = await sql.connect(config as SqlConfig);
    console.log('[login API] DB connected');
    return pool;
  } catch (connectErr) {
    const msg = connectErr instanceof Error ? connectErr.message : String(connectErr);
    console.error('[login API] DB connection error:', msg);
    // rethrow to be handled by caller
    throw connectErr;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password } = body || {};

    if (!username || !password) {
      return NextResponse.json({ error: 'Eksik parametre' }, { status: 400 });
    }

    const pool = await getPool();

    // Uppercase password to match the .NET behaviour
    const passwordUpper = String(password).toUpperCase();

    // Log the username attempt (DO NOT log passwords)
    console.log('[login API] Login attempt for user:', username);

    const request = pool.request();
    request.input('user', sql.VarChar(128), username);
    request.input('sifre', sql.VarChar(50), passwordUpper);

    const query = `
      SELECT kullaniciid, kod, ad, engelle, muhasebekod,
        dbo.sky_kullanici_ok(@user,@sifre) AS kullaniciok, email, bilgeuser
      FROM sky_kullanici
      WHERE kod = @user
    `;

    let result;
    try {
      result = await request.query(query);
    } catch (qErr) {
      const qmsg = qErr instanceof Error ? qErr.message : String(qErr);
      console.error('[login API] Query error:', qmsg);
      if (process.env.NODE_ENV !== 'production') {
        return NextResponse.json({ error: 'Query hatası', detail: qmsg }, { status: 500 });
      }
      return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }

    if (result.recordset && result.recordset.length > 0) {
      const row = result.recordset[0];
      const ok = row.kullaniciok === true || row.kullaniciok === 1;

      if (ok) {
        // Return some user info (avoid returning sensitive fields)
        const user = {
          kullaniciid: row.kullaniciid,
          kod: row.kod,
          ad: row.ad,
          email: row.email,
          bilgeuser: row.bilgeuser,
        };

        return NextResponse.json({ success: true, user });
      }
    }

    return NextResponse.json({ success: false, message: 'Kullanıcı adı veya şifre hatalı' }, { status: 401 });
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
