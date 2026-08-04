/* ============================================================
   JARA ∆ — Explore Page  (listings-integrated)
   js/explore.js

   Loads real data from Supabase into every section.

   Sections:
     - Greeting (profile name + time-aware message)
     - Trending Near You (most viewed active listings)
     - Active Requests (listing_type = 'request')
     - Verified by JARA (is_verified seller listings)
     - Recently Added (newest listings)

   All IDs verified against explore/index.html.

   Depends on:
     - window._supabase    (supabase-client.js)
     - window.JARAAuth     (auth-guard.js)
     - window.JARAProfile  (jara-profile.js)
     - window.JARAListings (jara-listings.js)
============================================================ */

document.addEventListener('DOMContentLoaded', async () => {

  /* ==========================================================
     DOM REFS — verified against explore/index.html
  ========================================================== */

  const greetingText    = document.getElementById('greetingText');
  const greetingName    = document.getElementById('greetingName');
  const bellDot         = document.getElementById('bellDot');
  const trendingStrip   = document.getElementById('trendingStrip');
  const requestsList    = document.getElementById('requestsList');
  const verifiedStrip   = document.getElementById('verifiedStrip');
  const recentGrid      = document.getElementById('recentGrid');


  /* ==========================================================
     GREETING
  ========================================================== */

  function renderGreeting(profile) {
    const hour = new Date().getHours();
    const text =
      hour < 12 ? 'Good morning' :
      hour < 17 ? 'Good afternoon' :
                  'Good evening';

    if (greetingText) greetingText.textContent = text;

    if (greetingName) {
      const first = JARAProfile.getFirstName(profile);
      greetingName.innerHTML =
        `${esc(first)} <span class="ex-header__wave">👋</span>`;
    }

    /*
     FUTURE: Check for unread notifications and show bell dot:
       const { count } = await window._supabase
         .from('notifications')
         .select('id', { count: 'exact', head: true })
         .eq('user_id', profile.id)
         .eq('is_read', false);
       if (count > 0 && bellDot) bellDot.hidden = false;
    */
  }


  /* ==========================================================
     CARD BUILDERS
     Each section uses a slightly different card style
     matched to the existing explore.css classes.
  ========================================================== */

  /* ---- Strip card (horizontal scroll — trending + verified) ---- */
  function buildStripCard(listing) {
    const cover  = JARAListings.getCoverImage(listing);
    const price  = JARAListings.formatPrice(listing);
    const seller = listing.profiles || {};
    const name   = JARAListings.getSellerName(listing);

    const card = document.createElement('a');
    card.className = 'strip-card j-card';
    card.href      = `../listing/index.html?id=${esc(listing.id)}`;
    card.setAttribute('role', 'listitem');
    card.setAttribute('aria-label', listing.title);

    card.innerHTML = `
      <div class="strip-card__img-wrap">
        ${cover
          ? `<img class="strip-card__img"
                  src="${esc(cover)}"
                  alt="${esc(listing.title)}"
                  loading="lazy" />`
          : `<div class="strip-card__img-placeholder" aria-hidden="true">
               <i class="fa-solid fa-image"></i>
             </div>`
        }
        ${JARAProfile.isPro(seller)
          ? `<span class="strip-card__pro" aria-label="PRO seller">PRO</span>`
          : ''
        }
      </div>
      <div class="strip-card__body">
        <p class="strip-card__title">${esc(listing.title)}</p>
        <p class="strip-card__price">${esc(price)}</p>
        <p class="strip-card__seller">${esc(name)}</p>
      </div>
    `;

    return card;
  }

  /* ---- Request card (vertical list) ---- */
  function buildRequestCard(listing) {
    const ago    = JARAListings.timeAgo(listing.created_at);
    const seller = listing.profiles || {};
    const name   = JARAListings.getSellerName(listing);

    const card = document.createElement('a');
    card.className = 'request-card j-card';
    card.href      = `../listing/index.html?id=${esc(listing.id)}`;
    card.setAttribute('role', 'listitem');
    card.setAttribute('aria-label', listing.title);

    card.innerHTML = `
      <div class="request-card__icon" aria-hidden="true">
        <i class="fa-solid fa-bullhorn"></i>
      </div>
      <div class="request-card__body">
        <p class="request-card__title">${esc(listing.title)}</p>
        <p class="request-card__meta">
          ${esc(name)}
          ${seller.school ? `· <span>${esc(seller.school)}</span>` : ''}
          · <span>${esc(ago)}</span>
        </p>
        ${listing.description
          ? `<p class="request-card__desc">${esc(listing.description.slice(0, 80))}${listing.description.length > 80 ? '…' : ''}</p>`
          : ''
        }
      </div>
      <i class="fa-solid fa-chevron-right request-card__arrow" aria-hidden="true"></i>
    `;

    return card;
  }

  /* ---- Recent grid card (2-column) ---- */
  function buildRecentCard(listing) {
    const cover  = JARAListings.getCoverImage(listing);
    const price  = JARAListings.formatPrice(listing);
    const ago    = JARAListings.timeAgo(listing.created_at);
    const seller = listing.profiles || {};
    const name   = JARAListings.getSellerName(listing);
    const type   = listing.listing_type || '';

    const card = document.createElement('a');
    card.className = 'recent-card j-card';
    card.href      = `../listing/index.html?id=${esc(listing.id)}`;
    card.setAttribute('role', 'listitem');
    card.setAttribute('aria-label', listing.title);

    card.innerHTML = `
      <div class="recent-card__img-wrap">
        ${cover
          ? `<img class="recent-card__img"
                  src="${esc(cover)}"
                  alt="${esc(listing.title)}"
                  loading="lazy" />`
          : `<div class="recent-card__img-placeholder" aria-hidden="true">
               <i class="fa-solid fa-image"></i>
             </div>`
        }
        <span class="recent-card__type">${esc(type)}</span>
      </div>
      <div class="recent-card__body">
        <p class="recent-card__title">${esc(listing.title)}</p>
        <p class="recent-card__price">${esc(price)}</p>
        <div class="recent-card__meta">
          <span class="recent-card__seller">${esc(name)}</span>
          <span class="recent-card__time">${esc(ago)}</span>
        </div>
      </div>
    `;

    return card;
  }


  /* ==========================================================
     SECTION LOADERS
  ========================================================== */

  /* ---- Trending (most viewed) ---- */
  async function loadTrending() {
    if (!trendingStrip) return;

    try {
      const { data, error } = await JARAListings.fetch({
        status:    'active',
        orderBy:   'view_count',
        ascending: false,
        limit:     10,
        offset:    0,
      });

      trendingStrip.innerHTML = '';

      if (error || !data || data.length === 0) {
        showSectionEmpty(trendingStrip, 'strip');
        return;
      }

      data.forEach(listing => {
        trendingStrip.appendChild(buildStripCard(listing));
      });

    } catch (err) {
      console.error('Explore: loadTrending error:', err.message);
      showSectionEmpty(trendingStrip, 'strip');
    }
  }

  /* ---- Active Requests ---- */
  async function loadRequests() {
    if (!requestsList) return;

    try {
      const { data, error } = await JARAListings.fetch({
        type:      'request',
        status:    'active',
        orderBy:   'created_at',
        ascending: false,
        limit:     5,
        offset:    0,
      });

      requestsList.innerHTML = '';

      if (error || !data || data.length === 0) {
        showSectionEmpty(requestsList, 'list');
        return;
      }

      data.forEach(listing => {
        requestsList.appendChild(buildRequestCard(listing));
      });

    } catch (err) {
      console.error('Explore: loadRequests error:', err.message);
      showSectionEmpty(requestsList, 'list');
    }
  }

  /* ---- Verified by JARA ---- */
  async function loadVerified() {
    if (!verifiedStrip) return;

    try {
      /*
       Fetch listings whose seller profile is verified.
       We fetch a larger set and filter by is_verified in JS
       since Supabase JS v2 does not support filtering on
       joined table columns directly.

       FUTURE: Use an RPC or view for server-side filtering.
      */
      const { data, error } = await JARAListings.fetch({
        status:    'active',
        orderBy:   'created_at',
        ascending: false,
        limit:     40,
        offset:    0,
      });

      verifiedStrip.innerHTML = '';

      if (error || !data) {
        showSectionEmpty(verifiedStrip, 'strip');
        return;
      }

      const verified = data
        .filter(l => l.profiles?.is_verified === true)
        .slice(0, 10);

      if (verified.length === 0) {
        showSectionEmpty(verifiedStrip, 'strip');
        return;
      }

      verified.forEach(listing => {
        verifiedStrip.appendChild(buildStripCard(listing));
      });

    } catch (err) {
      console.error('Explore: loadVerified error:', err.message);
      showSectionEmpty(verifiedStrip, 'strip');
    }
  }

  /* ---- Recently Added ---- */
  async function loadRecent() {
    if (!recentGrid) return;

    try {
      const { data, error } = await JARAListings.fetch({
        status:    'active',
        orderBy:   'created_at',
        ascending: false,
        limit:     10,
        offset:    0,
      });

      recentGrid.innerHTML = '';

      if (error || !data || data.length === 0) {
        showSectionEmpty(recentGrid, 'grid');
        return;
      }

      data.forEach(listing => {
        recentGrid.appendChild(buildRecentCard(listing));
      });

    } catch (err) {
      console.error('Explore: loadRecent error:', err.message);
      showSectionEmpty(recentGrid, 'grid');
    }
  }


  /* ==========================================================
     EMPTY STATES PER SECTION
  ========================================================== */

  function showSectionEmpty(container, type) {
    if (!container) return;
    container.innerHTML = '';

    const configs = {
      strip: {
        icon:  'fa-solid fa-store',
        title: 'Nothing here yet',
        body:  'Be the first to list something.',
      },
      list: {
        icon:  'fa-solid fa-bullhorn',
        title: 'No active requests',
        body:  'No one has posted a request yet.',
      },
      grid: {
        icon:  'fa-solid fa-box-open',
        title: 'No listings yet',
        body:  'Create the first listing on JARA.',
      },
    };

    const cfg = configs[type] || configs.grid;

    if (window.jaraEmpty) {
      window.jaraEmpty(container, {
        icon:     cfg.icon,
        title:    cfg.title,
        body:     cfg.body,
        btnLabel: 'Create Listing',
        btnHref:  '../sell/index.html',
      });
    }
  }


  /* ==========================================================
     ADD CSS FOR NEW CARD TYPES
     These classes are added inline since they are new
     and do not exist in explore.css yet.
  ========================================================== */

  function injectCardStyles() {
    if (document.getElementById('explore-card-styles')) return;

    const style = document.createElement('style');
    style.id    = 'explore-card-styles';
    style.textContent = `

      /* ---- Strip card ---- */
      .strip-card {
        flex-shrink: 0;
        width: 160px;
        background: var(--color-surface, #111118);
        border: 1px solid var(--color-border, #2A2A3E);
        border-radius: 16px;
        overflow: hidden;
        text-decoration: none;
        display: block;
        transition: border-color 220ms ease, transform 180ms ease;
      }
      .strip-card:hover { border-color: rgba(124,58,237,0.3); transform: translateY(-2px); }

      .strip-card__img-wrap {
        position: relative;
        aspect-ratio: 1;
        background: #1A1A2A;
        overflow: hidden;
      }
      .strip-card__img {
        width: 100%; height: 100%;
        object-fit: cover; display: block;
      }
      .strip-card__img-placeholder {
        width: 100%; height: 100%;
        display: flex; align-items: center; justify-content: center;
        font-size: 2rem; color: #55556A;
      }
      .strip-card__pro {
        position: absolute; top: 6px; right: 6px;
        font-family: 'Space Grotesk', sans-serif;
        font-size: 0.5rem; font-weight: 800;
        padding: 2px 6px;
        background: linear-gradient(135deg, #F59E0B, #FCD34D);
        color: #000; border-radius: 9999px;
      }
      .strip-card__body { padding: 0.625rem; }
      .strip-card__title {
        font-family: 'Space Grotesk', sans-serif;
        font-size: 0.8125rem; font-weight: 700;
        color: #F4F4F8; line-height: 1.3; margin-bottom: 2px;
        display: -webkit-box;
        -webkit-line-clamp: 2; -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .strip-card__price {
        font-family: 'Space Grotesk', sans-serif;
        font-size: 0.8125rem; font-weight: 700; color: #A78BFA;
        margin-bottom: 2px;
      }
      .strip-card__seller {
        font-size: 0.625rem; color: #55556A;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }

      /* ---- Request card ---- */
      .request-card {
        display: flex; align-items: center; gap: 0.875rem;
        background: var(--color-surface, #111118);
        border: 1px solid var(--color-border, #2A2A3E);
        border-radius: 16px; padding: 1rem 1.125rem;
        text-decoration: none; margin-bottom: 0.625rem;
        transition: border-color 220ms ease, transform 180ms ease;
      }
      .request-card:hover { border-color: rgba(124,58,237,0.3); transform: translateX(3px); }
      .request-card__icon {
        width: 40px; height: 40px; border-radius: 12px;
        background: rgba(245,158,11,0.1);
        display: flex; align-items: center; justify-content: center;
        font-size: 1rem; color: #F59E0B; flex-shrink: 0;
      }
      .request-card__body { flex: 1; min-width: 0; }
      .request-card__title {
        font-family: 'Space Grotesk', sans-serif;
        font-size: 0.9rem; font-weight: 700; color: #F4F4F8;
        letter-spacing: -0.01em; margin-bottom: 2px;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .request-card__meta {
        font-size: 0.75rem; color: #55556A; margin-bottom: 3px;
      }
      .request-card__desc {
        font-size: 0.8125rem; color: #9090A8; line-height: 1.5;
      }
      .request-card__arrow { color: #55556A; font-size: 0.75rem; flex-shrink: 0; }

      /* ---- Recent card (2-column grid) ---- */
      .recent-card {
        background: var(--color-surface, #111118);
        border: 1px solid var(--color-border, #2A2A3E);
        border-radius: 16px; overflow: hidden;
        text-decoration: none; display: block;
        transition: border-color 220ms ease, transform 180ms ease;
      }
      .recent-card:hover { border-color: rgba(124,58,237,0.3); transform: translateY(-2px); }
      .recent-card__img-wrap {
        position: relative; aspect-ratio: 4/3;
        background: #1A1A2A; overflow: hidden;
      }
      .recent-card__img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .recent-card__img-placeholder {
        width: 100%; height: 100%;
        display: flex; align-items: center; justify-content: center;
        font-size: 2rem; color: #55556A;
      }
      .recent-card__type {
        position: absolute; bottom: 6px; left: 6px;
        font-family: 'Space Grotesk', sans-serif;
        font-size: 0.5rem; font-weight: 700;
        text-transform: uppercase; letter-spacing: 0.06em;
        padding: 2px 7px;
        background: rgba(10,10,15,0.75); color: #A78BFA;
        border-radius: 9999px; backdrop-filter: blur(4px);
      }
      .recent-card__body { padding: 0.625rem; }
      .recent-card__title {
        font-family: 'Space Grotesk', sans-serif;
        font-size: 0.8125rem; font-weight: 700; color: #F4F4F8;
        line-height: 1.3; margin-bottom: 2px;
        display: -webkit-box;
        -webkit-line-clamp: 2; -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .recent-card__price {
        font-family: 'Space Grotesk', sans-serif;
        font-size: 0.8125rem; font-weight: 700;
        color: #A78BFA; margin-bottom: 3px;
      }
      .recent-card__meta {
        display: flex; justify-content: space-between;
        font-size: 0.625rem; color: #55556A;
      }
      .recent-card__seller { color: #9090A8; }

      /* ---- Recent grid layout ---- */
      .recent-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.875rem;
      }

      /* ---- Card strip scroll ---- */
      .card-strip {
        display: flex;
        gap: 0.875rem;
        overflow-x: auto;
        padding-bottom: 0.5rem;
        scrollbar-width: none;
        -webkit-overflow-scrolling: touch;
      }
      .card-strip::-webkit-scrollbar { display: none; }
    `;

    document.head.appendChild(style);
  }


  /* ==========================================================
     UTILITY
  ========================================================== */

  function esc(str) {
    if (!str && str !== 0) return '';
    const d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
  }


  /* ==========================================================
     INIT
  ========================================================== */

  async function init() {
    // Inject card CSS
    injectCardStyles();

    try {
      // Load profile for greeting
      const profile = await JARAProfile.load();

      if (!profile) {
        console.warn('Explore: no profile found.');
      } else {
        renderGreeting(profile);
        window.__JARA_IS_FOUNDER = JARAProfile.isFounder(profile);
        window.__JARA_IS_PRO     = JARAProfile.isPro(profile);
      }

      // Load all sections in parallel for speed
      await Promise.all([
        loadTrending(),
        loadRequests(),
        loadVerified(),
        loadRecent(),
      ]);

    } catch (err) {
      console.error('Explore init error:', err.message);
    }
  }

  init();

});
