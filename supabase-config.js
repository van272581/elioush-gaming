/* Elioush Gaming - configuration publique Supabase.
   La clé publishable/anon est conçue pour le frontend.
   Ne jamais ajouter ici la service_role key ou un secret Discord. */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

export const SUPABASE_URL = "https://llbvjbiytsgofeyvbscx.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_9mzhWeSHqcip5Go1deK-Yg_qoJzhccn";
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
