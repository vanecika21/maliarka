import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Toate datele aplicatiei traiesc intr-un singur rand, in tabela "shop_data",
// sub id-ul "main", ca un obiect JSON: { materiale: [...], masini: [...] }

const ROW_ID = "main";

export async function loadFleetData() {
  const { data, error } = await supabase
    .from("shop_data")
    .select("data")
    .eq("id", ROW_ID)
    .single();

  if (error) throw error;
  return data?.data || { materiale: [], masini: [] };
}

export async function saveFleetData(newData) {
  const { error } = await supabase
    .from("shop_data")
    .update({ data: newData, updated_at: new Date().toISOString() })
    .eq("id", ROW_ID);

  if (error) throw error;
}
