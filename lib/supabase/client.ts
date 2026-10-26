import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    SUPABASE_URL,
    SUPABASE_KEY,
  );
}
