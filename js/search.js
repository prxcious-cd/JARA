/* ============================================================
   JARA ∆ — Search & Filter Engine  (v1)
   js/search.js

   Connects the existing search UI to Supabase.
   Replaces all placeholder/demo search results with
   real data from the listings table.

   Depends on:
     - window._supabase    (supabase-client.js)
     - window.JARAAuth     (auth-guard.js)
     - window.JARAProfile  (jara-profile.js)
     - window.JARAListings (jara-listings.js)

   TABLE OF CONTENTS
   1.  State
   2.  DOM refs
   3.  Debounce helper
   4.  Build Supabase query
   5.  Execute search
   6.  Render results
   7.  Result card builder
   8.  Loading state
   9.  Empty state
   10. Error state
   11. Filter listeners
   12. Search input listener
   13. Clear filters
   14. URL sync (persist state across page loads)
   15. Init
============================================================ */

document.addEventListener('DOMContentLoaded', async () => {

  /* ==========================================================
     1. STATE
     Single source of truth for every active filter value.
     Every search re-reads from here.
  ========================================================== */

  const S = {
    query:        '',
    type:         null,     // 'product' | 'service' | 'request' | null
    category:     null,
    school:       null,
    condition:    null,     // 'new' | 'used' | null
    priceMin:     null,
    priceMax:     null,
    sortBy:       'created_at',   // 'created_at' | 'price'
    sortAsc:      false,          // false = newest / highest price first
    limit:        20,
    offset:       0,
    total:        0,
    loading:      false,
    hasSearched:  false,
  };


  /* ==========================================================
     2. DOM REFS
     Match IDs/classes already in search/index.html.
     All names are read-only — nothing is renamed or moved.
  ========================================================== */

  const searchInput     = document.getElementById('searchInput')     ||
                          document.getElementById('mainSearchInput') ||
                          document.querySelector('[data-search-input]');

  const resultsGrid     = document.getElementById('searchResults')   ||
                          document.getElementById('resultsGrid')     ||
                          document.querySelector('[data-results-grid]');

  const resultsCount    = document.getElementById('searchCount')     ||
                          document.getElementById('resultsCount')    ||
                          document.querySelector('[data-results-count]');

  const loadingSpinner  = document.getElementById('searchSpinner')   ||
                          document.querySelector('[data-search-spinner]');

  const loadMoreBtn     = document.getElementById('loadMoreBtn');
  const loadMoreWrap    = document.getElementById('loadMoreWrap');
  const clearFiltersBtn = document.getElementById('clearFiltersBtn') ||
                          document.querySelector('[data-clear-filters]');

  // Type filter chips / buttons
  const typeChips       = document.querySelectorAll('[data-type]');

  // Category select / chips
  const categorySelect  = document.getElementById('filterCategory');
  const categoryChips   = document.querySelectorAll('[data-category]');

  // School filter
  const schoolSelect    = document.getElementById('filterSchool')    ||
                          document.querySelector('[name="filterSchool"]');

  // Sort select
  const sortSelect      = document.getElementById('filterSort')      ||
                          document.querySelector('[name="filterSort"]');

  // Condition chips / radio
  const conditionChips  = document.querySelectorAll('[data-condition]');

  // Price range inputs
  const priceMinInput   = document.getElementById('priceMin')        ||
                          document.querySelector('[name="priceMin"]');
  const priceMaxInput   = document.getElementById('priceMax')        ||
                          document.querySelector('[name="priceMax"]');

  // Filter panel toggle (mobile)
  const filterToggleBtn = document.getElementById('filterToggleBtn') ||
                          document.querySelector('[data-filter-toggle]');
  const filterPanel     = document.getElementById('filterPanel')     ||
                          document.querySelector('[data-filter-panel]');


  /* ==========================================================
     3. DEBOUNCE HELPER
     Prevents a Supabase query firing on every keystroke.
     300ms delay — feels instant but avoids thrashing.
  ========================================================== */

  function debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  const debouncedSearch = debounce(() => runSearch(true), 300);


  /* ==========================================================
     4. BUILD SUPABASE QUERY
     Constructs the full query from current state S.
     Structured so Phase 3's JARAListings.fetch() is reused
     where possible, then extended with search-specific params.
  ========================================================== */

  async function buildAndRunQuery() {
    const sb = window._supabase;
    if (!sb) return { data: [], count: 0, error: new Error('Supabase not ready') };

    try {
      /*
       Base select — reuses the same column set as jara-listings.js
       so cards render identically to explore/store pages.
      */
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
          updated_at,
          profiles (
            id,
            full_name,
            username,
            business_name,
            avatar_url,
            account_type,
            school,
            is_verified,
            is_founding_member,
            is_premium,
            pro_status
          )
        `, { count: 'exact' });

      /* ── Status: only show active, approved, visible listings ── */
      query = query.eq('status', 'active');

      /* ── Full-text / partial search ─────────────────────────────
         Supabase ilike performs case-insensitive partial matching.
         We search across title, description, and category.

         FUTURE: Replace with full-text search using a tsvector
         search_vector column for better relevance ranking:
           query = query.textSearch('search_vector', S.query, {
             type: 'websearch',
             config: 'english',
           });
      */
      if (S.query && S.query.trim().length > 0) {
        const term = S.query.trim();
        query = query.or(
          `title.ilike.%${term}%,description.ilike.%${term}%,category.ilike.%${term}%`
        );
      }

      /* ── Type filter ──────────────────────────────────────────── */
      if (S.type) {
        query = query.eq('listing_type', S.type);
      }

      /* ── Category filter ─────────────────────────────────────── */
      if (S.category) {
        query = query.ilike('category', S.category);
      }

      /* ── Condition filter ────────────────────────────────────── */
      if (S.condition) {
        query = query.eq('condition', S.condition);
      }

      /* ── Price range ─────────────────────────────────────────── */
      if (S.priceMin !== null && S.priceMin !== '') {
        query = query.gte('price', Number(S.priceMin));
      }
      if (S.priceMax !== null && S.priceMax !== '') {
        query = query.lte('price', Number(S.priceMax));
      }

      /* ── School filter ───────────────────────────────────────────
         School is on the profiles table — we filter in JS after
         fetching since Supabase JS v2 doesn't support filtering on
         joined tables directly in .select().

         FUTURE: Use an RPC or a view that joins listings + profiles
         and filter by school on the server:
           query = query.eq('profiles.school', S.school);
      */

      /* ── Sort ───────────────────────────────────────────────── */
      query = query.order(S.sortBy, { ascending: S.sortAsc });

      /* ── Pagination ──────────────────────────────────────────── */
      query = query.range(S.offset, S.offset + S.limit - 1);

      /* ── Execute ─────────────────────────────────────────────── */
      const { data, count, error } = await query;

      if (error) {
        console.error('JARASearch: query error:', error.message);
        return { data: [], count: 0, error };
      }

      /* ── Post-fetch school filter (JS-side) ─────────────────── */
      let results = data || [];
      if (S.school) {
        results = results.filter(
          l => l.profiles?.school?.toLowerCase() === S.school.toLowerCase()
        );
      }

      return { data: results, count: count || 0, error: null };

    } catch (err) {
      console.error('JARASearch: buildAndRunQuery unexpected error:', err.message);
      return { data: [], count: 0, error: err };
    }
  }


  /* ==========================================================
     5. EXECUTE SEARCH
     reset = true  → clear results, start from page 1
     reset = false → append next page (load more)
  ========================================================== */

  async function runSearch(reset = true) {
    if (S.loading) return;
    S.loading     = true;
    S.hasSearched = true;

    if (reset) {
      S.offset = 0;
      showLoading(true);
      if (resultsGrid) resultsGrid.innerHTML = '';
    } else {
      if (loadMoreBtn) {
        loadMoreBtn.disabled    = true;
        loadMoreBtn.textContent = 'Loading…';
      }
    }

    syncUrlState();

    try {
      const { data, count, error } = await buildAndRunQuery();

      showLoading(false);

      if (loadMoreBtn) {
        loadMoreBtn.disabled    = false;
        loadMoreBtn.textContent = 'Load More';
      }

      if (error) {
        showError();
        S.loading = false;
        return;
      }

      S.total   = count;
      S.offset += data.length;

      updateResultsCount(count);

      if (data.length === 0 && reset) {
        showEmpty();
      } else {
        renderResults(data);
      }

      // Show / hide load more
      const hasMore = S.offset < S.total;
      if (loadMoreWrap) loadMoreWrap.hidden = !hasMore;
      if (loadMoreBtn)  loadMoreBtn.hidden  = !hasMore;

    } catch (err) {
      console.error('JARASearch: runSearch error:', err.message);
      showLoading(false);
      showError();
    }

    S.loading = false;
  }


  /* ==========================================================
     6. RENDER RESULTS
     Appends result cards to the grid.
     Reuses the same card builder pattern as explore.js
     so cards look identical everywhere.
  ========================================================== */

  function renderResults(listings) {
    if (!resultsGrid) return;

    listings.forEach((listing, i) => {
      const card = buildResultCard(listing);
      card.style.animationDelay = `${i * 25}ms`;
      resultsGrid.appendChild(card);
    });
  }


  /* ==========================================================
     7. RESULT CARD BUILDER
     Matches the existing .listing-mini card structure
     already in the HTML/CSS — no new classes introduced.
  ========================================================== */

  function buildResultCard(listing) {
    const cover      = JARAListings.getCoverImage(listing);
    const price      = JARAListings.formatPrice(listing);
    const ago        = JARAListings.timeAgo(listing.created_at);
    const sellerName = JARAListings.getSellerName(listing);
    const seller     = listing.profiles || {};
    const typeLabel  = listing.listing_type
      ? listing.listing_type.charAt(0).toUpperCase() + listing.listing_type.slice(1)
      : '';

    const card = document.createElement('a');
    card.className = 'listing-mini j-card';
    card.href      = `../listing/index.html?id=${esc(listing.id)}`;
    card.setAttribute('aria-label', listing.title);
    card.style.animation = 'fade-up 250ms ease both';

    card.innerHTML = `
      <div class="listing-mini__img-wrap">
        ${cover
          ? `<img
               class="listing-mini__img"
               src="${esc(cover)}"
               alt="${esc(listing.title)}"
               loading="lazy"
             />`
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
        <p class="listing-mini__price">
          ${esc(price)}
          ${listing.negotiable
            ? `<span class="listing-mini__neg">Negotiable</span>`
            : ''
          }
        </p>
        <div class="listing-mini__meta">
          <div class="listing-mini__seller">
            ${seller.avatar_url
              ? `<img
                   class="listing-mini__avatar"
                   src="${esc(seller.avatar_url)}"
                   alt="${esc(sellerName)}"
                   loading="lazy"
                 />`
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
        ${listing.category
          ? `<span class="listing-mini__cat">${esc(listing.category)}</span>`
          : ''
        }
      </div>
    `;

    return card;
  }


  /* ==========================================================
     8. LOADING STATE
  ========================================================== */

  function showLoading(on) {
    if (loadingSpinner) loadingSpinner.hidden = !on;

    if (on && resultsGrid) {
      // Show skeleton cards while loading
      resultsGrid.innerHTML = '';
      for (let i = 0; i < 6; i++) {
        const skel = document.createElement('div');
        skel.className = 'listing-mini j-skel j-skel-card';
        skel.style.minHeight = '220px';
        skel.setAttribute('aria-hidden', 'true');
        resultsGrid.appendChild(skel);
      }
    }
  }


  /* ==========================================================
     9. EMPTY STATE
  ========================================================== */

  function showEmpty() {
    if (!resultsGrid) return;
    resultsGrid.innerHTML = '';

    const hasActiveFilters = S.query || S.type || S.category ||
                             S.school || S.condition ||
                             S.priceMin || S.priceMax;

    if (window.jaraEmpty) {
      window.jaraEmpty(resultsGrid, {
        icon:      'fa-solid fa-magnifying-glass',
        title:     'No matching listings found',
        body:      hasActiveFilters
          ? 'Try different keywords or clear your filters.'
          : 'No listings have been posted yet. Be the first!',
        btnLabel:  hasActiveFilters ? 'Clear Filters' : 'Create Listing',
        btnAction: hasActiveFilters ? clearAllFilters : null,
        btnHref:   hasActiveFilters ? null : '../sell/index.html',
      });
    } else {
      // Fallback if jara-polish hasn't loaded
      resultsGrid.innerHTML = `
        <div class="search-empty" style="text-align:center;padding:3rem 1rem;grid-column:1/-1">
          <p style="font-family:var(--sans);font-size:1rem;font-weight:700;color:var(--text);margin-bottom:.5rem">
            No matching listings found
          </p>
          <p style="font-size:.875rem;color:var(--text-2);margin-bottom:1rem">
            Try different keywords or clear your filters.
          </p>
          <button id="inline清清ClearBtn" type="button"
                  style="background:var(--accent);color:#fff;border:none;padding:10px 20px;
                         border-radius:9999px;font-family:var(--sans);font-weight:700;cursor:pointer">
            Clear Filters
          </button>
        </div>
      `;
      document.getElementById('inlineClearBtn')
        ?.addEventListener('click', clearAllFilters);
    }
  }


  /* ==========================================================
     10. ERROR STATE
  ========================================================== */

  function showError() {
    if (!resultsGrid) return;
    resultsGrid.innerHTML = '';
    if (window.jaraError) {
      window.jaraError(resultsGrid, {
        title:   "Couldn't load results",
        body:    'Please check your connection and try again.',
        onRetry: () => runSearch(true),
      });
    }
  }


  /* ==========================================================
     11. FILTER LISTENERS
     Wire every existing filter control to update state + search.
     No new HTML controls are created — only listeners added.
  ========================================================== */

  /* ---- Type chips (Product / Service / Request) ---- */
  typeChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const val  = chip.dataset.type;
      S.type     = S.type === val ? null : val;
      S.offset   = 0;

      typeChips.forEach(c =>
        c.classList.toggle('chip--active', c.dataset.type === S.type)
      );

      runSearch(true);
    });
  });

  /* ---- Category select ---- */
  categorySelect?.addEventListener('change', () => {
    S.category = categorySelect.value || null;
    S.offset   = 0;
    runSearch(true);
  });

  /* ---- Category chips (if present instead of select) ---- */
  categoryChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const val    = chip.dataset.category;
      S.category   = S.category === val ? null : val;
      S.offset     = 0;

      categoryChips.forEach(c =>
        c.classList.toggle('chip--active', c.dataset.category === S.category)
      );

      runSearch(true);
    });
  });

  /* ---- School select ---- */
  schoolSelect?.addEventListener('change', () => {
    S.school = schoolSelect.value || null;
    S.offset = 0;
    runSearch(true);
  });

  /* ---- Sort select ---- */
  sortSelect?.addEventListener('change', () => {
    const val = sortSelect.value || 'newest';

    switch (val) {
      case 'newest':
        S.sortBy  = 'created_at';
        S.sortAsc = false;
        break;
      case 'oldest':
        S.sortBy  = 'created_at';
        S.sortAsc = true;
        break;
      case 'price_low':
        S.sortBy  = 'price';
        S.sortAsc = true;
        break;
      case 'price_high':
        S.sortBy  = 'price';
        S.sortAsc = false;
        break;
      default:
        S.sortBy  = 'created_at';
        S.sortAsc = false;
    }

    S.offset = 0;
    runSearch(true);
  });

  /* ---- Condition chips ---- */
  conditionChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const val    = chip.dataset.condition;
      S.condition  = S.condition === val ? null : val;
      S.offset     = 0;

      conditionChips.forEach(c =>
        c.classList.toggle('chip--active', c.dataset.condition === S.condition)
      );

      runSearch(true);
    });
  });

  /* ---- Price range inputs (debounced) ---- */
  const debouncedPriceSearch = debounce(() => {
    S.priceMin = priceMinInput?.value || null;
    S.priceMax = priceMaxInput?.value || null;
    S.offset   = 0;
    runSearch(true);
  }, 500);

  priceMinInput?.addEventListener('input', debouncedPriceSearch);
  priceMaxInput?.addEventListener('input', debouncedPriceSearch);

  /* ---- Filter panel toggle (mobile) ---- */
  filterToggleBtn?.addEventListener('click', () => {
    if (!filterPanel) return;
    const isOpen = !filterPanel.hidden;
    filterPanel.hidden = isOpen;
    filterToggleBtn.setAttribute('aria-expanded', String(!isOpen));
  });

  /* ---- Load more ---- */
  loadMoreBtn?.addEventListener('click', () => runSearch(false));


  /* ==========================================================
     12. SEARCH INPUT LISTENER
     Uses the 300ms debounce — typing feels instant but
     Supabase is only hit when the user pauses.
  ========================================================== */

  searchInput?.addEventListener('input', () => {
    S.query  = searchInput.value.trim();
    S.offset = 0;
    debouncedSearch();
  });

  /* ---- Also run on Enter key without waiting for debounce ---- */
  searchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      S.query = searchInput.value.trim();
      S.offset = 0;
      runSearch(true);
    }
  });


  /* ==========================================================
     13. CLEAR FILTERS
  ========================================================== */

  function clearAllFilters() {
    S.query     = '';
    S.type      = null;
    S.category  = null;
    S.school    = null;
    S.condition = null;
    S.priceMin  = null;
    S.priceMax  = null;
    S.sortBy    = 'created_at';
    S.sortAsc   = false;
    S.offset    = 0;

    // Reset input values
    if (searchInput)    searchInput.value    = '';
    if (categorySelect) categorySelect.value = '';
    if (schoolSelect)   schoolSelect.value   = '';
    if (sortSelect)     sortSelect.value     = 'newest';
    if (priceMinInput)  priceMinInput.value  = '';
    if (priceMaxInput)  priceMaxInput.value  = '';

    // Reset all chip active states
    [typeChips, categoryChips, conditionChips].forEach(chips => {
      chips.forEach(c => c.classList.remove('chip--active'));
    });

    syncUrlState();
    runSearch(true);
  }

  clearFiltersBtn?.addEventListener('click', clearAllFilters);


  /* ==========================================================
     14. URL STATE SYNC
     Persists search state in the URL query string.
     This means:
       • Sharing a search URL works.
       • Back button returns to same results.
       • Page refresh keeps the search.
  ========================================================== */

  function syncUrlState() {
    const params = new URLSearchParams();
    if (S.query)     params.set('q',    S.query);
    if (S.type)      params.set('type', S.type);
    if (S.category)  params.set('cat',  S.category);
    if (S.school)    params.set('school', S.school);
    if (S.condition) params.set('cond', S.condition);
    if (S.priceMin)  params.set('min',  S.priceMin);
    if (S.priceMax)  params.set('max',  S.priceMax);
    if (S.sortBy !== 'created_at' || S.sortAsc) {
      params.set('sort', S.sortAsc ? `${S.sortBy}_asc` : `${S.sortBy}_desc`);
    }

    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;

    window.history.replaceState({}, '', newUrl);
  }

  function loadUrlState() {
    const params = new URLSearchParams(window.location.search);

    if (params.get('q'))      S.query     = params.get('q');
    if (params.get('type'))   S.type      = params.get('type');
    if (params.get('cat'))    S.category  = params.get('cat');
    if (params.get('school')) S.school    = params.get('school');
    if (params.get('cond'))   S.condition = params.get('cond');
    if (params.get('min'))    S.priceMin  = params.get('min');
    if (params.get('max'))    S.priceMax  = params.get('max');

    const sort = params.get('sort');
    if (sort) {
      const [field, dir] = sort.split('_');
      S.sortBy  = field === 'price' ? 'price' : 'created_at';
      S.sortAsc = dir === 'asc';
    }

    // Restore UI to match loaded state
    if (searchInput && S.query)       searchInput.value    = S.query;
    if (categorySelect && S.category) categorySelect.value = S.category;
    if (schoolSelect && S.school)     schoolSelect.value   = S.school;

    if (S.type) {
      typeChips.forEach(c =>
        c.classList.toggle('chip--active', c.dataset.type === S.type)
      );
    }

    if (S.category) {
      categoryChips.forEach(c =>
        c.classList.toggle('chip--active', c.dataset.category === S.category)
      );
    }

    if (S.condition) {
      conditionChips.forEach(c =>
        c.classList.toggle('chip--active', c.dataset.condition === S.condition)
      );
    }

    if (sortSelect && S.sortBy) {
      if (S.sortBy === 'price' && !S.sortAsc)  sortSelect.value = 'price_high';
      if (S.sortBy === 'price' && S.sortAsc)   sortSelect.value = 'price_low';
      if (S.sortBy === 'created_at' && S.sortAsc) sortSelect.value = 'oldest';
    }

    if (priceMinInput && S.priceMin) priceMinInput.value = S.priceMin;
    if (priceMaxInput && S.priceMax) priceMaxInput.value = S.priceMax;
  }


  /* ==========================================================
     15. RESULTS COUNT UPDATE
  ========================================================== */

  function updateResultsCount(count) {
    if (!resultsCount) return;
    if (!S.hasSearched) { resultsCount.textContent = ''; return; }
    resultsCount.textContent =
      count === 0  ? 'No results' :
      count === 1  ? '1 result'   :
                     `${count.toLocaleString()} results`;
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

  function getInitials(name) {
    if (!name) return '?';
    const words = name.trim().split(' ').filter(Boolean);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }


  /* ==========================================================
     INIT
  ========================================================== */

  async function init() {
    // Load profile for nav avatar etc.
    try {
      const profile = await JARAProfile.load();
      if (profile) {
        window.__JARA_IS_FOUNDER = JARAProfile.isFounder(profile);
        window.__JARA_IS_PRO     = JARAProfile.isPro(profile);
      }
    } catch (e) {
      // Non-fatal — search still works without profile
    }

    // Restore state from URL if present (e.g. shared link, back button)
    loadUrlState();

    /*
     Run initial search:
       - If URL has a query/filter → search immediately with those params
       - If arriving fresh → show recent listings (no filter = all active)
    */
    await runSearch(true);
  }

  init();

});
