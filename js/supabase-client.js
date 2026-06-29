/* ============================================================
   JARA ∆ — Supabase Client
   js/supabase-client.js

   Single shared Supabase instance used across all pages.
   Import this file in every HTML page that needs Supabase.

   HOW TO FIND YOUR CREDENTIALS:
   1. Go to https://supabase.com
   2. Open your project
   3. Click "Project Settings" (gear icon, left sidebar)
   4. Click "API"
   5. Copy "Project URL" → paste as SUPABASE_URL
   6. Copy "anon public" key → paste as SUPABASE_ANON_KEY
============================================================ */

/* ==========================
   CHANGE THIS
   Replace both values below with your real Supabase credentials.
   Never share your service_role key — only use the anon key here.
========================== */
const SUPABASE_URL = "https://mowcugidiqjvccvdennk.supabase.co";
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vd2N1Z2lkaXFqdmNjdmRlbm5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NzUzOTgsImV4cCI6MjA5ODI1MTM5OH0.K-5I9OH8ATDNMLmMeLKZbnEQ_8VlSeYVqEqgSy8XcTk';

/* ============================================================
   Initialise and export the client.
   Every other JS file imports `window._supabase` from here.
============================================================ */
const { createClient } = supabase;
window._supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
