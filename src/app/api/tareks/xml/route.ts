import { NextRequest } from "next/server";
// import { getPool, sql } from "@/lib/db"; // <-- eski
import { getPool } from "@/lib/db";        // sadece getPool sizin helper’dan
import sql from "mssql";                   // sql tiplerini buradan alın

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const masterId = url.searchParams.get("masterId");
  if (!masterId) {
    return new Response(JSON.stringify({ error: "masterId gerekli" }), { status: 400 });
  }

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("tareksmasterid", sql.VarChar(100), masterId)
      .query("SELECT dbo.ufnGetTareksXml(@tareksmasterid) AS XmlData");

    const row = result.recordset?.[0] ?? {};
    const xml = String(row.XmlData ?? row.xmldata ?? "");

    if (!xml.trim()) {
      return new Response(JSON.stringify({ error: "XML verisi alınamadı" }), { status: 404 });
    }

    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Sunucu hatası" }), { status: 500 });
  }
}