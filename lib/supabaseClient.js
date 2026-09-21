import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Toate datele aplicatiei traiesc intr-un singur rand, in tabela "shop_data",
// sub id-ul "main", ca un obiect JSON: { materiale: [...], masini: [...] }

const ROW_ID = "main";

function countItems(d) {
  return (d?.materiale?.length || 0) + (d?.masini?.length || 0);
}

export async function loadFleetData() {
  const { data, error } = await supabase
    .from("shop_data")
    .select("data")
    .eq("id", ROW_ID)
    .single();

  // Daca citirea esueaza, aruncam eroarea (NU returnam date goale),
  // ca aplicatia sa nu ajunga sa salveze o stare goala peste cea reala.
  if (error) throw error;
  return data?.data || { materiale: [], masini: [] };
}

export async function saveFleetData(newData) {
  // Protectia 1: structura trebuie sa fie completa (ambele liste existente)
  if (!newData || !Array.isArray(newData.materiale) || !Array.isArray(newData.masini)) {
    throw new Error("Salvare blocată: datele nu sunt complete. Reîncarcă pagina.");
  }

  // Protectia 2: nu suprascriem date existente cu o stare complet goala
  const { data: current, error: readError } = await supabase
    .from("shop_data")
    .select("data")
    .eq("id", ROW_ID)
    .single();

  if (readError) {
    throw new Error("Salvare blocată: nu am putut verifica datele existente. " + readError.message);
  }

  if (countItems(newData) === 0 && countItems(current?.data) > 0) {
    throw new Error("Salvare blocată: ai încerca să suprascrii datele existente cu o stare goală.");
  }

  const { error } = await supabase
    .from("shop_data")
    .update({ data: newData, updated_at: new Date().toISOString() })
    .eq("id", ROW_ID);

  if (error) throw error;

  // Backup la fiecare inregistrare/salvare. Nu blocam salvarea principala
  // daca acest backup esueaza - doar semnalam in consola.
  const { error: backupError } = await supabase
    .from("shop_data_save_backups")
    .insert({ data: newData, saved_at: new Date().toISOString() });

  if (backupError) {
    console.error("Backup la salvare a esuat:", backupError.message);
  }
}
