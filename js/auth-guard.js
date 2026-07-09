/* ============================================================
   JARA ∆ — Auth Guard  (v1)
   js/auth-guard.js

   Central authentication module for JARA.
   Loaded on every protected page before page-specific scripts.

   EXPORTS (on window.JARAAuth):
     requireAuth(options?)      — redirect to login if not signed in
     redirectIfLoggedIn(dest?)  — redirect away from auth pages if signed in
     getCurrentUser()           — returns { session, user, profile } or null
     getProfile()               — fetch the current user's profile row
     signOut()                  — sign out and redirect to login
     onAuthChange(callback)     — subscribe to auth state changes

   USAGE:
     Protected page:
       <script src="../js/supabase-client.js"></script>
       <script src="../js/auth-guard.js"></script>
       <script>
         JARAAuth.requireAuth().then(({ user, profile }) => {
           // page-specific code using real user data
         });
       </script>

     Auth page (login / signup):
       <script src="../js/supabase-client.js"></script>
       <script src="../js/auth-guard.js"></script>
       <script>
         JARAAuth.redirectIfLoggedIn();
       </script>

   TABLE OF CONTENTS
   1.  Constants & config
   2.  Internal helpers
   3.  requireAuth()
   4.  redirectIfLoggedIn()
   5.  getCurrentUser()
   6.  getProfile()
   7.  signOut()
   8.  onAuthChange()
   9.  Admin guard
   10. Export
============================================================ */

(function () {
  'use strict';

  /* ----------------------------------------------------------
     Wait for Supabase client to be ready.
     supabase-client.js sets window._supabase.
  ---------------------------------------------------------- */
  function getClient() {
    if (!window._supabase) {
      console.error('JARA Auth: window._supabase is not defined. ' +
        'Ensure supabase-client.js is loaded before auth-guard.js.');
      return null;
    }
    return window._supabase;
  }


  /* ==========================================================
     1. CONSTANTS & CONFIG
  ========================================================== */

  /*
   Route groups.
   Paths are matched against window.location.pathname using
   String.prototype.includes() so they work on any hosting
   subdirectory (e.g. /jara/profile/index.html).
  */
  const PROTECTED_PATHS = [
    '/profile/',
    '/sell/',
    '/activity/',
    '/premium/',
    '/admin/',
    '/onboarding/',
    '/listing/',
    '/store/',
    '/explore/',
    '/search/',
  ];

  const AUTH_ONLY_PATHS = [
    '/auth/login',
    '/auth/signup',
  ];

  /*
   Where to send users in various situations.
   These are relative to the site root.
  */
  const ROUTES = {
    login:    '/auth/login.html',
    explore:  '/explore/index.html',
    onboarding: '/onboarding/index.html',
  };


  /* ==========================================================
     2. INTERNAL HELPERS
  ========================================================== */

  /**
   * Resolve the correct URL regardless of deployment path.
   * Works for:
   *   / (custom domain)           → /auth/login.html
   *   /jara/ (GitHub Pages)       → /jara/auth/login.html
   */
  function resolveUrl(route) {
    // Detect repo subfolder, e.g. /jara/
    const path  = window.location.pathname;
    const match = path.match(/^(\/[^/]+\/)/);

    if (match) {
      const segment = match[1].replace(/\//g, '');
      const pageFolders = [
        'auth', 'admin', 'premium', 'explore', 'search', 'sell',
        'activity', 'profile', 'store', 'listing', 'onboarding', 'pages',
      ];
      if (!pageFolders.includes(segment)) {
        // The first segment is a repo name, e.g. /jara/
        return match[1].replace(/\/$/, '') + route;
      }
    }

    return route;
  }

  /**
   * Redirect to a JARA route.
   * Uses window.location.replace so the redirect is not added
   * to browser history (prevents back-button loops).
   */
  function redirect(route) {
    window.location.replace(resolveUrl(route));
  }

  /**
   * Check if the current page is within a given path group.
   */
  function currentPathIncludes(pathList) {
    const current = window.location.pathname;
    return pathList.some(p => current.includes(p));
  }

  /**
   * Show or hide the page body.
   * Protected pages start with body hidden (via a CSS class or
   * inline style) to prevent a flash of protected content.
   * Call revealPage() once auth is confirmed.
   */
  function revealPage() {
    document.documentElement.classList.remove('jara-auth-loading');
    document.body.style.visibility = '';
    document.body.style.opacity    = '';
  }

  function hidePage() {
    // Body is invisible until auth check completes.
    // CSS in jara-polish.css handles the initial hidden state
    // via .jara-auth-loading on <html>.
    document.body.style.visibility = 'hidden';
    document.body.style.opacity    = '0';
  }


  /* ==========================================================
     3. requireAuth(options?)
     ──────────────────────────────────────────────────────────
     Call at the top of any protected page.

     Options:
       adminOnly {boolean} — also check is_admin on profile
       onboarding {boolean} — skip onboarding_complete check

     Returns a Promise that resolves with:
       { session, user, profile }

     If the user is not signed in, they are redirected to login
     and the promise never resolves (page is navigating away).
  ========================================================== */

  async function requireAuth(options = {}) {
    const sb = getClient();
    if (!sb) { redirect(ROUTES.login); return; }

    hidePage();

    try {
      // ── Get current session from Supabase ──────────────────
      const { data: { session }, error: sessionError } = await sb.auth.getSession();

      if (sessionError) {
        console.error('JARA Auth: getSession error:', sessionError.message);
        redirect(ROUTES.login);
        return;
      }

      if (!session) {
        // No active session — send to login
        redirect(ROUTES.login);
        return;
      }

      const user = session.user;

      // ── Fetch the user's profile row ───────────────────────
      /*
       FUTURE: When the profiles table has additional columns
       (e.g. is_admin, onboarding_complete, account_type),
       expand the select string here:
         .select('id, jara_id, full_name, avatar_url, is_admin,
                  onboarding_complete, account_type, is_premium,
                  is_founding_member, school_id, created_at')
      */
      const profile = await getProfile(user.id);

      // ── Admin-only pages ───────────────────────────────────
      if (options.adminOnly) {
        /*
         FUTURE: Uncomment once is_admin column exists:

           if (!profile?.is_admin) {
             redirect(ROUTES.explore);
             return;
           }
        */

        // Placeholder: allow access while is_admin column is pending.
        // Remove this comment and enable the block above before launch.
        console.warn('JARA Auth: adminOnly guard is in placeholder mode.');
      }

      // ── Onboarding check ───────────────────────────────────
      if (!options.skipOnboarding) {
        /*
         FUTURE: Redirect incomplete profiles to onboarding:

           if (profile && profile.onboarding_complete === false) {
             const currentPath = window.location.pathname;
             const alreadyOnboarding = currentPath.includes('/onboarding/');
             if (!alreadyOnboarding) {
               redirect(ROUTES.onboarding);
               return;
             }
           }
        */
      }

      // ── Auth confirmed — show page ─────────────────────────
      revealPage();

      return { session, user, profile };

    } catch (err) {
      console.error('JARA Auth: requireAuth unexpected error:', err.message);
      revealPage();  // Show page even on unexpected error to avoid blank screen
      redirect(ROUTES.login);
    }
  }


  /* ==========================================================
     4. redirectIfLoggedIn(destination?)
     ──────────────────────────────────────────────────────────
     Call on login.html and signup.html.
     If the user is already signed in, redirect them away.
     destination defaults to ROUTES.explore.
  ========================================================== */

  async function redirectIfLoggedIn(destination) {
    const sb = getClient();
    if (!sb) return;

    try {
      const { data: { session } } = await sb.auth.getSession();

      if (session) {
        // User is already logged in — no need to be on auth page
        redirect(destination || ROUTES.explore);
      }

      // Not logged in — stay on the page, reveal it
      revealPage();

    } catch (err) {
      console.error('JARA Auth: redirectIfLoggedIn error:', err.message);
      revealPage();
    }
  }


  /* ==========================================================
     5. getCurrentUser()
     ──────────────────────────────────────────────────────────
     Returns { session, user, profile } for the current user,
     or null if not signed in.

     Non-redirecting — safe to call anywhere.
  ========================================================== */

  async function getCurrentUser() {
    const sb = getClient();
    if (!sb) return null;

    try {
      const { data: { session }, error } = await sb.auth.getSession();

      if (error || !session) return null;

      const user    = session.user;
      const profile = await getProfile(user.id);

      return { session, user, profile };

    } catch (err) {
      console.error('JARA Auth: getCurrentUser error:', err.message);
      return null;
    }
  }


  /* ==========================================================
     6. getProfile(userId?)
     ──────────────────────────────────────────────────────────
     Fetch the profile row for the given userId.
     If userId is omitted, uses the current session user.

     Returns the profile object or null.

     FUTURE: Expand the select columns as the schema grows.
  ========================================================== */

  async function getProfile(userId) {
    const sb = getClient();
    if (!sb) return null;

    try {
      let uid = userId;

      if (!uid) {
        const { data: { session } } = await sb.auth.getSession();
        if (!session) return null;
        uid = session.user.id;
      }

      /*
       FUTURE: Expand selected columns as the profiles table grows.

       Current minimal set — enough for auth decisions.
       Add more fields as features are connected:
         jara_id, full_name, avatar_url, account_type,
         is_premium, is_founding_member, is_admin,
         onboarding_complete, school_id, bio,
         whatsapp_number, phone_number, created_at
      */
      const { data: profile, error } = await sb
        .from('profiles')
        .select(`
          id,
          jara_id,
          full_name,
          avatar_url,
          account_type,
          is_premium,
          is_founding_member,
          onboarding_complete
        `)
        .eq('id', uid)
        .single();

      if (error) {
        // PGRST116 = row not found (profile may not exist yet — new user)
        if (error.code !== 'PGRST116') {
          console.error('JARA Auth: getProfile error:', error.message);
        }
        return null;
      }

      return profile;

    } catch (err) {
      console.error('JARA Auth: getProfile unexpected error:', err.message);
      return null;
    }
  }


  /* ==========================================================
     7. signOut()
     ──────────────────────────────────────────────────────────
     Sign the current user out of Supabase Auth,
     clear any local state, and redirect to login.
  ========================================================== */

  async function signOut() {
    const sb = getClient();
    if (!sb) {
      redirect(ROUTES.login);
      return;
    }

    try {
      const { error } = await sb.auth.signOut();

      if (error) {
        console.error('JARA Auth: signOut error:', error.message);
        // Redirect anyway — better to clear the page than leave a broken state
      }

      /*
       FUTURE: Clear any app-level caches or state here before redirecting.
       e.g. clear localStorage keys used for recent searches, viewed items, etc.

         localStorage.removeItem('jara_viewed');
         localStorage.removeItem('jara_recent_searches');
      */

    } catch (err) {
      console.error('JARA Auth: signOut unexpected error:', err.message);
    }

    redirect(ROUTES.login);
  }


  /* ==========================================================
     8. onAuthChange(callback)
     ──────────────────────────────────────────────────────────
     Subscribe to Supabase auth state changes.
     callback receives (event, session).

     Events:
       SIGNED_IN          — user signed in
       SIGNED_OUT         — user signed out
       TOKEN_REFRESHED    — access token refreshed
       USER_UPDATED       — user metadata updated
       PASSWORD_RECOVERY  — triggered from reset-password link

     Returns the Supabase subscription object.
     Call subscription.unsubscribe() to clean up.
  ========================================================== */

  function onAuthChange(callback) {
    const sb = getClient();
    if (!sb) return null;

    const { data: subscription } = sb.auth.onAuthStateChange((event, session) => {
      /*
       FUTURE: Global response to auth events.
       For example, when SIGNED_OUT is detected on any page,
       you could clear user state or show a "Session ended" toast.

         if (event === 'SIGNED_OUT') {
           window.jaraToast?.('You have been signed out.');
         }
      */
      callback(event, session);
    });

    return subscription;
  }


  /* ==========================================================
     9. ADMIN GUARD  (convenience wrapper)
     ──────────────────────────────────────────────────────────
     Shorthand for requireAuth({ adminOnly: true }).
     Used exclusively by admin/index.html.
  ========================================================== */

  async function requireAdmin() {
    return requireAuth({ adminOnly: true });
  }


  /* ==========================================================
     10. EXPORT
     Attach everything to window.JARAAuth so any page script
     can call it without module bundlers.
  ========================================================== */

  window.JARAAuth = {
    requireAuth,
    requireAdmin,
    redirectIfLoggedIn,
    getCurrentUser,
    getProfile,
    signOut,
    onAuthChange,

    // Expose route constants so page scripts can use them
    ROUTES,
  };

  /*
   Auto-hide body on protected paths immediately to prevent
   a flash of protected content before the async auth check runs.
   The body is revealed by requireAuth() or redirectIfLoggedIn().
  */
  if (currentPathIncludes(PROTECTED_PATHS)) {
    hidePage();
  }

})();
