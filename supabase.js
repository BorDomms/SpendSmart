// public/supabase.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js'

// ✅ Correct URL (no /rest/v1/ at the end)
const supabaseUrl = 'https://jjdkqrgfdiqgqpcjslwm.supabase.co'  
// ✅ Correct Anon Key (copy-paste what you just sent)
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqZGtxcmdmZGlxZ3FwY2pzbHdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3OTMxMjYsImV4cCI6MjA5ODM2OTEyNn0.LEKw5utWg6krgI4PPDihd5GGZ6ldIO8GZGIcJjEn89A'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage
    }
})