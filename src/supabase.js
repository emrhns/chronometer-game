import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://zhkadivgxavkhbxfrmbn.supabase.co";

const supabaseKey = "sb_publishable_y6cafsOT9x_-OXhPWDkl7Q_fRHIH8zf";

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);
