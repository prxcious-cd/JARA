/* ============================================================
   JARA ∆ — Supabase Client
   js/supabase-client.js

   Initialises the Supabase client once and exposes it as
   window._supabase for use across all page scripts.

   Load this as the FIRST script on every page.
============================================================ */

(function () {
  'use strict';

  /* ----------------------------------------------------------
     CONFIGURATION
     Replace these with your real Supabase project values.
     Find them in: Supabase Dashboard → Settings → API
  ---------------------------------------------------------- */
  const SUPABASE_URL      = 'https://mowcugidiqjvccvdennk.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vd2N1Z2lkaXFqdmNjdmRlbm5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NzUzOTgsImV4cCI6MjA5ODI1MTM5OH0.K-5I9OH8ATDNMLmMeLKZbnEQ_8VlSeYVqEqgSy8XcTk';

  if (!SUPABASE_URL || SUPABASE_URL.includes('YOUR_PROJECT')) {
    console.error('JARA: Supabase URL is not configured. ' +
      'Edit js/supabase-client.js and set your project URL and anon key.');
  }

  /* ----------------------------------------------------------
     INITIALISE CLIENT
  ---------------------------------------------------------- */
  window._supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession:    true,
      autoRefreshToken:  true,
      detectSessionInUrl: true,
    },
  });

})();
