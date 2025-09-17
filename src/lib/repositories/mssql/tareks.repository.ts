import { getPool } from '../../db';
import { ITareksRepository } from '../../interfaces/tareks-repository';
import { TareksDetayRow, TareksSearchFilters, TareksSearchRow } from '../../models/tareks';
import { buildSdiTareksdetayViewQuery } from '../../queries/sdi_tareksdetay_view-query';
import * as mssql from 'mssql'; // added for parameter types

// Helper to execute compiled queries returned by query builders.
// Supports either a raw SQL string or an object like { sql: string, params?: [{ name, type, value }] }.
async function executeCompiledQuery<T = Record<string, unknown>>(
  request: mssql.Request,
  compiled:
    | string
    | {
        sql: string;
        params?: {
          name: string;
          type?: mssql.ISqlType | ((...args: unknown[]) => mssql.ISqlType);
          value?: unknown;
        }[];
      }
): Promise<mssql.IResult<T>> {
  if (typeof compiled === 'string') {
    return request.query<T>(compiled);
  }

  if (compiled && typeof compiled.sql === 'string') {
    if (Array.isArray(compiled.params)) {
      for (const p of compiled.params) {
        // Resolve type factories (e.g. () => mssql.Decimal(18,2)) and fallback to NVarChar
        let resolvedType: unknown = p.type ?? mssql.NVarChar;
        if (typeof resolvedType === 'function') {
          try {
            resolvedType = (resolvedType as (...args: unknown[]) => mssql.ISqlType)();
          } catch {
            // fallback if factory call fails
            resolvedType = mssql.NVarChar;
          }
        }

        // Normalize null/undefined to null so driver treats it as SQL NULL
        const val = p.value === undefined ? null : p.value;

        // Attach parameter
        request.input(
          p.name,
          resolvedType as mssql.ISqlType | ((...args: unknown[]) => mssql.ISqlType),
          val
        );
      }
    }
    return request.query<T>(compiled.sql);
  }

  throw new Error('Invalid compiled query');
}

export class MssqlTareksRepository implements ITareksRepository {
  async search(filters: TareksSearchFilters): Promise<TareksSearchRow[]> {
    const pool = await getPool();
    const request = pool.request();

    const limit = filters.limit ?? 500;
    const term = filters.term?.trim() || undefined;
    const durum = filters.durum?.trim() || undefined;

    // Build safe parameterized SQL (avoid compiled placeholder mismatches)
    let sql = `SELECT TOP (@limit) * FROM sdi_tareksarama_view WHERE 1=1`;
    request.input('limit', mssql.Int, limit);

    if (term) {
      const likeTerm = `%${term}%`;
      sql += ` AND (
        musteriad LIKE @term
        OR referansno LIKE @term
        OR subeadi LIKE @term
      )`;
      request.input('term', mssql.NVarChar, likeTerm);
    }

    if (durum) {
      sql += ` AND durum = @durum`;
      request.input('durum', mssql.NVarChar, durum);
    }

    // removed ORDER BY instime because the view does not contain that column
    sql += `;`;

    const result = await request.query(sql);
    return result.recordset || [];
  }

  async getDetay(tareksMasterId: string): Promise<TareksDetayRow[]> {
    const pool = await getPool();
    const request = pool.request();

    const sql = `
      SELECT *
      FROM sdi_tareksdetay_view
      WHERE tareksmasterid = @id
    `;
    request.input('id', mssql.UniqueIdentifier, tareksMasterId);

    const result = await request.query<TareksDetayRow>(sql);
    return result.recordset || [];
  }
}
