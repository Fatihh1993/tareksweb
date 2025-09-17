import { getQueryBuilder } from './helpers/kysely-compiler';
import * as mssql from 'mssql'; // added for explicit param types

export interface SdiTareksparaistemeInsertValues {
  // changed: use the DB param name here so callers and query params match
  tareksmasterid: string;
  tutar?: number | null;
  dovizkod?: string | null;
  tip?: number | null;
  kdvoran?: number | null;
  tahakkukno?: string | null;
  insuser?: string | null;
}

export function buildSdiTareksparaistemeInsertQuery(values: SdiTareksparaistemeInsertValues & { masterId?: string }) {
  const masterId = values.tareksmasterid ?? values.masterId;
  if (!masterId) throw new Error('Missing required parameter: tareksmasterid');

  const sql = `
DECLARE @newid TABLE(id uniqueidentifier);

INSERT INTO sdi_tareksparaisteme
( tareksmasterid, tutar, dovizkod, tip, kdvoran, tahakkukno, insuser, instime )
OUTPUT inserted.tareksparaistemeid INTO @newid(id)
VALUES ( @tareksmasterid, @tutar, @dovizkod, @tip, @kdvoran, @tahakkukno, @insuser, GETDATE() );

SELECT id AS tareksparaistemeid FROM @newid;
`;

  const params = [
    { name: 'tareksmasterid', type: mssql.UniqueIdentifier, value: masterId },
    { name: 'tutar', type: () => mssql.Decimal(18, 2), value: values.tutar ?? 0 },
    { name: 'dovizkod', type: mssql.NVarChar, value: values.dovizkod ?? 'TL' },
    { name: 'tip', type: mssql.Int, value: values.tip ?? null },
    { name: 'kdvoran', type: () => mssql.Decimal(18, 2), value: values.kdvoran ?? null },
    { name: 'tahakkukno', type: mssql.NVarChar, value: values.tahakkukno ?? null },
    { name: 'insuser', type: mssql.NVarChar, value: values.insuser ?? null },
  ];

  // return both keys for compatibility with different execute helpers
  return { sql, params, parameters: params };
}
