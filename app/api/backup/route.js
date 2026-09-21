import { supabase } from "../../../lib/supabaseClient";

/**
 * Ruta de backup zilnic. Poate fi apelată:
 *  1) automat, de Vercel Cron (vezi vercel.json), care trimite
 *     Authorization: Bearer <CRON_SECRET>
 *  2) manual, cu același header, ca test.
 *
 * Copiază rândul "main" din shop_data într-un rând nou
 * în shop_data_daily_backups, cu data/ora exactă a salvării.
 */
export async function GET(request) {
  const authHeader = request.headers.get("authorization") || "";
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return Response.json({ error: "Neautorizat." }, { status: 401 });
  }

  // 1) citește starea curentă din shop_data (id = "main")
  const { data: row, error: readError } = await supabase
    .from("shop_data")
    .select("data")
    .eq("id", "main")
    .single();

  if (readError) {
    return Response.json({ error: readError.message }, { status: 500 });
  }

  // 2) scrie o copie nouă în shop_data_daily_backups
  const savedAt = new Date().toISOString();
  const { error: writeError } = await supabase
    .from("shop_data_daily_backups")
    .insert({ data: row ? row.data : null, saved_at: savedAt });

  if (writeError) {
    return Response.json({ error: writeError.message }, { status: 500 });
  }

  return Response.json({ ok: true, saved_at: savedAt });
}
