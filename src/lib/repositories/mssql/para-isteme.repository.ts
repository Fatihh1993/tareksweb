// PARA İSTEME REPO – Bağlantı sorunlarını gidermek için güncellendi.
// Değişiklikler:
// 1. Çift yapılandırma: Önce DATABASE_URL parse edilir (uygulamadaki diğer repo’larla aynı user kullanılacak).
// 2. DB_* değişkenleri fallback.
// 3. Named instance + port fallback (instance çözülemezse port kullan).
// 4. Tek havuz (pool) – diğer kodlar ile çakışmayı azaltmak için connectionString tercih.
// 5. Ek loglar.

import { IParaIstemeRepository, CreateParaIstemeDto, ParaIstemeItem } from '../../interfaces/para-isteme-repository';
import { buildSdiTareksparaistemeListQuery } from '../../queries/sdi_tareksparaisteme-list-query';
import { buildSdiTareksparaistemeInsertQuery } from '../../queries/sdi_tareksparaisteme-insert-query';
import { buildSdiTareksparaistemeDeleteQuery } from '../../queries/sdi_tareksparaisteme-delete-query';
import sql from 'mssql';

let poolInstance: sql.ConnectionPool | null = null;

interface ParsedConn {
  server: string;
  instanceName?: string;
  database: string;
  user: string;
  password: string;
}

function parseConnectionString(cs: string): ParsedConn | null {
  // Ör: Server=192.168.0.100\TEST;Database=Sec2025;User Id=secwebuser;Password=xxx
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

  // 1) Önce DATABASE_URL varsa onu parse et
  let parsed: ParsedConn | null = null;
  if (process.env.DATABASE_URL) {
    parsed = parseConnectionString(process.env.DATABASE_URL);
  }

  const encrypt =
    process.env.DB_ENCRYPT === 'true' ||
    process.env.DB_ENCRYPT === '1';

  const user = parsed?.user || process.env.DB_USER;
  const password = parsed?.password || process.env.DB_PASSWORD || process.env.DB_PASS;
  const database = parsed?.database || process.env.DB_NAME;
  const server = parsed?.server || process.env.DB_HOST || 'localhost';
  const instanceName = parsed?.instanceName || process.env.DB_INSTANCE || undefined;
  const port = process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined;

  if (!user) throw new Error('DB user tanımsız (DB_USER veya DATABASE_URL içinde User Id)');
  if (!password) throw new Error('DB password tanımsız (DB_PASSWORD / DB_PASS veya DATABASE_URL)');
  if (!database) throw new Error('DB name tanımsız (DB_NAME veya DATABASE_URL)');
  if (!server) throw new Error('DB host tanımsız');

  const cfg: sql.config = {
    user,
    password,
    server,
    database,
    port, // port verildiyse instanceName genelde kullanılmaz
    options: {
      encrypt,
      trustServerCertificate: !encrypt,
      instanceName: port ? undefined : instanceName // port varsa instanceName bırak
    },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000, acquireTimeoutMillis: 30000, createTimeoutMillis: 30000, destroyTimeoutMillis: 5000 },
    connectionTimeout: 30000,
    requestTimeout: 30000
  };

  try {
    console.log(
      '[PARA_ISTEME][DB] connecting server=%s inst=%s port=%s user=%s enc=%s',
      cfg.server,
      cfg.options?.instanceName,   // <-- (cfg.options as any).instanceName kaldırıldı
      cfg.port,
      cfg.user,
      encrypt
    );
    poolInstance = await new sql.ConnectionPool(cfg).connect();
    console.log('[PARA_ISTEME][DB] connected');
  } catch (e) {
    console.error('[PARA_ISTEME][DB] connection error:', e);
    throw e;
  }
  return poolInstance;
}

interface CompiledQueryLike {
  sql: string;
  parameters: readonly unknown[];
}

function logSql(tag: string, compiled: CompiledQueryLike) {
  if (process.env.DEBUG_SQL === '1') {
    console.log(`[SQL:${tag}]`, compiled.sql);
    if (compiled.parameters?.length) console.log(`[SQL:${tag}:PARAMS]`, compiled.parameters);
  }
}

async function exec<T>(compiled: CompiledQueryLike, tag: string): Promise<T[]> {
  logSql(tag, compiled);
  const pool = await getPool();
  const req = pool.request();

  const sqlText = compiled.sql;
  const usesNumericStartAt1 = /@1\b/.test(sqlText); // @1, @2 ...
  const usesNumericStartAt0 = /@0\b/.test(sqlText); // @0, @1 ...
  const usesPStyle          = /@p0\b/i.test(sqlText); // @p0, @p1 ...

  compiled.parameters.forEach((p, i) => {
    let paramName: string;
    if (usesPStyle) {
      paramName = `p${i}`;          // @p0
    } else if (usesNumericStartAt1) {
      paramName = String(i + 1);    // @1
    } else if (usesNumericStartAt0) {
      paramName = String(i);        // @0
    } else {
      // Varsayılan: @p0 stiline düş
      paramName = `p${i}`;
    }
    req.input(paramName, p as unknown);
  });

  const result = await req.query<T>(compiled.sql);
  return result.recordset ?? [];
}

type ParaIstemeRawRow = {
  ParaIstemeId: string;
  Tutar: number | null;
  'Doviz Kod': string | null;
  Tip: number | null;
  'KDV Oran': number | null;
  'Tahakkuk No': string | null;
  'Kayit Kullanici': string | null;
  'Kayit Tarihi': Date | null;
  'Son Islem Kullanici': string | null;
  'Son Islem Tarihi': Date | null;
  TediyeId: string | null;
};

export class MssqlParaIstemeRepository implements IParaIstemeRepository {
  async listByMasterId(masterId: string): Promise<ParaIstemeItem[]> {
    const compiled = buildSdiTareksparaistemeListQuery(masterId);
    const rows = await exec<ParaIstemeRawRow>(compiled, 'PARA_ISTEME_LIST');
    return rows.map<ParaIstemeItem>(r => ({
      tareksparaistemeid: r.ParaIstemeId,
      tareksmasterid: masterId,
      tutar: r.Tutar,
      dovizkod: r['Doviz Kod'],
      tip: r.Tip,
      kdvoran: r['KDV Oran'],
      tahakkukno: r['Tahakkuk No'],
      insuser: r['Kayit Kullanici'],
      instime: r['Kayit Tarihi'],
      upduser: r['Son Islem Kullanici'],
      updtime: r['Son Islem Tarihi'],
      tediyeistemeid: r.TediyeId
    }));
  }

  async create(data: CreateParaIstemeDto): Promise<string> {
    const compiled = buildSdiTareksparaistemeInsertQuery({
      tareksmasterid: data.tareksmasterid,
      tutar: data.tutar,
      dovizkod: data.dovizkod,
      tip: data.tip,
      kdvoran: data.kdvoran,
      tahakkukno: data.tahakkukno,
      insuser: data.insuser
    });

    const rows = await exec<{ tareksparaistemeid: string }>(compiled, 'PARA_ISTEME_INSERT');
    const id = rows[0]?.tareksparaistemeid;
    if (!id) throw new Error('Para isteme kaydı oluşturulamadı (id alınamadı)');
    return id;
  }

  async delete(id: string): Promise<void> {
    const compiled = buildSdiTareksparaistemeDeleteQuery(id);
    await exec(compiled, 'PARA_ISTEME_DELETE');
  }
}