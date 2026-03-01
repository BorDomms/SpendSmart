// public/supabase.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js'

// Replace these with your actual values
const supabaseUrl = 'https://yusppfdhsmvxfilnmlzj.supabase.co'  // ← Paste your URL here (with https://)
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1c3BwZmRoc212eGZpbG5tbHpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNDMxMDAsImV4cCI6MjA4NzkxOTEwMH0.qoY5Mx7e0QLtsDcYpSYUSC3lF0oLXohV_Na2ZZA4e0E' // ← Paste your anon public key here

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage
    }
})