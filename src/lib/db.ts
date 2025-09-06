import sql, { config as SqlConfig, ConnectionPool } from 'mssql';

// normalize and helper functions copied from login API consolidated here
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

let pool: ConnectionPool | null = null;

export function getConfigFromEnv(): SqlConfig | string {
  const dbUrl = normalizeEnv(process.env.DATABASE_URL || process.env.DB_CONNECTION_STRING);
  if (dbUrl) return dbUrl;

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

  if (instance) {
    const opts = config.options as Record<string, unknown>;
    opts.instanceName = instance;
    config.options = opts as unknown as SqlConfig['options'];
  }

  return config;
}

export async function getPool() {
  if (pool && pool.connected) return pool;
  const config = getConfigFromEnv();

  try {
    if (typeof config === 'string') {
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
      return pool;
    }

    pool = await sql.connect(config as SqlConfig);
    return pool;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[db] connection error:', message);
    throw err;
  }
}
