// Basit (Kysely kullanmadan) derlenmiş sorgu objesi – @1 placeholder kullanıyoruz.
export function buildSdiTareksparaistemeListQuery(masterId: string) {
  return {
    sql: `
      SELECT
        tareksparaistemeid AS ParaIstemeId,
        tutar              AS Tutar,
        dovizkod           AS [Doviz Kod],
        tip                AS Tip,
        kdvoran            AS [KDV Oran],
        tahakkukno         AS [Tahakkuk No],
        insuser            AS [Kayit Kullanici],
        instime            AS [Kayit Tarihi],
        upduser            AS [Son Islem Kullanici],
        updtime            AS [Son Islem Tarihi],
        tediyeistemeid     AS TediyeId
      FROM sdi_tareksparaisteme
      WHERE tareksmasterid = @1
      ORDER BY instime DESC
    `,
    parameters: [masterId] as const
  };
}
