import type { CompiledQuery } from 'kysely';
import type mssql from 'mssql';

function applyParameters(request: mssql.Request, compiled: CompiledQuery<unknown>): string {
  let sql = compiled.sql;
  const params = compiled.parameters ?? [];

  params.forEach((value, idx) => {
    const paramName = `p${idx + 1}`;
    request.input(paramName, value);
    const pattern = new RegExp(`@${idx + 1}(?!\\d)`, 'g');
    sql = sql.replace(pattern, `@${paramName}`);
  });

  return sql;
}

export async function executeCompiledQuery<T>(request: mssql.Request, compiled: CompiledQuery<T>) {
  const sql = applyParameters(request, compiled);
  return request.query<T>(sql);
}
