/* ============================================================
   JARA ∆ — Explore Page  (listings-integrated)
   js/explore.js

   Loads real listings from Supabase.
   Replaces all placeholder listing cards.

   Depends on:
     - window._supabase    (supabase-client.js)
     - window.JARAAuth     (auth-guard.js)
     - window.JARAProfile  (jara-profile.js)
     - window.JARAListings (jara-listings.js)

   TABLE OF CONTENTS
   1.  State
   2.  DOM refs
   3.  Profile render
   4.  Listing card builder
   5.  Listings render
   6.  Category chips
   7.  Infinite scroll / load more
   8.  Empty + error states
   9.  Init
============================================================ */

document.addEventListener('DOMContentLoaded', async () => {

  /* ==========================================================
     1. STATE
  ========================================================== */

  const S = {
    profile:       null,
    listings:      [],
    offset:        0,
    limit:         20,
    total:         0,
    loading:       false,
    activeType:    null,      // 'product' | 'service' | 'request' | null
    activeCategory: null,
  };


  /* ==========================================================
     2. DOM REFS
  ========================================================== */

  const greetingName     = document.getElementById('greetingName');
  const greetingLabel    = document.getElementById('greetingLabel');
  const headerAvatarImg  = document.getElementById('headerAvatarImg');
  const headerInitials   = document.getElementById('headerInitials');
  const verifiedBadge    = document.getElementById('verifiedBadge');
  const proBadge         = document.getElementById('proBadge');
  const foundingBadge    = document.getElementById('foundingBadge');

  const listingsGrid     = document.getElementById('listingsGrid');
  const loadMoreBtn      = document.getElementById('loadMoreBtn');
  const loadMoreWrap     = document.getElementById('loadMoreWrap');
  const categoryChips    = document.getElementById('categoryChips');
  const typeChips        = document.querySelectorAll('[data-type-filter]');


  /* ==========================================================
     3. PROFILE RENDER
  ========================================================== */

  function renderProfile(profile) {
    const firstName = JARAProfile.getFirstName(profile);
    const hour      = new Date().getHours();
    const greeting  = hour < 12 ? 'Good morning' :
                      hour < 17 ? 'Good afternoon' : 'Good evening';

    if (greetingLabel) greetingLabel.textContent = greeting + ',';
    if (greetingName)  greetingName.textContent  = firstName;

    const avatarUrl = JARAProfile.getAvatarUrl(profile);
    if (avatarUrl && headerAvatarImg) {
      headerAvatarImg.src = avatarUrl;
      headerAvatarImg.removeAttribute('hidden');
      if (headerInitials) headerInitials.setAttribute('hidden', '');
    } else if (headerInitials) {
      headerInitials.textContent = JARAProfile.getInitials(profile);
      headerInitials.removeAttribute('hidden');
      if (headerAvatarImg) headerAvatarImg.setAttribute('hidden', '');
    }

    if (verifiedBadge) verifiedBadge.hidden = !profile.is_verified;
    if (proBadge)      proBadge.hidden       = !JARAProfile.isPro(profile);
    if (foundingBadge) foundingBadge.hidden  = !JARAProfile.isFounder(profile);

    window.__JARA_IS_FOUNDER = JARAProfile.isFounder(profile);
    window.__JARA_IS_PRO     = JARAProfile.isPro(profile);
  }


  /* ==========================================================
     4. LISTING CARD BUILDER
     Builds a DOM element for a single listing.
     Matches the existing card structure in the HTML.
  ========================================================== */

  function buildListingCard(listing) {
    const cover      = JARAListings.getCoverImage(listing);
    const sellerName = JARAListings.getSellerName(listing);
    const price      = JARAListings.formatPrice(listing);
    const ago        = JARAListings.timeAgo(listing.created_at);
    const seller     = listing.profiles || {};
    const typeLabel  = listing.listing_type
      ? listing.listing_type.charAt(0).toUpperCase() + listing.listing_type.slice(1)
      : '';

    const card = document.createElement('a');
    card.className = 'listing-mini j-card';
    card.href      = `../listing/index.html?id=${listing.id}`;
    card.setAttribute('aria-label', listing.title);

    card.innerHTML = `
      <div class="listing-mini__img-wrap">
        ${cover
          ? `<img class="listing-mini__img"
                  src="${esc(cover)}"
                  alt="${esc(listing.title)}"
                  loading="lazy" />`
          : `<div class="listing-mini__img-placeholder" aria-hidden="true">
               <i class="fa-solid fa-image"></i>
             </div>`
        }
        <span class="listing-mini__type pill pill--${esc(listing.listing_type || 'product')}">
          ${esc(typeLabel)}
        </span>
        ${JARAProfile.isPro(seller)
          ? `<span class="listing-mini__pro" aria-label="PRO seller">PRO</span>`
          : ''
        }
      </div>
      <div class="listing-mini__body">
        <p class="listing-mini__title">${esc(listing.title)}</p>
        <p class="listing-mini__price">${esc(price)}
          ${listing.negotiable
            ? `<span class="listing-mini__neg">Negotiable</span>`
            : ''
          }
        </p>
        <div class="listing-mini__meta">
          <div class="listing-mini__seller">
            ${seller.avatar_url
              ? `<img class="listing-mini__avatar"
                      src="${esc(seller.avatar_url)}"
                      alt="${esc(sellerName)}"
                      loading="lazy" />`
              : `<div class="listing-mini__avatar listing-mini__avatar--initials">
                   ${esc(getInitials(sellerName))}
                 </div>`
            }
            <div class="listing-mini__seller-info">
              <span class="listing-mini__seller-name">${esc(sellerName)}</span>
              ${seller.school
                ? `<span class="listing-mini__school">${esc(seller.school)}</span>`
                : ''
              }
            </div>
          </div>
          <span class="listing-mini__time">${esc(ago)}</span>
        </div>
      </div>
    `;

    return card;
  }


  /* ==========================================================
     5. LISTINGS RENDER
  ========================================================== */

  function showSkeletonCards(count = 6) {
    if (!listingsGrid) return;
    listingsGrid.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const card = document.createElement('div');
      card.className = 'listing-mini j-skel j-skel-card';
      card.style.minHeight = '220px';
      card.setAttribute('aria-hidden', 'true');
      listingsGrid.appendChild(card);
    }
  }

  function appendListingCards(listings) {
    if (!listingsGrid) return;

    listings.forEach((listing, i) => {
      const card = buildListingCard(listing);
      card.style.animationDelay = `${i * 30}ms`;
      listingsGrid.appendChild(card);
    });
  }

  async function loadListings(reset = false) {
    if (S.loading) return;
    S.loading = true;

    if (reset) {
      S.offset   = 0;
      S.listings = [];
      showSkeletonCards();
    }

    try {
      const { data, count, error } = await JARAListings.fetch({
        type:      S.activeType,
        category:  S.activeCategory,
        limit:     S.limit,
        offset:    S.offset,
        orderBy:   'created_at',
        ascending: false,
        status:    'active',
      });

      // Clear skeletons on first load
      if (reset && listingsGrid) listingsGrid.innerHTML = '';

      if (error) {
        showError();
        S.loading = false;
        return;
      }

      S.listings = reset ? data : [...S.listings, ...data];
      S.total    = count;
      S.offset  += data.length;

      if (data.length === 0 && reset) {
        showEmpty();
      } else {
        appendListingCards(data);
      }

      // Show / hide load more button
      const hasMore = S.offset < S.total;
      if (loadMoreWrap) loadMoreWrap.hidden = !hasMore;

    } catch (err) {
      console.error('Explore: loadListings error:', err.message);
      if (reset) showError();
    }

    S.loading = false;
  }


  /* ==========================================================
     6. CATEGORY CHIPS
  ========================================================== */

  async function loadCategoryChips() {
    if (!categoryChips) return;

    const categories = await JARAListings.getCategories();
    if (categories.length === 0) return;

    // Keep any existing "All" chip and append dynamic ones
    const existing = categoryChips.querySelectorAll('[data-category]');
    existing.forEach(el => el.remove());

    categories.forEach(cat => {
      const chip = document.createElement('button');
      chip.type              = 'button';
      chip.className         = 'chip j-chip';
      chip.dataset.category  = cat;
      chip.textContent       = cat;
      chip.addEventListener('click', () => setCategory(cat, chip));
      categoryChips.appendChild(chip);
    });
  }

  function setCategory(cat, chipEl) {
    S.activeCategory = S.activeCategory === cat ? null : cat;

    // Update chip active state
    categoryChips?.querySelectorAll('.chip').forEach(c => {
      c.classList.toggle('chip--active', c.dataset.category === S.activeCategory);
    });
    if (!S.activeCategory) {
      categoryChips?.querySelector('[data-category-all]')
        ?.classList.add('chip--active');
    }

    loadListings(true);
  }

  // Type filter chips (product / service / request)
  typeChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const type = chip.dataset.typeFilter;
      S.activeType = S.activeType === type ? null : type;

      typeChips.forEach(c => {
        c.classList.toggle('chip--active', c.dataset.typeFilter === S.activeType);
      });

      loadListings(true);
    });
  });

  // "All" category chip
  categoryChips?.querySelector('[data-category-all]')
    ?.addEventListener('click', (e) => {
      S.activeCategory = null;
      categoryChips.querySelectorAll('.chip').forEach(c => c.classList.remove('chip--active'));
      e.currentTarget.classList.add('chip--active');
      loadListings(true);
    });


  /* ==========================================================
     7. LOAD MORE
  ========================================================== */

  loadMoreBtn?.addEventListener('click', () => loadListings(false));


  /* ==========================================================
     8. EMPTY + ERROR STATES
  ========================================================== */

  function showEmpty() {
    if (!listingsGrid) return;
    if (window.jaraEmpty) {
      window.jaraEmpty(listingsGrid, {
        icon:     'fa-solid fa-store',
        title:    'No listings yet',
        body:     'Be the first to list something on JARA.',
        btnLabel: 'Create Listing',
        btnHref:  '../sell/index.html',
      });
    }
  }

  function showError() {
    if (!listingsGrid) return;
    if (window.jaraError) {
      window.jaraError(listingsGrid, {
        title:   "Couldn't load listings",
        body:    'Please check your connection and try again.',
        onRetry: () => loadListings(true),
      });
    }
  }


  /* ==========================================================
     9. INIT
  ========================================================== */

  async function init() {
    try {
      // Load profile
      const profile = await JARAProfile.load();
      if (profile) renderProfile(profile);

      // Load categories and listings in parallel
      await Promise.all([
        loadCategoryChips(),
        loadListings(true),
      ]);

    } catch (err) {
      console.error('Explore init error:', err.message);
      showError();
    }
  }

  init();

  // Helpers
  function esc(str) {
    if (!str && str !== 0) return '';
    const d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
  }

  function getInitials(name) {
    if (!name) return '?';
    const words = name.trim().split(' ').filter(Boolean);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }

});
