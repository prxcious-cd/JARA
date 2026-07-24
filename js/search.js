/* ============================================================
   JARA ∆ — Search Page  (Supabase-integrated)
   js/search.js

   Drives the three-panel search experience in search/index.html:
     Panel 1 — #srDefault  (before typing: recent, popular, categories)
     Panel 2 — #srResults  (results grid)
     Panel 3 — #srEmpty    (no results)

   All IDs verified against search/index.html.

   Depends on:
     - window._supabase    (supabase-client.js)
     - window.JARAAuth     (auth-guard.js)
     - window.JARAProfile  (jara-profile.js)
     - window.JARAListings (jara-listings.js)
============================================================ */

document.addEventListener('DOMContentLoaded', async () => {

  /* ==========================================================
     STATE
  ========================================================== */

  const S = {
    query:       '',
    filter:      'all',    // 'all' | 'product' | 'service' | 'request' | 'business'
    priceMin:    null,
    priceMax:    null,
    results:     [],
    loading:     false,
    hasSearched: false,
  };

  const POPULAR_SEARCHES = [
    'Generator', 'Laundry', 'Haircut', 'Tutoring',
    'Printing', 'Food', 'Laptop', 'Phone repair',
  ];

  /* ==========================================================
     DOM REFS — every ID verified against search/index.html
  ========================================================== */

  const searchInput      = document.getElementById('searchInput');
  const clearBtn         = document.getElementById('clearBtn');
  const srFilters        = document.getElementById('srFilters');
  const srDefault        = document.getElementById('srDefault');
  const srResults        = document.getElementById('srResults');
  const srEmpty          = document.getElementById('srEmpty');
  const srSuggestions    = document.getElementById('srSuggestions');
  const srResultsBody    = document.getElementById('srResultsBody');
  const srCount          = document.getElementById('srCount');
  const srQuery          = document.getElementById('srQuery');
  const emptyQuery       = document.getElementById('emptyQuery');
  const recentChips      = document.getElementById('recentChips');
  const popularChips     = document.getElementById('popularChips');
  const categoryGrid     = document.getElementById('categoryGrid');
  const clearRecent      = document.getElementById('clearRecent');
  const priceFilter      = document.getElementById('priceFilter');
  const priceModal       = document.getElementById('priceModal');
  const priceModalBackdrop = document.getElementById('priceModalBackdrop');
  const priceMin         = document.getElementById('priceMin');
  const priceMax         = document.getElementById('priceMax');
  const priceClear       = document.getElementById('priceClear');
  const priceApply       = document.getElementById('priceApply');
  const filterChips      = document.querySelectorAll('.filter-chip');
  const pricePresets     = document.querySelectorAll('.price-preset');


  /* ==========================================================
     DEBOUNCE
  ========================================================== */

  function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  const debouncedSearch = debounce(() => runSearch(), 300);


  /* ==========================================================
     PANEL MANAGEMENT
     Only one of three panels is visible at a time.
  ========================================================== */

  function showPanel(name) {
    srDefault?.setAttribute('hidden', '');
    srResults?.setAttribute('hidden', '');
    srEmpty?.setAttribute('hidden', '');

    if (name === 'default') srDefault?.removeAttribute('hidden');
    if (name === 'results') srResults?.removeAttribute('hidden');
    if (name === 'empty')   srEmpty?.removeAttribute('hidden');
  }


  /* ==========================================================
     SEARCH INPUT
  ========================================================== */

  searchInput?.addEventListener('input', () => {
    S.query = searchInput.value.trim();

    // Show / hide clear button
    if (clearBtn) clearBtn.hidden = S.query.length === 0;

    if (S.query.length === 0) {
      showPanel('default');
      srFilters?.setAttribute('hidden', '');
      return;
    }

    debouncedSearch();
  });

  searchInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      S.query = searchInput.value.trim();
      runSearch();
    }
  });

  clearBtn?.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    S.query = '';
    clearBtn.hidden = true;
    srFilters?.setAttribute('hidden', '');
    showPanel('default');
    searchInput?.focus();
  });


  /* ==========================================================
     FILTER CHIPS
  ========================================================== */

  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const val = chip.dataset.filter;

      // Price chip opens modal instead of filtering directly
      if (val === 'price') return;

      filterChips.forEach(c => {
        c.classList.remove('filter-chip--active');
        c.setAttribute('aria-pressed', 'false');
      });
      chip.classList.add('filter-chip--active');
      chip.setAttribute('aria-pressed', 'true');

      S.filter = val;

      if (S.hasSearched) runSearch();
    });
  });


  /* ==========================================================
     EXECUTE SEARCH
  ========================================================== */

  async function runSearch() {
    if (!S.query) return;
    if (S.loading) return;

    S.loading     = true;
    S.hasSearched = true;

    // Save to recent searches
    saveRecentSearch(S.query);

    // Show filters bar
    srFilters?.removeAttribute('hidden');

    // Show skeleton while loading
    showPanel('results');
    showSkeletons();

    try {
      const sb = window._supabase;
      if (!sb) throw new Error('Supabase not ready');

      /* ---- Build query ---- */
      let query = sb
        .from('listings')
        .select(`
          id,
          owner_id,
          title,
          description,
          category,
          listing_type,
          price,
          negotiable,
          condition,
          location,
          status,
          images,
          view_count,
          created_at,
          profiles (
            id,
            full_name,
            business_name,
            avatar_url,
            account_type,
            school,
            phone,
            whatsapp,
            is_verified,
            is_founding_member,
            is_premium,
            pro_status
          )
        `, { count: 'exact' })
        .eq('status', 'active')
        .or(`title.ilike.%${S.query}%,description.ilike.%${S.query}%,category.ilike.%${S.query}%`)
        .order('created_at', { ascending: false })
        .limit(40);

      /* ---- Type filter ---- */
      if (S.filter !== 'all' && S.filter !== 'business' && S.filter !== 'nearby') {
        query = query.eq('listing_type', S.filter);
      }

      /* ---- Price filter ---- */
      if (S.priceMin) query = query.gte('price', Number(S.priceMin));
      if (S.priceMax) query = query.lte('price', Number(S.priceMax));

      const { data, count, error } = await query;

      if (error) throw new Error(error.message);

      S.results = data || [];

      /* ---- Business filter (JS-side — filter by account_type) ---- */
      let filtered = S.results;
      if (S.filter === 'business') {
        filtered = S.results.filter(l =>
          l.profiles?.account_type === 'business'
        );
      }

      /* ---- Render ---- */
      if (filtered.length === 0) {
        showPanel('empty');
        if (emptyQuery) emptyQuery.textContent = `"${S.query}"`;
      } else {
        renderResults(filtered, count || filtered.length);
        showPanel('results');
      }

    } catch (err) {
      console.error('Search error:', err.message);
      showPanel('empty');
      if (emptyQuery) emptyQuery.textContent = `"${S.query}"`;
    }

    S.loading = false;
  }


  /* ==========================================================
     RENDER RESULTS
  ========================================================== */

  function showSkeletons() {
    if (!srResultsBody) return;
    srResultsBody.innerHTML = '';

    if (srCount) srCount.textContent = '';
    if (srQuery) srQuery.textContent = '';

    for (let i = 0; i < 6; i++) {
      const skel = document.createElement('div');
      skel.className = 'sr-result-card j-skel';
      skel.style.cssText = 'height:220px;border-radius:16px';
      skel.setAttribute('aria-hidden', 'true');
      srResultsBody.appendChild(skel);
    }
  }

  function renderResults(listings, total) {
    if (!srResultsBody) return;
    srResultsBody.innerHTML = '';

    /* ---- Results count ---- */
    if (srCount) {
      srCount.textContent = total === 1 ? '1 result' : `${total} results`;
    }
    if (srQuery) {
      srQuery.textContent = `for "${S.query}"`;
    }

    /* ---- Result cards grid ---- */
    const grid = document.createElement('div');
    grid.className = 'sr-results-grid';

    listings.forEach((listing, i) => {
      const card = buildResultCard(listing, i);
      grid.appendChild(card);
    });

    srResultsBody.appendChild(grid);
  }

  function buildResultCard(listing, index) {
    const cover      = JARAListings.getCoverImage(listing);
    const price      = JARAListings.formatPrice(listing);
    const ago        = JARAListings.timeAgo(listing.created_at);
    const sellerName = JARAListings.getSellerName(listing);
    const seller     = listing.profiles || {};
    const typeLabel  = listing.listing_type
      ? listing.listing_type.charAt(0).toUpperCase() + listing.listing_type.slice(1)
      : '';

    const card = document.createElement('a');
    card.className = 'sr-result-card j-card';
    card.href      = `../listing/index.html?id=${esc(listing.id)}`;
    card.setAttribute('aria-label', listing.title);
    card.style.animationDelay = `${index * 30}ms`;

    card.innerHTML = `
      <div class="sr-result-card__img-wrap">
        ${cover
          ? `<img
               class="sr-result-card__img"
               src="${esc(cover)}"
               alt="${esc(listing.title)}"
               loading="${index < 4 ? 'eager' : 'lazy'}"
             />`
          : `<div class="sr-result-card__img-placeholder" aria-hidden="true">
               <i class="fa-solid fa-image"></i>
             </div>`
        }
        <span class="sr-result-card__type">${esc(typeLabel)}</span>
        ${JARAProfile.isPro(seller)
          ? `<span class="sr-result-card__pro">PRO</span>`
          : ''
        }
      </div>
      <div class="sr-result-card__body">
        <p class="sr-result-card__title">${esc(listing.title)}</p>
        <p class="sr-result-card__price">${esc(price)}</p>
        <div class="sr-result-card__meta">
          <span class="sr-result-card__seller">${esc(sellerName)}</span>
          ${seller.school
            ? `<span class="sr-result-card__school">${esc(seller.school)}</span>`
            : ''
          }
          <span class="sr-result-card__time">${esc(ago)}</span>
        </div>
      </div>
    `;

    return card;
  }


  /* ==========================================================
     DEFAULT PANEL — Recent, Popular, Categories
  ========================================================== */

  /* ---- Recent searches (localStorage) ---- */
  const RECENT_KEY  = 'jara_recent_searches';
  const RECENT_MAX  = 8;

  function getRecentSearches() {
    try {
      return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    } catch { return []; }
  }

  function saveRecentSearch(query) {
    if (!query) return;
    try {
      let recent = getRecentSearches().filter(q => q !== query);
      recent.unshift(query);
      recent = recent.slice(0, RECENT_MAX);
      localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
      renderRecentSearches();
    } catch {}
  }

  function renderRecentSearches() {
    if (!recentChips) return;
    const recent = getRecentSearches();
    recentChips.innerHTML = '';

    if (recent.length === 0) {
      recentChips.innerHTML = `
        <p class="sr-default-empty">No recent searches yet.</p>`;
      return;
    }

    recent.forEach(query => {
      const chip = document.createElement('button');
      chip.type      = 'button';
      chip.className = 'chip-item';
      chip.innerHTML = `
        <i class="fa-solid fa-clock-rotate-left" aria-hidden="true"></i>
        ${esc(query)}
      `;
      chip.addEventListener('click', () => {
        if (searchInput) searchInput.value = query;
        S.query = query;
        if (clearBtn) clearBtn.hidden = false;
        runSearch();
      });
      recentChips.appendChild(chip);
    });
  }

  clearRecent?.addEventListener('click', () => {
    try { localStorage.removeItem(RECENT_KEY); } catch {}
    renderRecentSearches();
  });

  /* ---- Popular searches ---- */
  function renderPopularSearches() {
    if (!popularChips) return;
    popularChips.innerHTML = '';

    POPULAR_SEARCHES.forEach(query => {
      const chip = document.createElement('button');
      chip.type      = 'button';
      chip.className = 'chip-item';
      chip.innerHTML = `
        <i class="fa-solid fa-fire" aria-hidden="true"></i>
        ${esc(query)}
      `;
      chip.addEventListener('click', () => {
        if (searchInput) searchInput.value = query;
        S.query = query;
        if (clearBtn) clearBtn.hidden = false;
        runSearch();
      });
      popularChips.appendChild(chip);
    });
  }

  /* ---- Categories ---- */
  async function renderCategories() {
    if (!categoryGrid) return;
    categoryGrid.innerHTML = '';

    const categories = await JARAListings.getCategories();

    const list = categories.length > 0 ? categories : [
      'Books & Stationery', 'Food & Drinks', 'Tech & Repairs',
      'Personal Care', 'Creative Services', 'Laundry & Errands',
      'Tutoring', 'Power & Generator', 'Fashion & Clothing',
      'Health & Wellness', 'Transport', 'Other',
    ];

    list.forEach(cat => {
      const btn = document.createElement('button');
      btn.type      = 'button';
      btn.className = 'category-chip';
      btn.textContent = cat;
      btn.addEventListener('click', () => {
        if (searchInput) searchInput.value = cat;
        S.query  = cat;
        S.filter = 'all';
        if (clearBtn) clearBtn.hidden = false;
        runSearch();
      });
      categoryGrid.appendChild(btn);
    });
  }


  /* ==========================================================
     PRICE FILTER MODAL
  ========================================================== */

  priceFilter?.addEventListener('click', () => {
    priceModal?.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
  });

  function closePriceModal() {
    priceModal?.setAttribute('hidden', '');
    document.body.style.overflow = '';
  }

  priceModalBackdrop?.addEventListener('click', closePriceModal);

  priceClear?.addEventListener('click', () => {
    S.priceMin = null;
    S.priceMax = null;
    if (priceMin) priceMin.value = '';
    if (priceMax) priceMax.value = '';

    // Deactivate price chip
    priceFilter?.classList.remove('filter-chip--active');
    priceFilter?.setAttribute('aria-pressed', 'false');

    closePriceModal();
    if (S.hasSearched) runSearch();
  });

  priceApply?.addEventListener('click', () => {
    S.priceMin = priceMin?.value ? Number(priceMin.value) : null;
    S.priceMax = priceMax?.value ? Number(priceMax.value) : null;

    // Activate price chip visually
    if (S.priceMin || S.priceMax) {
      priceFilter?.classList.add('filter-chip--active');
      priceFilter?.setAttribute('aria-pressed', 'true');
    }

    closePriceModal();
    if (S.query) runSearch();
  });

  pricePresets.forEach(btn => {
    btn.addEventListener('click', () => {
      const min = btn.dataset.min;
      const max = btn.dataset.max;
      if (priceMin) priceMin.value = min;
      if (priceMax) priceMax.value = max;

      // Highlight active preset
      pricePresets.forEach(p => p.classList.remove('price-preset--active'));
      btn.classList.add('price-preset--active');
    });
  });


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
    // Reveal page (search is a protected page — auth-guard hides it)
    document.body.style.visibility = '';
    document.body.style.opacity    = '';

    // Load profile silently
    try { await JARAProfile.load(); } catch {}

    // Build default panel content
    renderRecentSearches();
    renderPopularSearches();
    await renderCategories();

    // Show default panel
    showPanel('default');

    // Focus search input
    searchInput?.focus();

    // Check if URL has a query param (e.g. from explore page search bar)
    const params = new URLSearchParams(window.location.search);
    const q      = params.get('q');
    if (q) {
      if (searchInput) searchInput.value = q;
      S.query = q;
      if (clearBtn) clearBtn.hidden = false;
      await runSearch();
    }
  }

  init();

});
