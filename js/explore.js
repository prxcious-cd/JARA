/* ============================================================
   JARA ∆ — Explore Page Logic
   js/explore.js

   Depends on:
     - window._supabase  (js/supabase-client.js)
     - DOM in explore/index.html

   TABLE OF CONTENTS
   1.  Constants — placeholder data, search terms
   2.  Auth guard + greeting
   3.  Search bar animation
   4.  Render helpers — card builders
   5.  Section: Trending
   6.  Section: Active Requests
   7.  Section: Verified by JARA
   8.  Section: Recently Added
   9.  Personalisation logic
   10. Init
============================================================ */

document.addEventListener('DOMContentLoaded', () => {


  /* ==========================================================
     1. CONSTANTS — PLACEHOLDER DATA
     Realistic demo content so the page looks live immediately.
     Replace with real Supabase queries when the backend is ready.
  ========================================================== */

  const SEARCH_TERMS = [
    'Generator...',
    'Printing...',
    'Tutor...',
    'Laundry...',
    'Laptop Repair...',
    'Books...',
    'Food...',
    'Photographer...',
    'Hair Stylist...',
    'Graphic Design...',
  ];

  // Unsplash placeholder images — real photos, no attribution needed for demo
  const DEMO_IMAGES = {
    generator:  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
    cake:       'https://images.unsplash.com/photo-1481833761820-0509d3217039?w=400&h=300&fit=crop',
    laptop:     'https://images.unsplash.com/photo-1524578271613-d550eacf6090?w=400&h=300&fit=crop',
    books:      'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&h=300&fit=crop',
    design:     'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400&h=300&fit=crop',
    cleaning:   'https://images.unsplash.com/photo-1604335399105-a0c585fd81a1?w=400&h=300&fit=crop',
    food:       'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop',
    phone:      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=300&fit=crop',
    fashion:    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop',
    printing:   'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
  };

  const TRENDING_DATA = [
    {
      id: 'tr1',
      type: 'product',
      title: 'Honda Generator — 2.5KVA',
      category: 'Power & Generator',
      price: '₦2,500/night',
      image: DEMO_IMAGES.generator,
      seller: { name: 'Emeka J.', initials: 'EJ', avatar: null },
      distance: '0.3 km',
      verified: true,
      pro: false,
    },
    {
      id: 'tr2',
      type: 'service',
      title: 'Custom Cakes & Pastries',
      category: 'Food & Drinks',
      price: 'From ₦8,000',
      image: DEMO_IMAGES.cake,
      seller: { name: 'Blessing A.', initials: 'BA', avatar: null },
      distance: '0.6 km',
      verified: true,
      pro: true,
    },
    {
      id: 'tr3',
      type: 'service',
      title: 'Laptop Repairs — Fast',
      category: 'Tech & Repairs',
      price: 'From ₦3,000',
      image: DEMO_IMAGES.laptop,
      seller: { name: 'Chukwudi T.', initials: 'CT', avatar: null },
      distance: '1.1 km',
      verified: false,
      pro: false,
    },
    {
      id: 'tr4',
      type: 'product',
      title: 'Fairly Used Economics Textbooks',
      category: 'Books & Stationery',
      price: '₦4,500',
      image: DEMO_IMAGES.books,
      seller: { name: 'Adaeze O.', initials: 'AO', avatar: null },
      distance: '0.2 km',
      verified: false,
      pro: false,
    },
    {
      id: 'tr5',
      type: 'service',
      title: 'Graphic Design — Flyers & Logos',
      category: 'Creative Services',
      price: 'From ₦2,000',
      image: DEMO_IMAGES.design,
      seller: { name: 'Zainab M.', initials: 'ZM', avatar: null },
      distance: '0.8 km',
      verified: true,
      pro: true,
    },
  ];

  const REQUESTS_DATA = [
    {
      id: 'rq1',
      emoji: '⚡',
      title: 'Need a generator for tonight — hostel B2',
      location: 'Block B, Student Hostel',
      time: '2 min ago',
      budget: '₦2,000',
    },
    {
      id: 'rq2',
      emoji: '🖨️',
      title: 'Assignment typing needed urgently — 5 pages',
      location: 'Faculty of Social Sciences',
      time: '15 min ago',
      budget: 'Negotiable',
    },
    {
      id: 'rq3',
      emoji: '🧺',
      title: 'Laundry pickup — 2 bags, needs ironing',
      location: 'Female Hostel, Hall 3',
      time: '28 min ago',
      budget: '₦1,500',
    },
    {
      id: 'rq4',
      emoji: '🎂',
      title: 'Need a birthday cake for tomorrow afternoon',
      location: 'Main Campus',
      time: '1 hr ago',
      budget: 'Up to ₦10,000',
    },
  ];

  const VERIFIED_DATA = [
    {
      id: 'vf1',
      type: 'service',
      title: 'Professional Photography & Portraits',
      category: 'Photography',
      price: 'From ₦5,000',
      image: DEMO_IMAGES.food,
      seller: { name: 'Tunde E.', initials: 'TE', avatar: null },
      distance: '1.4 km',
      verified: true,
      pro: true,
    },
    {
      id: 'vf2',
      type: 'service',
      title: 'Room Cleaning — Weekly Plans Available',
      category: 'Laundry & Errands',
      price: '₦1,500/session',
      image: DEMO_IMAGES.cleaning,
      seller: { name: 'Kemi F.', initials: 'KF', avatar: null },
      distance: '0.5 km',
      verified: true,
      pro: false,
    },
    {
      id: 'vf3',
      type: 'product',
      title: 'iPhone 12 — Fairly Used, Excellent Condition',
      category: 'Tech & Repairs',
      price: '₦145,000',
      image: DEMO_IMAGES.phone,
      seller: { name: 'Hassan B.', initials: 'HB', avatar: null },
      distance: '0.9 km',
      verified: true,
      pro: false,
    },
  ];

  const RECENT_DATA = [
    {
      id: 'rc1',
      type: 'product',
      title: 'Women\'s Shoes — Size 38-42',
      category: 'Fashion',
      price: '₦7,500',
      image: DEMO_IMAGES.fashion,
      seller: { name: 'Ngozi A.', initials: 'NA', avatar: null },
      verified: false,
      pro: false,
    },
    {
      id: 'rc2',
      type: 'service',
      title: 'Assignment Printing & Binding',
      category: 'Printing & Typing',
      price: '₦200/page',
      image: DEMO_IMAGES.printing,
      seller: { name: 'David K.', initials: 'DK', avatar: null },
      verified: false,
      pro: false,
    },
    {
      id: 'rc3',
      type: 'product',
      title: 'Jollof Rice & Chicken — Daily Orders',
      category: 'Food & Drinks',
      price: '₦1,200',
      image: DEMO_IMAGES.food,
      seller: { name: 'Mama Grace', initials: 'MG', avatar: null },
      verified: true,
      pro: false,
    },
    {
      id: 'rc4',
      type: 'service',
      title: 'Graphic Design — Quick Turnaround',
      category: 'Creative Services',
      price: 'From ₦1,500',
      image: DEMO_IMAGES.design,
      seller: { name: 'Femi O.', initials: 'FO', avatar: null },
      verified: false,
      pro: true,
    },
  ];


  /* ==========================================================
     2. AUTH GUARD + GREETING
  ========================================================== */

  async function loadUserGreeting() {
    try {
      const { data: { session } } = await window._supabase.auth.getSession();

      if (!session) {
        window.location.href = '../auth/login.html';
        return null;
      }

      // Fetch profile
      const { data: profile } = await window._supabase
        .from('profiles')
        .select('full_name, business_name, account_type, avatar_url')
        .eq('id', session.user.id)
        .single();

      const name = profile?.full_name || profile?.business_name || '';
      const firstName = name.split(' ')[0] || 'there';

      // Greeting based on time of day
      const hour = new Date().getHours();
      let greeting;
      if (hour < 12)      greeting = 'Good morning';
      else if (hour < 17) greeting = 'Good afternoon';
      else                greeting = 'Good evening';

      document.getElementById('greetingText').textContent = greeting;
      document.getElementById('greetingName').innerHTML =
        `${firstName} <span class="ex-header__wave">👋</span>`;

      return profile;

    } catch (err) {
      console.warn('JARA: Greeting load failed.', err.message);
      return null;
    }
  }


  /* ==========================================================
     3. SEARCH BAR ANIMATION
     Cycles through SEARCH_TERMS with a fade transition.
  ========================================================== */

  function initSearchAnimation() {
    const textEl = document.getElementById('searchPlaceholder');
    if (!textEl) return;

    let index = 0;

    setInterval(() => {
      // Fade out
      textEl.classList.add('is-fading');

      setTimeout(() => {
        index = (index + 1) % SEARCH_TERMS.length;
        textEl.textContent = SEARCH_TERMS[index];
        textEl.classList.remove('is-fading');
      }, 300);

    }, 2800);
  }


  /* ==========================================================
     4. RENDER HELPERS
  ========================================================== */

  /** Returns an HTML badge string */
  function badgeHTML(item) {
    let html = '';

    if (item.verified) {
      html += `<span class="badge badge--verified">
        <i class="fa-solid fa-circle-check" aria-hidden="true"></i> Verified
      </span>`;
    }

    if (item.pro) {
      html += `<span class="badge badge--pro">
        <i class="fa-solid fa-crown" aria-hidden="true"></i> PRO
      </span>`;
    }

    return html;
  }

  /** Returns type badge HTML */
  function typeBadgeHTML(type) {
    const map = {
      product:  { label: 'Product',  cls: '' },
      service:  { label: 'Service',  cls: 'badge--type-service' },
      request:  { label: 'Request',  cls: 'badge--type-request' },
    };
    const t = map[type] || map.product;
    return `<span class="badge badge--type ${t.cls}">${t.label}</span>`;
  }

  /** Formats seller avatar HTML */
  function avatarHTML(seller, size = 'small') {
    const cls = size === 'small' ? 'listing-card__seller-avatar' : 'recent-card__seller-avatar';
    if (seller.avatar) {
      return `<span class="${cls}"><img src="${seller.avatar}" alt="${seller.name}" /></span>`;
    }
    return `<span class="${cls}">${seller.initials}</span>`;
  }

  /** Build a full horizontal listing card */
  function buildListingCard(item) {
    const card = document.createElement('a');
    card.className = 'listing-card';
    card.href      = `../listing/index.html?id=${item.id}`;
    card.setAttribute('role', 'listitem');
    card.setAttribute('aria-label', item.title);

    card.innerHTML = `
      <div class="listing-card__image-wrap">
        ${item.image
          ? `<img src="${item.image}" alt="${item.title}" loading="lazy" />`
          : `<div class="listing-card__image-placeholder" aria-hidden="true">
               <i class="fa-solid fa-image"></i>
             </div>`
        }
        <div class="listing-card__badges">
          ${typeBadgeHTML(item.type)}
          ${item.verified
            ? `<span class="badge badge--verified">
                 <i class="fa-solid fa-circle-check" aria-hidden="true"></i> Verified
               </span>`
            : ''
          }
          ${item.pro
            ? `<span class="badge badge--pro">
                 <i class="fa-solid fa-crown" aria-hidden="true"></i> PRO
               </span>`
            : ''
          }
        </div>
      </div>
      <div class="listing-card__body">
        <p class="listing-card__category">${item.category}</p>
        <h3 class="listing-card__title">${item.title}</h3>
        <p class="listing-card__price">${item.price}</p>
        <div class="listing-card__meta">
          <span class="listing-card__seller">
            ${avatarHTML(item.seller)}
            <span class="listing-card__seller-name">${item.seller.name}</span>
          </span>
          ${item.distance
            ? `<span class="listing-card__distance">
                 <i class="fa-solid fa-location-dot" aria-hidden="true"></i>
                 ${item.distance}
               </span>`
            : ''
          }
        </div>
        <button class="listing-card__btn" tabindex="-1" aria-hidden="true">
          View Details
          <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
        </button>
      </div>
    `;

    // Animate card in with stagger
    card.style.opacity   = '0';
    card.style.transform = 'translateY(12px)';

    return card;
  }

  /** Build a request row card */
  function buildRequestCard(item) {
    const card = document.createElement('a');
    card.className = 'request-card';
    card.href      = `../listing/index.html?id=${item.id}`;
    card.setAttribute('role', 'listitem');
    card.setAttribute('aria-label', item.title);

    card.innerHTML = `
      <div class="request-card__urgency" aria-hidden="true">${item.emoji}</div>
      <div class="request-card__content">
        <h3 class="request-card__title">${item.title}</h3>
        <div class="request-card__meta">
          <span>
            <i class="fa-solid fa-location-dot" aria-hidden="true"></i>
            ${item.location}
          </span>
          <span class="request-card__meta-dot" aria-hidden="true"></span>
          <span class="request-card__time">${item.time}</span>
          <span class="request-card__meta-dot" aria-hidden="true"></span>
          <span>${item.budget}</span>
        </div>
      </div>
      <i class="fa-solid fa-chevron-right request-card__arrow" aria-hidden="true"></i>
    `;

    return card;
  }

  /** Build a recent (portrait) card */
  function buildRecentCard(item) {
    const card = document.createElement('a');
    card.className = 'recent-card';
    card.href      = `../listing/index.html?id=${item.id}`;
    card.setAttribute('role', 'listitem');
    card.setAttribute('aria-label', item.title);

    card.innerHTML = `
      <div class="recent-card__image-wrap">
        ${item.image
          ? `<img src="${item.image}" alt="${item.title}" loading="lazy" />`
          : `<div class="recent-card__image-placeholder" aria-hidden="true">
               <i class="fa-solid fa-image"></i>
             </div>`
        }
        <div class="recent-card__badges">
          ${item.verified
            ? `<span class="badge badge--verified">
                 <i class="fa-solid fa-circle-check" aria-hidden="true"></i>
               </span>`
            : ''
          }
          ${item.pro
            ? `<span class="badge badge--pro">
                 <i class="fa-solid fa-crown" aria-hidden="true"></i>
               </span>`
            : ''
          }
        </div>
      </div>
      <div class="recent-card__body">
        <p class="recent-card__category">${item.category}</p>
        <h3 class="recent-card__title">${item.title}</h3>
        <p class="recent-card__price">${item.price}</p>
        <div class="recent-card__seller">
          ${avatarHTML(item.seller, 'tiny')}
          <span class="recent-card__seller-name">${item.seller.name}</span>
        </div>
        <div class="recent-card__view-btn" aria-hidden="true">
          View <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
        </div>
      </div>
    `;

    return card;
  }

  /** Stagger-animate a list of elements into view */
  function animateIn(elements) {
    elements.forEach((el, i) => {
      setTimeout(() => {
        el.style.transition = 'opacity 350ms ease, transform 350ms ease';
        el.style.opacity    = '1';
        el.style.transform  = 'translateY(0)';
      }, i * 80);
    });
  }

  /** Replace skeleton loaders with real cards */
  function clearSkeletons(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return container;
    container.innerHTML = '';
    return container;
  }


  /* ==========================================================
     5. SECTION: TRENDING
  ========================================================== */

  function renderTrending(data) {
    const strip = clearSkeletons('trendingStrip');
    if (!strip) return;

    if (!data || data.length === 0) {
      strip.innerHTML = `
        <div class="empty-state">
          <span class="empty-state__icon">🔥</span>
          <p class="empty-state__title">Nothing trending yet</p>
          <p class="empty-state__text">Be the first to create a listing nearby.</p>
        </div>`;
      return;
    }

    const cards = data.map(item => buildListingCard(item));
    cards.forEach(c => strip.appendChild(c));
    animateIn(cards);
  }


  /* ==========================================================
     6. SECTION: ACTIVE REQUESTS
  ========================================================== */

  function renderRequests(data) {
    const list = clearSkeletons('requestsList');
    if (!list) return;

    if (!data || data.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <span class="empty-state__icon">📢</span>
          <p class="empty-state__title">No active requests</p>
          <p class="empty-state__text">Check back soon — someone might need your help.</p>
        </div>`;
      return;
    }

    // Show max 4 requests
    data.slice(0, 4).forEach(item => {
      list.appendChild(buildRequestCard(item));
    });
  }


  /* ==========================================================
     7. SECTION: VERIFIED BY JARA
  ========================================================== */

  function renderVerified(data) {
    const strip = clearSkeletons('verifiedStrip');
    if (!strip) return;

    if (!data || data.length === 0) {
      strip.innerHTML = `
        <div class="empty-state">
          <span class="empty-state__icon">⭐</span>
          <p class="empty-state__title">Coming soon</p>
          <p class="empty-state__text">Verified members will appear here.</p>
        </div>`;
      return;
    }

    const cards = data.map(item => buildListingCard(item));
    cards.forEach(c => strip.appendChild(c));
    animateIn(cards);
  }


  /* ==========================================================
     8. SECTION: RECENTLY ADDED
  ========================================================== */

  function renderRecent(data) {
    const grid = clearSkeletons('recentGrid');
    if (!grid) return;

    if (!data || data.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <span class="empty-state__icon">🆕</span>
          <p class="empty-state__title">Nothing yet</p>
          <p class="empty-state__text">New listings will appear here as members create them.</p>
        </div>`;
      return;
    }

    // Show max 4 in 2-column grid
    const cards = data.slice(0, 4).map(item => buildRecentCard(item));
    cards.forEach(c => {
      c.style.opacity   = '0';
      c.style.transform = 'translateY(12px)';
      grid.appendChild(c);
    });
    animateIn(cards);
  }


  /* ==========================================================
     9. PERSONALISATION
     Reorders the data shown based on account_type.
     Students → products first.
     Business → requests first.
     Professional → requests matching their category first.
  ========================================================== */

  function personalise(profile, trending, recent) {
    if (!profile) return { trending, recent };

    const type = profile.account_type;

    if (type === 'business') {
      // Put services and requests first in trending
      const sorted = [
        ...trending.filter(t => t.type === 'service' || t.type === 'request'),
        ...trending.filter(t => t.type === 'product'),
      ];
      return { trending: sorted, recent };
    }

    if (type === 'professional' || type === 'service_provider' || type === 'tutor') {
      // Show requests first
      const sorted = [
        ...trending.filter(t => t.type === 'request'),
        ...trending.filter(t => t.type !== 'request'),
      ];
      return { trending: sorted, recent };
    }

    // Student (default) — products first, then services
    const sorted = [
      ...trending.filter(t => t.type === 'product'),
      ...trending.filter(t => t.type === 'service'),
      ...trending.filter(t => t.type === 'request'),
    ];
    return { trending: sorted, recent };
  }


  /* ==========================================================
     10. INIT
  ========================================================== */

  async function init() {
    // 1. Auth + greeting (runs in parallel with rendering)
    const profilePromise = loadUserGreeting();

    // 2. Start search animation immediately
    initSearchAnimation();

    // 3. Render all sections with placeholder data
    //    (In production, replace these with Supabase queries)
    const profile = await profilePromise;

    // Personalise the data based on account type
    const { trending, recent } = personalise(
      profile,
      TRENDING_DATA,
      RECENT_DATA
    );

    // Small artificial delay to show skeleton loaders briefly
    // (makes the page feel like it's loading real data)
    // Remove this timeout when connecting real Supabase queries.
    await new Promise(resolve => setTimeout(resolve, 600));

    renderTrending(trending);
    renderRequests(REQUESTS_DATA);
    renderVerified(VERIFIED_DATA);
    renderRecent(recent);
  }

  init();


/* ============================================================
   End of DOMContentLoaded
============================================================ */
});
