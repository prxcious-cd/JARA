/* ============================================================
   JARA ∆ — Store Page  (profile-integrated)
   js/store.js

   Loads the store owner's profile from Supabase and
   renders it on the store page.

   Public page — guests can view stores without logging in.
   getCurrentUser() is used (non-redirecting).

   Depends on:
     - window._supabase   (supabase-client.js)
     - window.JARAAuth    (auth-guard.js)
     - window.JARAProfile (jara-profile.js)

   TABLE OF CONTENTS
   1.  DOM refs
   2.  Detect whose store this is
   3.  Load store owner profile
   4.  Render store
   5.  Guest / owner UI
   6.  Error state
   7.  Init
============================================================ */

document.addEventListener('DOMContentLoaded', async () => {

  /* ==========================================================
     1. DOM REFS
  ========================================================== */

  const storeLogoImg      = document.getElementById('storeLogoImg');
  const storeLogoInitials = document.getElementById('storeLogoInitials');
  const storeName         = document.getElementById('storeName');
  const storeCategory     = document.getElementById('storeCategory');
  const storeDesc         = document.getElementById('storeDesc');
  const storeLocation     = document.getElementById('storeLocation');
  const storeWhatsapp     = document.getElementById('storeWhatsapp');
  const storePhone        = document.getElementById('storePhone');
  const storeVerified     = document.getElementById('storeVerifiedBadge');
  const storePro          = document.getElementById('storeProBadge');
  const storeFounding     = document.getElementById('storeFoundingBadge');
  const editStoreBtn      = document.getElementById('editStoreBtn');
  const storeError        = document.getElementById('storeError');


  /* ==========================================================
     2. DETECT WHOSE STORE THIS IS
     Store pages are accessed via ?id=USER_ID in the URL.
     If no id param, assume it's the logged-in user's own store.
  ========================================================== */

  const params      = new URLSearchParams(window.location.search);
  const storeUserId = params.get('id') || null;


  /* ==========================================================
     3. LOAD STORE OWNER PROFILE
  ========================================================== */

  async function loadStoreProfile(userId) {
    const sb = window._supabase;
    if (!sb) return null;

    if (!userId) return null;

    try {
      /*
       FUTURE: Join with listings count, reviews average etc.
       FUTURE: Check if viewing user has saved this store.
      */
      const { data: profile, error } = await sb
        .from('profiles')
        .select(`
          id,
          jara_id,
          full_name,
          username,
          avatar_url,
          account_type,
          bio,
          school,
          location,
          business_name,
          business_category,
          business_description,
          phone,
          whatsapp,
          website,
          is_verified,
          is_founding_member,
          is_premium,
          pro_status,
          created_at
        `)
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Store: loadStoreProfile error:', error.message);
        return null;
      }

      return profile;

    } catch (err) {
      console.error('Store: loadStoreProfile unexpected error:', err.message);
      return null;
    }
  }


  /* ==========================================================
     4. RENDER STORE
  ========================================================== */

  function renderStore(profile) {
    /* ---- Logo ---- */
    const url = JARAProfile.getAvatarUrl(profile);
    if (url && storeLogoImg) {
      storeLogoImg.src = url;
      storeLogoImg.alt = JARAProfile.getDisplayName(profile);
      storeLogoImg.removeAttribute('hidden');
      if (storeLogoInitials) storeLogoInitials.setAttribute('hidden', '');
    } else if (storeLogoInitials) {
      storeLogoInitials.textContent = JARAProfile.getInitials(profile);
      storeLogoInitials.removeAttribute('hidden');
      if (storeLogoImg) storeLogoImg.setAttribute('hidden', '');
    }

    /* ---- Name ---- */
    if (storeName) {
      storeName.textContent = JARAProfile.getDisplayName(profile) || 'JARA Business';
    }

    /* ---- Category ---- */
    if (storeCategory) {
      storeCategory.textContent = profile.business_category || '';
      storeCategory.hidden = !profile.business_category;
    }

    /* ---- Description ---- */
    if (storeDesc) {
      storeDesc.textContent = profile.business_description || profile.bio || '';
      storeDesc.hidden = !(profile.business_description || profile.bio);
    }

    /* ---- Location ---- */
    if (storeLocation) {
      storeLocation.textContent = profile.location || '';
      storeLocation.hidden = !profile.location;
    }

    /* ---- Contact links ---- */
    if (storeWhatsapp) {
      if (profile.whatsapp) {
        const num = profile.whatsapp.replace(/\D/g, '');
        storeWhatsapp.href = `https://wa.me/${num}`;
        storeWhatsapp.removeAttribute('hidden');
      } else {
        storeWhatsapp.setAttribute('hidden', '');
      }
    }

    if (storePhone) {
      if (profile.phone) {
        storePhone.href = `tel:${profile.phone}`;
        storePhone.removeAttribute('hidden');
      } else {
        storePhone.setAttribute('hidden', '');
      }
    }

    /* ---- Badges ---- */
    if (storeVerified)  storeVerified.hidden  = !profile.is_verified;
    if (storePro)       storePro.hidden        = !JARAProfile.isPro(profile);
    if (storeFounding)  storeFounding.hidden   = !JARAProfile.isFounder(profile);

    /* ---- Page title ---- */
    const name = JARAProfile.getDisplayName(profile);
    if (name) document.title = `${name} — JARA ∆`;
  }


  /* ==========================================================
     5. GUEST / OWNER UI
     Show "Edit Store" button only to the store owner.
  ========================================================== */

  async function applyOwnerUI(storeOwnerId) {
    const current = await JARAAuth.getCurrentUser();
    if (!current) return;

    const isOwner = current.user.id === storeOwnerId;
    if (editStoreBtn) editStoreBtn.hidden = !isOwner;
  }


  /* ==========================================================
     6. ERROR STATE
  ========================================================== */

  function showError() {
    if (!storeError) {
      if (window.jaraError && storeName) {
        window.jaraError(storeName.closest('section') || document.body, {
          title:   "Couldn't load this store",
          body:    'Please check your connection and try again.',
          onRetry: () => window.location.reload(),
        });
      }
      return;
    }
    storeError.removeAttribute('hidden');
  }


  /* ==========================================================
     7. INIT
  ========================================================== */

  async function init() {
    // Show skeletons on key elements
    [storeName, storeCategory, storeDesc].forEach(el => {
      el?.classList.add('j-skel');
    });

    try {
      let profile = null;

      if (storeUserId) {
        // Viewing someone else's store
        profile = await loadStoreProfile(storeUserId);
      } else {
        // Viewing own store — use cached profile
        profile = await JARAProfile.load();
      }

      [storeName, storeCategory, storeDesc].forEach(el => {
        el?.classList.remove('j-skel');
      });

      if (!profile) {
        showError();
        return;
      }

      renderStore(profile);
      await applyOwnerUI(profile.id);

    } catch (err) {
      console.error('Store init error:', err.message);
      [storeName, storeCategory, storeDesc].forEach(el => {
        el?.classList.remove('j-skel');
      });
      showError();
    }
  }

  init();

});
