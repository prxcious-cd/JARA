/* ============================================================
   JARA ∆ — Store / Business Profile Page Logic
   js/store.js

   Depends on:
     - window._supabase  (js/supabase-client.js)
     - DOM in store/index.html

   TABLE OF CONTENTS
   1.  State
   2.  Placeholder data  ← all blocks marked with FUTURE:
   3.  DOM references
   4.  URL parameter handling (store ID from query string)
   5.  Store header render
   6.  Stats render + count-up
   7.  About section render
   8.  Content tabs
   9.  Render: Products
   10. Render: Services
   11. Render: Requests
   12. Reviews section render
   13. Similar businesses render
   14. Contact section render
   15. Follow button
   16. Share store
   17. Pull-to-refresh
   18. Topbar scroll effect
   19. Utility helpers
   20. Init
============================================================ */

document.addEventListener('DOMContentLoaded', () => {


  /* ==========================================================
     1. STATE
  ========================================================== */
  const state = {
    storeId:      null,   // From URL query param ?store=JARA-00001
    store:        null,   // Loaded store profile object
    activeTab:    'products',
    isFollowing:  false,
    isRefreshing: false,
  };


  /* ==========================================================
     2. PLACEHOLDER DATA
  ========================================================== */

  /* ---- STORE PROFILE ----
     FUTURE: SELECT p.id, p.jara_id, p.full_name, p.business_name,
               p.account_type, p.avatar_url, p.bio, p.is_verified,
               p.is_premium, p.jara_points, p.whatsapp_number,
               p.phone_number, p.created_at,
               s.name AS school_name
             FROM profiles p
             LEFT JOIN schools s ON s.id = p.school_id
             WHERE p.jara_id = :store_id OR p.id = :store_uuid
             LIMIT 1
  ---- */
  const PLACEHOLDER_STORE = {
    id:                'biz-001',
    jara_id:           'JARA-00042',
    full_name:         'Blessing Adeyemi',
    business_name:     "Blessing's Kitchen",
    category:          'Food & Drinks',
    tagline:           'Homemade meals, pastries and custom cakes. Made with love every day. 🍛🎂',
    avatar_url:        null,
    bio:               "We provide freshly cooked meals, custom birthday cakes and daily pastries. Order before 12pm for afternoon delivery anywhere on campus. Family recipes, premium ingredients, student-friendly prices.",
    location:          'Block C, Main Campus, Ede',
    school:            "Redeemer's University, Ede",
    phone_number:      '08073436050',
    whatsapp_number:   '2348073436050',
    email:             null,
    website:           null,
    opening_hours:     'Mon – Sat: 7am – 9pm · Sun: 12pm – 6pm',
    is_verified:       true,
    is_premium:        true,
    is_founding_member:true,
    jara_points:       284,
    created_at:        '2025-01-10T00:00:00Z',
    // Extra store meta
    fast_replies:      true,
    is_local:          true,
  };

  /* ---- STATS ----
     FUTURE: SELECT
               (SELECT COUNT(*) FROM products WHERE owner_id = :id AND status = 'active') AS products,
               (SELECT COUNT(*) FROM services WHERE provider_id = :id AND status = 'active') AS services,
               (SELECT COUNT(*) FROM transactions WHERE seller_id = :id AND status = 'completed') AS completed,
               0 AS followers,  -- FUTURE followers table
               (SELECT COALESCE(SUM(view_count),0) FROM products WHERE owner_id = :id) +
               (SELECT COALESCE(SUM(view_count),0) FROM services WHERE provider_id = :id) AS views
  ---- */
  const PLACEHOLDER_STATS = {
    products:  6,
    services:  3,
    completed: 61,
    followers: 128,
    views:     1240,
  };

  /* ---- PRODUCTS ----
     FUTURE: SELECT id, title, images, price, price_type, status, view_count
             FROM products WHERE owner_id = :store_id AND status = 'active'
             ORDER BY created_at DESC LIMIT 12
  ---- */
  const PLACEHOLDER_PRODUCTS = [
    {
      id:     'bp1',
      title:  'Jollof Rice & Chicken — Daily',
      emoji:  '🍛',
      image:  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=300&fit=crop',
      price:  '₦1,200',
      status: 'active',
      views:  89,
      link:   '../listing/index.html?id=bp1',
    },
    {
      id:     'bp2',
      title:  'Custom Birthday Cake',
      emoji:  '🎂',
      image:  'https://images.unsplash.com/photo-1481833761820-0509d3217039?w=300&h=300&fit=crop',
      price:  'From ₦8,000',
      status: 'active',
      views:  134,
      link:   '../listing/index.html?id=bp2',
    },
    {
      id:     'bp3',
      title:  'Chin-Chin & Pastries Pack',
      emoji:  '🧁',
      image:  null,
      price:  '₦1,500',
      status: 'active',
      views:  42,
      link:   '../listing/index.html?id=bp3',
    },
    {
      id:     'bp4',
      title:  'Breakfast Combo — Eggs & Bread',
      emoji:  '🍳',
      image:  null,
      price:  '₦800',
      status: 'active',
      views:  67,
      link:   '../listing/index.html?id=bp4',
    },
    {
      id:     'bp5',
      title:  'Fried Rice & Coleslaw',
      emoji:  '🍚',
      image:  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=300&fit=crop',
      price:  '₦1,500',
      status: 'active',
      views:  55,
      link:   '../listing/index.html?id=bp5',
    },
    {
      id:     'bp6',
      title:  'Small Chops — Event Catering',
      emoji:  '🥟',
      image:  null,
      price:  'From ₦5,000',
      status: 'active',
      views:  29,
      link:   '../listing/index.html?id=bp6',
    },
  ];

  /* ---- SERVICES ----
     FUTURE: SELECT id, title, images, price, price_type, status, view_count
             FROM services WHERE provider_id = :store_id AND status = 'active'
             ORDER BY created_at DESC LIMIT 12
  ---- */
  const PLACEHOLDER_SERVICES = [
    {
      id:     'bs1',
      title:  'Campus Catering — Events & Parties',
      emoji:  '🎉',
      image:  null,
      price:  'Quote on Request',
      status: 'active',
      views:  23,
      link:   '../listing/index.html?id=bs1',
    },
    {
      id:     'bs2',
      title:  'Weekly Meal Plan — 5 Days',
      emoji:  '📅',
      image:  null,
      price:  '₦6,000/week',
      status: 'active',
      views:  41,
      link:   '../listing/index.html?id=bs2',
    },
    {
      id:     'bs3',
      title:  'Hostel Delivery — Same Floor',
      emoji:  '🚪',
      image:  null,
      price:  '+ ₦200',
      status: 'active',
      views:  18,
      link:   '../listing/index.html?id=bs3',
    },
  ];

  /* ---- REQUESTS ----
     FUTURE: SELECT id, title, status, price_type, created_at
             FROM requests WHERE owner_id = :store_id
             ORDER BY created_at DESC LIMIT 10
  ---- */
  const PLACEHOLDER_REQUESTS = [
    {
      id:     'brq1',
      title:  'Catering for 50-person event — need quote',
      emoji:  '📢',
      status: 'active',
      meta:   'Large order',
      time:   '2 days ago',
      link:   '../listing/index.html?id=brq1',
    },
  ];

  /* ---- REVIEWS ----
     FUTURE: SELECT r.score, r.review, r.created_at,
               p.full_name, p.avatar_url
             FROM ratings r
             JOIN profiles p ON p.id = r.rater_id
             WHERE r.ratee_id = :store_id
             ORDER BY r.created_at DESC LIMIT 5
  ---- */
  const PLACEHOLDER_REVIEWS = [
    {
      id:       'rv1',
      score:    5,
      reviewer: 'Adaeze O.',
      initials: 'AO',
      avatar:   null,
      body:     "The jollof rice is genuinely the best on campus. I've been ordering every week since January. Fast delivery and always hot. Blessing's Kitchen never disappoints.",
      time:     '3 days ago',
    },
    {
      id:       'rv2',
      score:    5,
      reviewer: 'Tunde E.',
      initials: 'TE',
      avatar:   null,
      body:     "Ordered a custom birthday cake for my roommate and everyone was impressed. Beautiful decoration, delicious taste. Highly recommended for events.",
      time:     '1 week ago',
    },
    {
      id:       'rv3',
      score:    4,
      reviewer: 'Fatima K.',
      initials: 'FK',
      avatar:   null,
      body:     "Very good food and reliable delivery. Sometimes a little late but the quality makes up for it. Will keep ordering.",
      time:     '2 weeks ago',
    },
  ];

  // Rating breakdown (how many reviews per star)
  const RATING_BREAKDOWN = { 5: 48, 4: 9, 3: 3, 2: 1, 1: 0 };
  const RATING_AVERAGE   = 4.9;

  /* ---- SIMILAR BUSINESSES ----
     FUTURE: SELECT id, full_name, business_name, avatar_url,
               is_verified, is_premium, jara_points
             FROM profiles
             WHERE account_type IN ('business','service_provider')
             AND school_id = :school_id AND id != :store_id
             ORDER BY jara_points DESC LIMIT 8
  ---- */
  const PLACEHOLDER_SIMILAR = [
    { id: 'sim1', name: "Zainab's Studio",  category: 'Creative Services', initials: 'ZS', verified: true,  pro: true  },
    { id: 'sim2', name: 'Emeka Power',      category: 'Power & Generator', initials: 'EP', verified: false, pro: false },
    { id: 'sim3', name: 'Kemi Clean',       category: 'Laundry & Errands', initials: 'KC', verified: true,  pro: false },
    { id: 'sim4', name: 'David Prints',     category: 'Printing & Typing', initials: 'DP', verified: false, pro: false },
    { id: 'sim5', name: 'Ngozi Fashion',    category: 'Fashion & Clothing', initials: 'NF', verified: true,  pro: true  },
  ];


  /* ==========================================================
     3. DOM REFERENCES
  ========================================================== */
  const storeLogoSkeleton  = document.getElementById('storeLogoSkeleton');
  const storeLogoEl        = document.getElementById('storeLogoEl');
  const verifiedRing       = document.getElementById('verifiedRing');
  const storeName          = document.getElementById('storeName');
  const storeSkeleton1     = document.getElementById('storeSkeleton1');
  const storeSkeleton2     = document.getElementById('storeSkeleton2');
  const storeVerifiedMark  = document.getElementById('storeVerifiedMark');
  const storeCategory      = document.getElementById('storeCategory');
  const storeBadges        = document.getElementById('storeBadges');
  const storeTagline       = document.getElementById('storeTagline');
  const storeMeta          = document.getElementById('storeMeta');
  const storeFeatures      = document.getElementById('storeFeatures');

  const statProducts  = document.getElementById('statProducts');
  const statServices  = document.getElementById('statServices');
  const statCompleted = document.getElementById('statCompleted');
  const statFollowers = document.getElementById('statFollowers');
  const statViews     = document.getElementById('statViews');

  const aboutDescription = document.getElementById('aboutDescription');
  const aboutHours       = document.getElementById('aboutHours');
  const openStatus       = document.getElementById('openStatus');
  const aboutPhone       = document.getElementById('aboutPhone');
  const aboutWhatsapp    = document.getElementById('aboutWhatsapp');
  const aboutEmail       = document.getElementById('aboutEmail');
  const aboutEmailRow    = document.getElementById('aboutEmailRow');
  const aboutWebsite     = document.getElementById('aboutWebsite');
  const aboutWebsiteRow  = document.getElementById('aboutWebsiteRow');
  const aboutLocation    = document.getElementById('aboutLocation');

  const contentTabs    = document.querySelectorAll('.content-tab');
  const contentPanels  = document.querySelectorAll('.content-panel');
  const productsGrid   = document.getElementById('productsGrid');
  const servicesGrid   = document.getElementById('servicesGrid');
  const requestsList   = document.getElementById('requestsList');

  const tabProductsCount = document.getElementById('tabProductsCount');
  const tabServicesCount = document.getElementById('tabServicesCount');
  const tabRequestsCount = document.getElementById('tabRequestsCount');

  const ratingSummary  = document.getElementById('ratingSummary');
  const ratingStars    = document.getElementById('ratingStars');
  const ratingCount    = document.getElementById('ratingCount');
  const ratingNumber   = document.getElementById('ratingNumber');
  const ratingBars     = document.getElementById('ratingBars');
  const reviewsList    = document.getElementById('reviewsList');
  const similarStrip   = document.getElementById('similarStrip');
  const contactWhatsapp = document.getElementById('contactWhatsapp');
  const contactPhone   = document.getElementById('contactPhone');
  const contactBtn     = document.getElementById('contactBtn');
  const followBtn      = document.getElementById('followBtn');
  const followLabel    = document.getElementById('followLabel');
  const followIcon     = document.getElementById('followIcon');
  const shareBtn       = document.getElementById('shareBtn');
  const topbarShareBtn = document.getElementById('topbarShareBtn');
  const topbarFollowBtn = document.getElementById('topbarFollowBtn');
  const pullIndicator  = document.getElementById('pullIndicator');
  const pullIcon       = document.getElementById('pullIcon');
  const pullLabel      = document.getElementById('pullLabel');


  /* ==========================================================
     4. URL PARAMETER HANDLING
     The store page loads a specific store by ID.
     Example URLs:
       /store/index.html?store=JARA-00042
       /store/index.html?store=biz-uuid-here
  ========================================================== */

  function getStoreIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('store') || null;
  }


  /* ==========================================================
     5. STORE HEADER RENDER
  ========================================================== */

  function renderStoreHeader(store) {
    state.store = store;

    // ---- Logo ----
    storeLogoSkeleton.style.display = 'none';
    storeLogoEl.classList.remove('store-logo--hidden');

    if (store.avatar_url) {
      const img = document.createElement('img');
      img.src = store.avatar_url;
      img.alt = store.business_name || store.full_name;
      storeLogoEl.appendChild(img);
    } else {
      const name     = store.business_name || store.full_name || 'J';
      const words    = name.trim().split(' ');
      const initials = words.length >= 2
        ? words[0][0] + words[words.length - 1][0]
        : words[0].slice(0, 2);
      storeLogoEl.textContent = initials.toUpperCase();
    }

    if (store.is_premium) {
      verifiedRing.removeAttribute('hidden');
    }

    // ---- Name ----
    storeSkeleton1.style.display = 'none';
    storeName.classList.remove('store-name--hidden');
    storeName.textContent = store.business_name || store.full_name || 'Business';

    // Update page title
    document.title = `${storeName.textContent} — JARA ∆`;

    if (store.is_verified) {
      storeVerifiedMark.removeAttribute('hidden');
    }

    // ---- Category ----
    storeSkeleton2.style.display = 'none';
    storeCategory.classList.remove('store-category--hidden');
    storeCategory.textContent = store.category || 'Business';

    // ---- Badges ----
    const badges = [];
    if (store.is_founding_member) badges.push({ cls: 'store-badge--founding', icon: 'fa-solid fa-medal',       label: '🏆 Founding Member' });
    if (store.is_premium)         badges.push({ cls: 'store-badge--pro',      icon: 'fa-solid fa-crown',       label: '🟣 JARA PRO' });
    if (store.is_verified)        badges.push({ cls: 'store-badge--verified', icon: 'fa-solid fa-circle-check',label: '✓ Verified' });

    if (badges.length > 0) {
      storeBadges.innerHTML = badges.map(b =>
        `<span class="store-badge ${b.cls}">
           <i class="${b.icon}" aria-hidden="true"></i> ${escapeHTML(b.label)}
         </span>`
      ).join('');
      storeBadges.removeAttribute('hidden');
    }

    // ---- Tagline ----
    if (store.tagline) {
      storeTagline.textContent = store.tagline;
      storeTagline.removeAttribute('hidden');
    }

    // ---- Meta ----
    const locationEl = document.querySelector('#storeLocation span');
    const joinedEl   = document.querySelector('#storeJoined span');

    if (store.location || store.school) {
      locationEl.textContent = store.location || store.school;
      joinedEl.textContent   = 'Joined ' + formatJoinDate(store.created_at);
      storeMeta.removeAttribute('hidden');
    }

    // ---- Feature chips ----
    const features = [];
    if (store.is_verified)       features.push({ cls: 'feature-chip--verified', icon: 'fa-solid fa-circle-check',  label: '✓ Verified by JARA' });
    if (store.is_premium)        features.push({ cls: 'feature-chip--pro',      icon: 'fa-solid fa-crown',         label: '🟣 JARA PRO' });
    if (store.is_founding_member)features.push({ cls: 'feature-chip--founding', icon: 'fa-solid fa-medal',         label: '🏆 Founding Member' });
    if (store.fast_replies)      features.push({ cls: 'feature-chip--fast',     icon: 'fa-solid fa-bolt',          label: '⭐ Fast Replies' });
    if (store.is_local)          features.push({ cls: 'feature-chip--local',    icon: 'fa-solid fa-location-dot',  label: '📍 Local Business' });

    if (features.length > 0) {
      storeFeatures.innerHTML = features.map(f =>
        `<span class="feature-chip ${f.cls}">
           <i class="${f.icon}" aria-hidden="true"></i>
           ${escapeHTML(f.label)}
         </span>`
      ).join('');
      storeFeatures.removeAttribute('hidden');
    }
  }


  /* ==========================================================
     6. STATS RENDER + COUNT-UP
  ========================================================== */

  function renderStats(stats) {
    [
      [statProducts,  stats.products],
      [statServices,  stats.services],
      [statCompleted, stats.completed],
      [statFollowers, stats.followers],
      [statViews,     stats.views],
    ].forEach(([el, val]) => {
      el.classList.remove('skeleton-pulse');
      countUp(el, val);
    });
  }

  function countUp(el, target) {
    if (!el) return;
    let current = 0;
    const step  = Math.max(1, Math.ceil(target / 20));
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = current >= 1000
        ? (current / 1000).toFixed(1) + 'k'
        : current;
      if (current >= target) clearInterval(timer);
    }, 40);
  }


  /* ==========================================================
     7. ABOUT SECTION RENDER
  ========================================================== */

  function renderAbout(store) {
    // Description
    aboutDescription.textContent = store.bio || 'No description provided.';

    // Opening hours + open/closed status
    if (store.opening_hours) {
      aboutHours.textContent = store.opening_hours;
      const isOpen = checkIfOpen();
      openStatus.textContent  = isOpen ? 'Open Now' : 'Closed';
      openStatus.className    = isOpen
        ? 'about-row__status about-row__status--open'
        : 'about-row__status about-row__status--closed';
    }

    // Phone
    if (store.phone_number) {
      aboutPhone.textContent = store.phone_number;
      aboutPhone.href        = `tel:${store.phone_number}`;
    }

    // WhatsApp
    if (store.whatsapp_number) {
      const num = store.whatsapp_number.replace(/\D/g,'');
      aboutWhatsapp.textContent = '+' + num;
      aboutWhatsapp.href        = `https://wa.me/${num}?text=Hi, I found you on JARA ∆`;
    }

    // Email (optional)
    if (store.email) {
      aboutEmail.textContent = store.email;
      aboutEmail.href        = `mailto:${store.email}`;
      aboutEmailRow.removeAttribute('hidden');
    }

    // Website (optional)
    if (store.website) {
      const displayUrl = store.website.replace(/^https?:\/\//, '');
      aboutWebsite.textContent = displayUrl;
      aboutWebsite.href        = store.website;
      aboutWebsiteRow.removeAttribute('hidden');
    }

    // Location
    aboutLocation.textContent = store.location || store.school || 'On Campus';
  }

  /** Naive open/closed check — Mon-Sat 7am-9pm heuristic */
  function checkIfOpen() {
    const now  = new Date();
    const day  = now.getDay();   // 0 = Sun, 6 = Sat
    const hour = now.getHours();

    if (day === 0) return hour >= 12 && hour < 18; // Sun 12-6
    return hour >= 7 && hour < 21;                 // Mon-Sat 7am-9pm
  }


  /* ==========================================================
     8. CONTENT TABS
  ========================================================== */

  function switchTab(tabName) {
    state.activeTab = tabName;

    contentTabs.forEach(t => {
      const isActive = t.dataset.tab === tabName;
      t.setAttribute('aria-selected', isActive ? 'true' : 'false');
      t.classList.toggle('content-tab--active', isActive);
    });

    contentPanels.forEach(p => {
      const isActive = p.id === `panel${capitalise(tabName)}`;
      if (isActive) p.removeAttribute('hidden');
      else          p.setAttribute('hidden', '');
    });
  }

  contentTabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  function capitalise(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }


  /* ==========================================================
     9. RENDER: PRODUCTS
  ========================================================== */

  function renderProducts(items) {
    productsGrid.innerHTML = '';
    tabProductsCount.textContent = items.length;

    if (!items || items.length === 0) {
      productsGrid.style.display = 'block';
      productsGrid.appendChild(buildEmptyState(
        'fa-solid fa-box-open',
        'No products yet',
        'This business hasn't listed any products yet.'
      ));
      return;
    }

    productsGrid.style.display = '';
    items.forEach((item, i) => {
      productsGrid.appendChild(buildStoreCard(item, i));
    });
  }


  /* ==========================================================
     10. RENDER: SERVICES
  ========================================================== */

  function renderServices(items) {
    servicesGrid.innerHTML = '';
    tabServicesCount.textContent = items.length;

    if (!items || items.length === 0) {
      servicesGrid.style.display = 'block';
      servicesGrid.appendChild(buildEmptyState(
        'fa-solid fa-screwdriver-wrench',
        'No services listed',
        'This business hasn't added any services yet.'
      ));
      return;
    }

    servicesGrid.style.display = '';
    items.forEach((item, i) => {
      servicesGrid.appendChild(buildStoreCard(item, i));
    });
  }


  /* ==========================================================
     11. RENDER: REQUESTS
  ========================================================== */

  function renderRequests(items) {
    requestsList.innerHTML = '';
    tabRequestsCount.textContent = items.length;

    if (!items || items.length === 0) {
      requestsList.appendChild(buildEmptyState(
        'fa-solid fa-bullhorn',
        'No requests',
        'This business hasn't posted any requests.'
      ));
      return;
    }

    items.forEach((item, i) => {
      const el = document.createElement('a');
      el.className = 'store-list-item';
      el.href      = item.link || '#';
      el.setAttribute('role', 'listitem');
      el.style.animationDelay = `${i * 50}ms`;
      el.style.animation      = 'fade-up 260ms ease both';

      el.innerHTML = `
        <div class="store-list-item__icon" aria-hidden="true">${item.emoji || '📢'}</div>
        <div class="store-list-item__content">
          <p class="store-list-item__title">${escapeHTML(item.title)}</p>
          <div class="store-list-item__meta">
            <span class="status-pill status-pill--${item.status}">${escapeHTML(capitalise(item.status))}</span>
            ${item.meta ? `<span>${escapeHTML(item.meta)}</span>` : ''}
            ${item.time ? `<span>${escapeHTML(item.time)}</span>` : ''}
          </div>
        </div>
        <i class="fa-solid fa-chevron-right store-list-item__arrow" aria-hidden="true"></i>
      `;

      requestsList.appendChild(el);
    });
  }


  /* ==========================================================
     12. REVIEWS SECTION RENDER
  ========================================================== */

  function renderReviews(reviews, breakdown, average) {
    // Rating number + stars
    ratingNumber.textContent = average.toFixed(1);
    ratingStars.innerHTML    = buildStars(average);

    const total = Object.values(breakdown).reduce((a,b) => a + b, 0);
    ratingCount.textContent = `${total} review${total !== 1 ? 's' : ''}`;

    // Bar breakdown
    ratingBars.innerHTML = '';
    [5, 4, 3, 2, 1].forEach(star => {
      const count = breakdown[star] || 0;
      const pct   = total > 0 ? Math.round((count / total) * 100) : 0;

      const row = document.createElement('div');
      row.className = 'rating-bar-row';
      row.innerHTML = `
        <span class="rating-bar-row__label">${star}</span>
        <div class="rating-bar-row__track">
          <div class="rating-bar-row__fill" style="width: 0%;" data-target="${pct}"></div>
        </div>
        <span class="rating-bar-row__count">${count}</span>
      `;
      ratingBars.appendChild(row);
    });

    // Animate bars after render
    requestAnimationFrame(() => {
      document.querySelectorAll('.rating-bar-row__fill').forEach(fill => {
        const target = fill.dataset.target;
        setTimeout(() => { fill.style.width = target + '%'; }, 200);
      });
    });

    // Review cards
    reviewsList.innerHTML = '';

    if (!reviews || reviews.length === 0) {
      reviewsList.appendChild(buildEmptyState(
        'fa-solid fa-star',
        'No reviews yet',
        'Reviews from customers will appear here after completed transactions.'
      ));
      return;
    }

    reviews.forEach((review, i) => {
      const card = document.createElement('div');
      card.className = 'review-card';
      card.setAttribute('role', 'listitem');
      card.style.animationDelay = `${i * 60}ms`;
      card.style.animation      = 'fade-up 280ms ease both';

      card.innerHTML = `
        <div class="review-card__header">
          <div class="review-card__avatar" aria-hidden="true">
            ${review.avatar
              ? `<img src="${escapeHTML(review.avatar)}" alt="${escapeHTML(review.reviewer)}" />`
              : escapeHTML(review.initials || 'J')
            }
          </div>
          <div class="review-card__meta">
            <p class="review-card__name">${escapeHTML(review.reviewer)}</p>
            <p class="review-card__time">${escapeHTML(review.time)}</p>
          </div>
          <div class="review-card__stars" aria-label="${review.score} stars">
            ${buildStars(review.score)}
          </div>
        </div>
        <p class="review-card__body">${escapeHTML(review.body)}</p>
      `;

      reviewsList.appendChild(card);
    });
  }

  function buildStars(score) {
    const full  = Math.floor(score);
    const half  = score % 1 >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;

    return [
      ...Array(full).fill('<i class="fa-solid fa-star"></i>'),
      ...Array(half).fill('<i class="fa-solid fa-star-half-stroke"></i>'),
      ...Array(empty).fill('<i class="fa-regular fa-star"></i>'),
    ].join('');
  }


  /* ==========================================================
     13. SIMILAR BUSINESSES RENDER
  ========================================================== */

  function renderSimilar(businesses) {
    similarStrip.innerHTML = '';

    if (!businesses || businesses.length === 0) {
      similarStrip.style.padding = 'var(--space-5)';
      similarStrip.appendChild(buildEmptyState(
        'fa-solid fa-store',
        'No similar businesses found',
        'More businesses are joining JARA every day.'
      ));
      return;
    }

    businesses.forEach((biz, i) => {
      const card = document.createElement('a');
      card.className = 'similar-card';
      card.href      = `../store/index.html?store=${biz.id}`;
      card.setAttribute('role', 'listitem');
      card.style.animationDelay = `${i * 60}ms`;
      card.style.animation      = 'fade-up 280ms ease both';

      card.innerHTML = `
        <div class="similar-card__logo" aria-hidden="true">
          ${biz.avatar
            ? `<img src="${escapeHTML(biz.avatar)}" alt="${escapeHTML(biz.name)}" />`
            : escapeHTML(biz.initials || 'J')
          }
        </div>
        <p class="similar-card__name">${escapeHTML(biz.name)}</p>
        <p class="similar-card__category">${escapeHTML(biz.category || '')}</p>
        ${biz.verified
          ? `<p class="similar-card__verified">
               <i class="fa-solid fa-circle-check" aria-hidden="true"></i> Verified
             </p>`
          : ''
        }
      `;

      similarStrip.appendChild(card);
    });
  }


  /* ==========================================================
     14. CONTACT SECTION RENDER
  ========================================================== */

  function renderContact(store) {
    // WhatsApp CTA (header + contact section)
    if (store.whatsapp_number) {
      const num  = store.whatsapp_number.replace(/\D/,'');
      const name = store.business_name || store.full_name || 'you';
      const msg  = encodeURIComponent(`Hi ${name}, I found your store on JARA ∆ and I'd like to place an order.`);
      const href = `https://wa.me/${num}?text=${msg}`;

      contactWhatsapp.href = href;
      contactBtn.href      = href;
    }

    // Phone
    if (store.phone_number) {
      contactPhone.href = `tel:${store.phone_number}`;
      contactPhone.removeAttribute('hidden');
    }
  }


  /* ==========================================================
     15. FOLLOW BUTTON
     FUTURE: INSERT INTO followers (follower_id, followee_id)
             or DELETE on unfollow.
             Table does not yet exist — placeholder only.
  ========================================================== */

  function initFollowBtn() {
    function toggleFollow() {
      state.isFollowing = !state.isFollowing;

      followLabel.textContent = state.isFollowing ? 'Following' : 'Follow';
      followIcon.className    = state.isFollowing ? 'fa-solid fa-check' : 'fa-solid fa-plus';
      followBtn.setAttribute('aria-pressed', state.isFollowing ? 'true' : 'false');
      followBtn.classList.toggle('is-following', state.isFollowing);
      topbarFollowBtn.classList.toggle('store-topbar__btn--follow', !state.isFollowing);

      showToast(state.isFollowing ? 'Following this store!' : 'Unfollowed');

      // FUTURE: await window._supabase.from('followers').upsert / delete
    }

    followBtn.addEventListener('click', toggleFollow);
    topbarFollowBtn.addEventListener('click', toggleFollow);
  }


  /* ==========================================================
     16. SHARE STORE
  ========================================================== */

  function handleShare() {
    const store = state.store;
    const name  = store?.business_name || store?.full_name || 'Business';
    const jaraId = store?.jara_id || '';
    // FUTURE: Real public URL once public store pages are routed
    const url   = `https://jara.app/store/${jaraId}`;
    const text  = `Check out ${name} on JARA ∆ — the campus marketplace.`;

    if (navigator.share) {
      navigator.share({ title: `${name} — JARA ∆`, text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        showToast('Store link copied!');
      });
    }
  }

  shareBtn.addEventListener('click', handleShare);
  topbarShareBtn.addEventListener('click', handleShare);


  /* ==========================================================
     17. PULL-TO-REFRESH
  ========================================================== */

  let touchStartY  = 0;
  let pullDistance = 0;
  const PULL_THRESHOLD = 80;

  document.addEventListener('touchstart', e => {
    if (window.scrollY === 0) touchStartY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchmove', e => {
    if (window.scrollY > 0 || state.isRefreshing) return;
    pullDistance = e.touches[0].clientY - touchStartY;
    if (pullDistance > 20) {
      pullIndicator.classList.add('is-pulling');
      pullLabel.textContent = pullDistance > PULL_THRESHOLD ? 'Release to refresh' : 'Pull to refresh';
      pullIcon.style.transform = `rotate(${(pullDistance / PULL_THRESHOLD) * 180}deg)`;
    }
  }, { passive: true });

  document.addEventListener('touchend', async () => {
    if (pullDistance > PULL_THRESHOLD && !state.isRefreshing) {
      await triggerRefresh();
    } else {
      pullIndicator.classList.remove('is-pulling');
      pullIcon.style.transform = '';
    }
    pullDistance = 0;
    touchStartY  = 0;
  });

  async function triggerRefresh() {
    state.isRefreshing    = true;
    pullLabel.textContent = 'Refreshing…';
    pullIcon.classList.add('is-spinning');
    pullIcon.style.transform = '';

    /*
     FUTURE: Re-fetch store profile, stats, products, services,
             reviews from Supabase here.
    */
    await new Promise(resolve => setTimeout(resolve, 1200));

    renderAll(PLACEHOLDER_STORE, PLACEHOLDER_STATS);

    pullIcon.classList.remove('is-spinning');
    pullLabel.textContent = 'Up to date ✓';
    pullIcon.style.color  = 'var(--color-success)';

    setTimeout(() => {
      pullIndicator.classList.remove('is-pulling');
      pullIcon.style.color  = '';
      pullLabel.textContent = 'Pull to refresh';
      state.isRefreshing    = false;
    }, 900);
  }


  /* ==========================================================
     18. TOPBAR SCROLL EFFECT
     Makes topbar background opaque when scrolled.
  ========================================================== */

  function initTopbarScroll() {
    const topbar = document.querySelector('.store-topbar');
    if (!topbar) return;

    window.addEventListener('scroll', () => {
      if (window.scrollY > 160) {
        topbar.style.background = 'rgba(10,10,15,0.92)';
        topbar.style.backdropFilter = 'blur(20px)';
        topbar.style.position = 'fixed';
        topbar.style.top = '0';
        topbar.style.left = '0';
        topbar.style.right = '0';
        topbar.style.zIndex = '50';
      } else {
        topbar.style.background = 'transparent';
        topbar.style.backdropFilter = 'none';
        topbar.style.position = 'absolute';
      }
    }, { passive: true });
  }


  /* ==========================================================
     19. UTILITY HELPERS
  ========================================================== */

  function escapeHTML(str) {
    if (!str && str !== 0) return '';
    const d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
  }

  function formatJoinDate(iso) {
    try {
      return new Date(iso).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' });
    } catch { return 'Early 2025'; }
  }

  function buildStoreCard(item, index) {
    const card = document.createElement('a');
    card.className = 'store-card';
    card.href      = item.link || '#';
    card.setAttribute('role', 'listitem');
    card.setAttribute('aria-label', item.title);
    card.style.animationDelay = `${index * 55}ms`;
    card.style.animation      = 'fade-up 260ms ease both';

    const statusCls = {
      active:  'store-card__dot--active',
      paused:  'store-card__dot--paused',
      expired: 'store-card__dot--expired',
    }[item.status] || '';

    card.innerHTML = `
      <div class="store-card__image">
        ${item.image
          ? `<img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.title)}" loading="lazy" />`
          : `<span aria-hidden="true">${item.emoji || '📦'}</span>`
        }
        <span class="store-card__dot ${statusCls}" aria-hidden="true"></span>
      </div>
      <div class="store-card__body">
        <p class="store-card__title">${escapeHTML(item.title)}</p>
        <p class="store-card__price">${escapeHTML(item.price || '—')}</p>
        ${item.views !== undefined
          ? `<div class="store-card__views">
               <i class="fa-solid fa-eye" aria-hidden="true"></i> ${item.views}
             </div>`
          : ''
        }
      </div>
    `;

    return card;
  }

  function buildEmptyState(iconCls, title, sub) {
    const el = document.createElement('div');
    el.className = 'empty-state';
    el.innerHTML = `
      <div class="empty-state__illustration" aria-hidden="true">
        <div class="empty-state__ring"></div>
        <div class="empty-state__ring empty-state__ring--2"></div>
        <i class="${iconCls} empty-state__icon"></i>
      </div>
      <h3 class="empty-state__title">${escapeHTML(title)}</h3>
      <p class="empty-state__sub">${escapeHTML(sub || '')}</p>
    `;
    return el;
  }

  function showToast(message) {
    const existing = document.getElementById('jaraToast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'jaraToast';
    toast.textContent = message;
    Object.assign(toast.style, {
      position: 'fixed', bottom: 'calc(68px + 16px)', left: '50%',
      transform: 'translateX(-50%) translateY(8px)',
      background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
      borderRadius: '9999px', padding: '10px 20px',
      fontFamily: 'var(--font-display)', fontSize: '0.875rem', fontWeight: '600',
      color: 'var(--color-text-primary)', zIndex: '200',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)', transition: 'opacity 300ms ease, transform 300ms ease',
      opacity: '0', whiteSpace: 'nowrap',
    });
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity   = '1';
      toast.style.transform = 'translateX(-50%) translateY(0)';
    });

    setTimeout(() => {
      toast.style.opacity   = '0';
      toast.style.transform = 'translateX(-50%) translateY(8px)';
      setTimeout(() => toast.remove(), 320);
    }, 2400);
  }


  /* ==========================================================
     20. RENDER ALL + INIT
  ========================================================== */

  function renderAll(store, stats) {
    renderStoreHeader(store);
    renderStats(stats);
    renderAbout(store);
    renderProducts(PLACEHOLDER_PRODUCTS);
    renderServices(PLACEHOLDER_SERVICES);
    renderRequests(PLACEHOLDER_REQUESTS);
    renderReviews(PLACEHOLDER_REVIEWS, RATING_BREAKDOWN, RATING_AVERAGE);
    renderSimilar(PLACEHOLDER_SIMILAR);
    renderContact(store);
  }

  async function init() {
    // Read store ID from URL — future: use this to fetch real data
    state.storeId = getStoreIdFromURL();

    /*
     FUTURE: If state.storeId is set, replace PLACEHOLDER_STORE with:
       const { data: store } = await window._supabase
         .from('profiles')
         .select(`
           id, jara_id, full_name, business_name, account_type,
           avatar_url, bio, phone_number, whatsapp_number,
           is_verified, is_premium, jara_points, created_at,
           schools(name)
         `)
         .or(`jara_id.eq.${state.storeId},id.eq.${state.storeId}`)
         .single();
    */

    // Render with placeholder data
    renderAll(PLACEHOLDER_STORE, PLACEHOLDER_STATS);

    // Init interactions
    initFollowBtn();
    initTopbarScroll();

    // Start on Products tab
    switchTab('products');
  }

  init();


/* ============================================================
   End of DOMContentLoaded
============================================================ */
});
