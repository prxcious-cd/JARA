/* ============================================================
   JARA ∆ — Explore Page  (profile-integrated)
   js/explore.js

   Replaces all placeholder profile data with real
   Supabase values for the logged-in user.

   Depends on:
     - window._supabase   (supabase-client.js)
     - window.JARAAuth    (auth-guard.js)
     - window.JARAProfile (jara-profile.js)

   TABLE OF CONTENTS
   1.  DOM refs
   2.  Skeleton helpers
   3.  Profile render
   4.  Listings (placeholder — Phase 3)
   5.  Error state
   6.  Init
============================================================ */

document.addEventListener('DOMContentLoaded', async () => {

  /* ==========================================================
     1. DOM REFS
  ========================================================== */

  const greetingName     = document.getElementById('greetingName');
  const greetingLabel    = document.getElementById('greetingLabel');
  const headerAvatar     = document.getElementById('headerAvatar');
  const headerAvatarImg  = document.getElementById('headerAvatarImg');
  const headerInitials   = document.getElementById('headerInitials');
  const verifiedBadge    = document.getElementById('verifiedBadge');
  const proBadge         = document.getElementById('proBadge');
  const foundingBadge    = document.getElementById('foundingBadge');
  const listingsGrid     = document.getElementById('listingsGrid');
  const exploreError     = document.getElementById('exploreError');


  /* ==========================================================
     2. SKELETON HELPERS
  ========================================================== */

  function skelOn(el)  { el?.classList.add('j-skel'); }
  function skelOff(el) { el?.classList.remove('j-skel'); }

  function showSkeletons() {
    skelOn(greetingName);
    skelOn(headerAvatar);
  }

  function hideSkeletons() {
    skelOff(greetingName);
    skelOff(headerAvatar);
  }


  /* ==========================================================
     3. PROFILE RENDER
     Fills every element that depends on profile data.
  ========================================================== */

  function renderProfile(profile) {
    /* ---- Greeting ---- */
    const firstName = JARAProfile.getFirstName(profile);
    const hour      = new Date().getHours();
    const greeting  = hour < 12 ? 'Good morning' :
                      hour < 17 ? 'Good afternoon' : 'Good evening';

    if (greetingLabel) greetingLabel.textContent = greeting + ',';
    if (greetingName)  greetingName.textContent  = firstName;

    /* ---- Avatar ---- */
    const avatarUrl = JARAProfile.getAvatarUrl(profile);

    if (avatarUrl && headerAvatarImg) {
      headerAvatarImg.src = avatarUrl;
      headerAvatarImg.alt = JARAProfile.getDisplayName(profile) + ' avatar';
      headerAvatarImg.removeAttribute('hidden');
      headerAvatarImg.style.display = '';
      if (headerInitials) headerInitials.setAttribute('hidden', '');
    } else if (headerInitials) {
      headerInitials.textContent = JARAProfile.getInitials(profile);
      headerInitials.removeAttribute('hidden');
      if (headerAvatarImg) headerAvatarImg.setAttribute('hidden', '');
    }

    /* ---- Verified badge ---- */
    if (verifiedBadge) {
      verifiedBadge.hidden = !profile.is_verified;
    }

    /* ---- PRO badge ---- */
    if (proBadge) {
      proBadge.hidden = !JARAProfile.isPro(profile);
    }

    /* ---- Founding Member badge ---- */
    if (foundingBadge) {
      foundingBadge.hidden = !JARAProfile.isFounder(profile);
    }

    /*
     Expose profile globally so jara-polish.js badge
     injection picks up the real founder state.
    */
    window.__JARA_IS_FOUNDER = JARAProfile.isFounder(profile);
    window.__JARA_IS_PRO     = JARAProfile.isPro(profile);
  }


  /* ==========================================================
     4. LISTINGS  (Phase 3 — placeholder until then)
  ========================================================== */

  function renderListingsPlaceholder() {
    /*
     FUTURE (Phase 3 — Listings Integration):
       const { data: listings } = await window._supabase
         .from('listings')
         .select('*')
         .order('created_at', { ascending: false })
         .limit(20);
       renderListingCards(listings);
    */

    // Leave existing placeholder cards in the DOM untouched.
    // Phase 3 will replace them.
  }


  /* ==========================================================
     5. ERROR STATE
  ========================================================== */

  function showError() {
    if (exploreError) {
      exploreError.removeAttribute('hidden');
    } else if (window.jaraError && listingsGrid) {
      window.jaraError(listingsGrid, {
        title:   "Couldn't load your profile",
        body:    'Please check your connection and try again.',
        onRetry: () => window.location.reload(),
      });
    }
  }


  /* ==========================================================
     6. INIT
  ========================================================== */

  async function init() {
    showSkeletons();

    try {
      /* ---- Load profile ---- */
      const profile = await JARAProfile.load();

      if (!profile) {
        /*
         Profile not found — could be a brand new user whose
         trigger hasn't fired yet, or a missing row.
         Send to onboarding to create/complete the profile.
        */
        console.warn('Explore: no profile found, redirecting to onboarding.');
        window.location.replace(JARAAuth.ROUTES.onboarding);
        return;
      }

      if (!profile.onboarding_complete) {
        /*
         FUTURE: Uncomment once onboarding_complete column is live.

           console.warn('Explore: onboarding incomplete, redirecting.');
           window.location.replace(JARAAuth.ROUTES.onboarding);
           return;
        */
      }

      hideSkeletons();
      renderProfile(profile);
      renderListingsPlaceholder();

    } catch (err) {
      console.error('Explore init error:', err.message);
      hideSkeletons();
      showError();
    }
  }

  init();

});
