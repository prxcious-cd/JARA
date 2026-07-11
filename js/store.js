/* ============================================================
   JARA ∆ — Store Page  (listings-integrated)
   js/store.js

   Loads real store profile + listings from Supabase.

   Depends on:
     - window._supabase    (supabase-client.js)
     - window.JARAAuth     (auth-guard.js)
     - window.JARAProfile  (jara-profile.js)
     - window.JARAListings (jara-listings.js)

   URL params:
     ?id=USER_ID   — view a specific seller's store
     (no param)    — view own store

   TABLE OF CONTENTS
   1.  State
   2.  DOM refs
   3.  Load store owner profile
   4.  Render store header
   5.  Load + render listings
   6.  Owner UI
   7.  Empty + error states
   8.  Init
============================================================ */

document.addEventListener('DOMContentLoaded', async () => {

  /* ==========================================================
     1. STATE
  ========================================================== */

  const S = {
    ownerId:   null,
    profile:   null,
    isOwner:   false,
    listings:  [],
    offset:    0,
    limit:     20,
    total:     0,
    activeType: null,
  };


  /* ==========================================================
     2. DOM REFS
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
  const storeListingCount = document.getElementById('storeListingCount');
  const storeListingsGrid = document.getElementById('storeListingsGrid');
  const editStoreBtn      = document.getElementById('editStoreBtn');
  const addListingBtn     = document.getElementById('addListingBtn');
  const typeChips         = document.querySelectorAll('[data-store-type]');


  /* ==========================================================
     3. LOAD STORE OWNER PROFILE
  ========================================================== */

  const params      = new URLSearchParams(window.location.search);
  const storeUserId = params.get('id') || null;

  async function loadOwnerProfile(userId) {
    const sb = window._supabase;
    if (!sb || !userId) return null;

    const { data, error } = await sb
      .from('profiles')
      .select(`
        id, jara_id, full_name, username, avatar_url, account_type,
        bio, school, location, business_name, business_category,
        business_description, phone, whatsapp, website,
        is_verified, is_founding_member, is_premium, pro_status, created_at
      `)
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Store: loadOwnerProfile error:', error.message);
      return null;
    }
    return data;
  }


  /* ==========================================================
     4. RENDER STORE HEADER
  ========================================================== */

  function renderStoreHeader(profile) {
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

    if (storeName)     storeName.textContent     = JARAProfile.getDisplayName(profile) || 'JARA Business';
    if (storeCategory) { storeCategory.textContent = profile.business_category || ''; storeCategory.hidden = !profile.business_category; }
    if (storeDesc)     { storeDesc.textContent     = profile.business_description || profile.bio || ''; storeDesc.hidden = !(profile.business_description || profile.bio); }
    if (storeLocation) { storeLocation.textContent = profile.location || ''; storeLocation.hidden = !profile.location; }

    if (storeWhatsapp) {
      if (profile.whatsapp) {
        storeWhatsapp.href = `https://wa.me/${profile.whatsapp.replace(/\D/g, '')}`;
        storeWhatsapp.removeAttribute('hidden');
      } else { storeWhatsapp.setAttribute('hidden', ''); }
    }
    if (storePhone) {
      if (profile.phone) {
        storePhone.href = `tel:${profile.phone}`;
        storePhone.removeAttribute('hidden');
      } else { storePhone.setAttribute('hidden', ''); }
    }

    if (storeVerified) storeVerified.hidden = !profile.is_verified;
    if (storePro)      storePro.hidden       = !JARAProfile.isPro(profile);
    if (storeFounding) storeFounding.hidden  = !JARAProfile.isFounder(profile);

    const name = JARAProfile.getDisplayName(profile);
    if (name) document.title = `${name} — JARA ∆`;
  }


  /* ==========================================================
     5. LOAD + RENDER LISTINGS
  ========================================================== */

  function buildStoreCard(listing) {
    const cover = JARAListings.getCoverImage(listing);
    const price = JARAListings.formatPrice(listing);
    const ago   = JARAListings.timeAgo(listing.created_at);

    const card = document.createElement('a');
    card.className = 'compact-card j-card';
    card.href      = `../listing/index.html?id=${listing.id}`;
    card.setAttribute('aria-label', listing.title);

    card.innerHTML = `
      <div class="compact-card__img-wrap">
        ${cover
          ? `<img class="compact-card__img" src="${esc(cover)}"
                  alt="${esc(listing.title)}" loading="lazy" />`
          : `<div class="compact-card__img-placeholder" aria-hidden="true">
               <i class="fa-solid fa-image"></i>
             </div>`
        }
      </div>
      <div class="compact-card__body">
        <p class="compact-card__title">${esc(listing.title)}</p>
        <p class="compact-card__price">${esc(price)}</p>
        <p class="compact-card__time">${esc(ago)}</p>
      </div>
      ${S.isOwner
        ? `<a class="compact-card__edit" href="../sell/index.html?edit=${listing.id}"
               aria-label="Edit listing">
             <i class="fa-solid fa-pen" aria-hidden="true"></i>
           </a>`
        : ''
      }
    `;

    return card;
  }

  function showStoreSkeletons(count = 6) {
    if (!storeListingsGrid) return;
    storeListingsGrid.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'compact-card j-skel j-skel-card';
      el.setAttribute('aria-hidden', 'true');
      storeListingsGrid.appendChild(el);
    }
  }

  async function loadStoreListings(reset = false) {
    if (!S.ownerId) return;

    if (reset) {
      S.offset   = 0;
      S.listings = [];
      showStoreSkeletons();
    }

    const { data, count, error } = await JARAListings.fetchByOwner(S.ownerId, {
      type:   S.activeType,
      limit:  S.limit,
      offset: S.offset,
      status: S.isOwner ? null : 'active', // owners see all statuses
    });

    if (reset && storeListingsGrid) storeListingsGrid.innerHTML = '';

    if (error) {
      showStoreError();
      return;
    }

    S.listings  = reset ? data : [...S.listings, ...data];
    S.total     = count;
    S.offset   += data.length;

    if (storeListingCount) {
      storeListingCount.textContent = S.total;
    }

    if (data.length === 0 && reset) {
      showStoreEmpty();
    } else {
      data.forEach(listing => {
        storeListingsGrid?.appendChild(buildStoreCard(listing));
      });
    }
  }

  // Type filter chips on store page
  typeChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const type     = chip.dataset.storeType;
      S.activeType   = S.activeType === type ? null : type;
      typeChips.forEach(c => c.classList.toggle('chip--active', c.dataset.storeType === S.activeType));
      loadStoreListings(true);
    });
  });


  /* ==========================================================
     6. OWNER UI
  ========================================================== */

  async function applyOwnerUI(profileId) {
    const current = await JARAAuth.getCurrentUser();
    if (!current) return;
    S.isOwner = current.user.id === profileId;
    if (editStoreBtn) editStoreBtn.hidden = !S.isOwner;
    if (addListingBtn) addListingBtn.hidden = !S.isOwner;
  }


  /* ==========================================================
     7. EMPTY + ERROR STATES
  ========================================================== */

  function showStoreEmpty() {
    if (!storeListingsGrid) return;
    if (window.jaraEmpty) {
      window.jaraEmpty(storeListingsGrid, {
        icon:     'fa-solid fa-box-open',
        title:    'No listings yet',
        body:     S.isOwner
          ? 'Create your first listing to start selling.'
          : 'This store has no active listings right now.',
        btnLabel: S.isOwner ? 'Create Listing' : null,
        btnHref:  S.isOwner ? '../sell/index.html' : null,
      });
    }
  }

  function showStoreError() {
    if (!storeListingsGrid) return;
    if (window.jaraError) {
      window.jaraError(storeListingsGrid, {
        title:   "Couldn't load listings",
        body:    'Please check your connection and try again.',
        onRetry: () => loadStoreListings(true),
      });
    }
  }


  /* ==========================================================
     8. INIT
  ========================================================== */

  async function init() {
    // Skeleton for header
    [storeName, storeDesc].forEach(el => el?.classList.add('j-skel'));

    try {
      let profile;

      if (storeUserId) {
        S.ownerId = storeUserId;
        profile   = await loadOwnerProfile(storeUserId);
      } else {
        profile   = await JARAProfile.load();
        S.ownerId = profile?.id || null;
      }

      [storeName, storeDesc].forEach(el => el?.classList.remove('j-skel'));

      if (!profile) {
        showStoreError();
        return;
      }

      S.profile = profile;
      renderStoreHeader(profile);
      await applyOwnerUI(profile.id);
      await loadStoreListings(true);

    } catch (err) {
      console.error('Store init error:', err.message);
      [storeName, storeDesc].forEach(el => el?.classList.remove('j-skel'));
      showStoreError();
    }
  }

  init();

  function esc(str) {
    if (!str && str !== 0) return '';
    const d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
  }

});
