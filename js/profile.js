/* ============================================================
   JARA ∆ — Profile / Me Page Logic
   js/profile.js

   Depends on:
     - window._supabase  (js/supabase-client.js)
     - DOM in profile/index.html

   TABLE OF CONTENTS
   1.  State
   2.  Placeholder data  ← each block marked with FUTURE: comment
   3.  DOM references
   4.  Auth guard + user load
   5.  Profile header render
   6.  Stats render + count-up animation
   7.  Content tabs
   8.  Render: My Listings
   9.  Render: My Requests
   10. Render: My Replies
   11. Logout
   12. Share profile
   13. Notification toggle
   14. Pull-to-refresh
   15. Stat cards → tab navigation
   16. Utility helpers
   17. Init
============================================================ */

document.addEventListener('DOMContentLoaded', () => {


  /* ==========================================================
     1. STATE
  ========================================================== */
  const state = {
    activeTab:    'listings',
    userId:       null,
    profile:      null,
    isRefreshing: false,
  };


  /* ==========================================================
     2. PLACEHOLDER DATA
     Each block is clearly marked with where the future
     Supabase query will go.
  ========================================================== */

  /* ---- PROFILE ----
     FUTURE: SELECT id, jara_id, full_name, business_name,
               account_type, avatar_url, bio, school_id,
               is_verified, is_premium, premium_expires_at,
               jara_points, report_count, created_at
             FROM profiles
             WHERE id = auth.uid()
             LIMIT 1
  ---- */
  const PLACEHOLDER_PROFILE = {
    id:                'demo-user-id',
    jara_id:           'JARA-00001',
    full_name:         'Precious Okafor',
    business_name:     null,
    account_type:      'student',
    avatar_url:        null,
    bio:               "Building JARA ∆ — the campus marketplace for everyone. 📦 🛠️ 📢",
    school:            'Redeemer\'s University, Ede',
    is_verified:       false,
    is_premium:        false,
    premium_expires_at:null,
    jara_points:       48,
    is_founding_member:true,   // placeholder — future column on profiles table
    created_at:        '2025-01-01T00:00:00Z',
  };

  /* ---- STATS ----
     FUTURE: SELECT
               (SELECT COUNT(*) FROM products WHERE owner_id = auth.uid()) +
               (SELECT COUNT(*) FROM services WHERE provider_id = auth.uid()) AS listings,
               (SELECT COUNT(*) FROM requests WHERE owner_id = auth.uid()) AS requests,
               (SELECT COUNT(*) FROM replies WHERE responder_id = auth.uid()) AS replies,
               (SELECT COUNT(*) FROM favorites WHERE user_id = auth.uid()) AS saved,
               (
                 SELECT COALESCE(SUM(view_count),0) FROM products WHERE owner_id = auth.uid()
               ) + (
                 SELECT COALESCE(SUM(view_count),0) FROM services WHERE provider_id = auth.uid()
               ) AS views
  ---- */
  const PLACEHOLDER_STATS = {
    listings: 3,
    requests: 2,
    replies:  0,
    saved:    5,
    views:    103,
  };

  /* ---- MY LISTINGS ----
     FUTURE: SELECT id, title, images, status, price, price_type,
               view_count, created_at, 'product' AS kind
             FROM products WHERE owner_id = auth.uid()
             UNION ALL
             SELECT id, title, images, status, price, price_type,
               view_count, created_at, 'service' AS kind
             FROM services WHERE provider_id = auth.uid()
             ORDER BY created_at DESC
             LIMIT 12
  ---- */
  const PLACEHOLDER_LISTINGS = [
    {
      id:     'p1',
      title:  'Honda Generator — 2.5KVA for Rent',
      emoji:  '⚡',
      image:  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=200&fit=crop',
      price:  '₦2,500/night',
      status: 'active',
      views:  34,
      time:   '2 days ago',
      link:   '../listing/index.html?id=p1',
    },
    {
      id:     's3',
      title:  'Hostel Room Cleaning — Weekly Plans',
      emoji:  '🏠',
      image:  null,
      price:  '₦1,500/session',
      status: 'active',
      views:  17,
      time:   '4 days ago',
      link:   '../listing/index.html?id=s3',
    },
    {
      id:     'p2',
      title:  'Fairly Used Economics Textbooks',
      emoji:  '📚',
      image:  'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=200&h=200&fit=crop',
      price:  '₦4,500',
      status: 'expired',
      views:  52,
      time:   '1 week ago',
      link:   '../listing/index.html?id=p2',
    },
  ];

  /* ---- MY REQUESTS ----
     FUTURE: SELECT id, title, status, price_type, created_at
             FROM requests WHERE owner_id = auth.uid()
             ORDER BY created_at DESC LIMIT 10
  ---- */
  const PLACEHOLDER_REQUESTS = [
    {
      id:     'rq1',
      title:  'Need a generator tonight — Block B2',
      emoji:  '📢',
      status: 'active',
      meta:   'Budget: ₦2,000',
      time:   'Today',
      link:   '../listing/index.html?id=rq1',
    },
    {
      id:     'rq2',
      title:  'Assignment typing needed — 5 pages',
      emoji:  '⌨️',
      status: 'pending',
      meta:   'Negotiable',
      time:   'Yesterday',
      link:   '../listing/index.html?id=rq2',
    },
  ];

  /* ---- MY REPLIES ----
     FUTURE: SELECT r.id, r.body, r.created_at,
               req.title AS request_title
             FROM replies r
             JOIN requests req ON req.id = r.request_id
             WHERE r.responder_id = auth.uid()
             ORDER BY r.created_at DESC LIMIT 10
  ---- */
  const PLACEHOLDER_REPLIES = [];  // Empty — triggers empty state


  /* ==========================================================
     3. DOM REFERENCES
  ========================================================== */
  const profileAvatarSkeleton = document.getElementById('profileAvatarSkeleton');
  const profileAvatarEl       = document.getElementById('profileAvatarEl');
  const proRing               = document.getElementById('proRing');
  const profileName           = document.getElementById('profileName');
  const nameSkeleton          = document.getElementById('nameSkeleton');
  const subSkeleton           = document.getElementById('subSkeleton');
  const profileSub            = document.getElementById('profileSub');
  const verifiedMark          = document.getElementById('verifiedMark');
  const profileBadges         = document.getElementById('profileBadges');
  const profileContext        = document.getElementById('profileContext');
  const profileBio            = document.getElementById('profileBio');
  const verificationSub       = document.getElementById('verificationSub');

  const statListings = document.getElementById('statListings');
  const statRequests = document.getElementById('statRequests');
  const statReplies  = document.getElementById('statReplies');
  const statSaved    = document.getElementById('statSaved');
  const statViews    = document.getElementById('statViews');

  const contentTabs   = document.querySelectorAll('.content-tab');
  const contentPanels = document.querySelectorAll('.content-panel');

  const listingsGrid  = document.getElementById('listingsGrid');
  const requestsList  = document.getElementById('requestsList');
  const repliesList   = document.getElementById('repliesList');

  const logoutBtn     = document.getElementById('logoutBtn');
  const shareBtn      = document.getElementById('shareBtn');
  const shareProfileBtn = document.getElementById('shareProfileBtn');
  const notifToggle   = document.getElementById('notifToggle');
  const pullIndicator = document.getElementById('pullIndicator');
  const pullIcon      = document.getElementById('pullIcon');
  const pullLabel     = document.getElementById('pullLabel');


  /* ==========================================================
     4. AUTH GUARD + USER LOAD
  ========================================================== */

  async function loadUser() {
    try {
      const { data: { session } } = await window._supabase.auth.getSession();
      if (!session) {
        window.location.href = '../auth/login.html';
        return null;
      }
      state.userId = session.user.id;

      /*
       FUTURE: Replace PLACEHOLDER_PROFILE with a real query:
         const { data: profile } = await window._supabase
           .from('profiles')
           .select(`
             id, jara_id, full_name, business_name, account_type,
             avatar_url, bio, is_verified, is_premium, jara_points,
             created_at, schools(name)
           `)
           .eq('id', session.user.id)
           .single();
         return profile;
      */
      return PLACEHOLDER_PROFILE;

    } catch (err) {
      console.warn('JARA: User load failed, using placeholder.', err?.message);
      return PLACEHOLDER_PROFILE;
    }
  }


  /* ==========================================================
     5. PROFILE HEADER RENDER
  ========================================================== */

  function renderProfileHeader(profile) {
    state.profile = profile;

    // ---- Avatar ----
    profileAvatarSkeleton.style.display = 'none';
    profileAvatarEl.classList.remove('profile-avatar--hidden');

    if (profile.avatar_url) {
      const img = document.createElement('img');
      img.src = profile.avatar_url;
      img.alt = profile.full_name || 'Profile photo';
      profileAvatarEl.appendChild(img);
    } else {
      // Initials fallback
      const name      = profile.full_name || profile.business_name || 'J';
      const words     = name.trim().split(' ');
      const initials  = words.length >= 2
        ? words[0][0] + words[words.length - 1][0]
        : words[0].slice(0, 2);
      profileAvatarEl.textContent = initials.toUpperCase();
    }

    // PRO ring
    if (profile.is_premium) {
      proRing.removeAttribute('hidden');
    }

    // ---- Name ----
    nameSkeleton.style.display = 'none';
    profileName.classList.remove('profile-name--hidden');
    profileName.textContent = profile.full_name || profile.business_name || 'JARA Member';

    // Verified checkmark
    if (profile.is_verified) {
      verifiedMark.removeAttribute('hidden');
    }

    // ---- Sub-line (username / account type / JARA ID) ----
    subSkeleton.style.display = 'none';
    profileSub.classList.remove('profile-sub--hidden');

    const typeLabels = {
      student:          'Student',
      seller:           'Seller',
      service_provider: 'Service Provider',
      tutor:            'Tutor',
      business:         'Business',
      other:            'Member',
    };
    const typeLabel = typeLabels[profile.account_type] || 'Member';
    profileSub.textContent = `${profile.jara_id || 'JARA Member'} · ${typeLabel}`;

    // ---- Badges ----
    const badgeDefs = [];

    if (profile.is_founding_member) {
      badgeDefs.push({ cls: 'profile-badge--founding', icon: 'fa-solid fa-medal', label: 'Founding Member' });
    }

    if (profile.is_premium) {
      badgeDefs.push({ cls: 'profile-badge--pro', icon: 'fa-solid fa-crown', label: 'JARA PRO' });
    }

    if (profile.is_verified) {
      badgeDefs.push({ cls: 'profile-badge--verified', icon: 'fa-solid fa-circle-check', label: 'Verified' });
    }

    const accountBadgeMap = {
      student:          'profile-badge--student',
      business:         'profile-badge--business',
      service_provider: 'profile-badge--professional',
      tutor:            'profile-badge--professional',
      professional:     'profile-badge--professional',
    };

    if (accountBadgeMap[profile.account_type]) {
      badgeDefs.push({
        cls:   accountBadgeMap[profile.account_type],
        icon:  'fa-solid fa-tag',
        label: typeLabel,
      });
    }

    if (badgeDefs.length > 0) {
      profileBadges.innerHTML = badgeDefs.map(b => `
        <span class="profile-badge ${b.cls}">
          <i class="${b.icon}" aria-hidden="true"></i>
          ${escapeHTML(b.label)}
        </span>
      `).join('');
      profileBadges.removeAttribute('hidden');
    }

    // ---- School / Join date context ----
    const schoolEl  = document.querySelector('#profileSchool span');
    const joinedEl  = document.querySelector('#profileJoined span');

    if (profile.school || profile.business_name) {
      schoolEl.textContent = profile.school || profile.business_name;
      joinedEl.textContent = 'Joined ' + formatJoinDate(profile.created_at);
      profileContext.removeAttribute('hidden');
    }

    // ---- Bio ----
    if (profile.bio) {
      profileBio.textContent = profile.bio;
      profileBio.removeAttribute('hidden');
    }

    // ---- Verification sub-text ----
    verificationSub.textContent = profile.is_verified
      ? 'Verified by JARA ✓'
      : 'Not yet verified — tap to apply';
  }

  function formatJoinDate(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' });
    } catch {
      return 'Early 2025';
    }
  }


  /* ==========================================================
     6. STATS RENDER + COUNT-UP ANIMATION
  ========================================================== */

  function renderStats(stats) {
    // Remove skeleton shimmer class and count up
    [
      [statListings, stats.listings],
      [statRequests, stats.requests],
      [statReplies,  stats.replies],
      [statSaved,    stats.saved],
      [statViews,    stats.views],
    ].forEach(([el, target]) => {
      el.classList.remove('skeleton-pulse');
      countUp(el, target);
    });
  }

  function countUp(el, target) {
    if (!el) return;
    let current   = 0;
    const step    = Math.max(1, Math.ceil(target / 18));
    const ticker  = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = current >= 1000
        ? (current / 1000).toFixed(1) + 'k'
        : current;
      if (current >= target) clearInterval(ticker);
    }, 40);
  }


  /* ==========================================================
     7. CONTENT TABS
  ========================================================== */

  function switchContentTab(tabName) {
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
    tab.addEventListener('click', () => switchContentTab(tab.dataset.tab));
  });

  // Stat cards that should jump to a tab
  document.querySelectorAll('.stat-card[data-tab]').forEach(card => {
    card.addEventListener('click', () => {
      const tab = card.dataset.tab;
      if (tab) {
        switchContentTab(tab);
        document.querySelector('.content-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  function capitalise(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }


  /* ==========================================================
     8. RENDER: MY LISTINGS
  ========================================================== */

  function renderListings(listings) {
    listingsGrid.innerHTML = '';

    if (!listings || listings.length === 0) {
      listingsGrid.style.display = 'block';
      listingsGrid.appendChild(buildEmptyState(
        'fa-solid fa-box-open',
        'No listings yet',
        'Create your first listing and let your campus find you.',
        { href: '../sell/index.html', label: 'Create a Listing' }
      ));
      return;
    }

    listingsGrid.style.display = '';

    listings.forEach((item, i) => {
      const card = document.createElement('a');
      card.className = 'listing-mini';
      card.href      = item.link || '#';
      card.setAttribute('role', 'listitem');
      card.setAttribute('aria-label', item.title);
      card.style.animationDelay = `${i * 60}ms`;
      card.style.animation = 'fade-up 280ms ease both';

      const statusCls = {
        active:  'listing-mini__status--active',
        paused:  'listing-mini__status--paused',
        expired: 'listing-mini__status--expired',
      }[item.status] || '';

      card.innerHTML = `
        <div class="listing-mini__image">
          ${item.image
            ? `<img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.title)}" loading="lazy" />`
            : `<span aria-hidden="true">${item.emoji || '📦'}</span>`
          }
          <span class="listing-mini__status ${statusCls}" aria-hidden="true"></span>
        </div>
        <div class="listing-mini__body">
          <p class="listing-mini__title">${escapeHTML(item.title)}</p>
          <p class="listing-mini__price">${escapeHTML(item.price || '—')}</p>
          <div class="listing-mini__meta">
            <span>${escapeHTML(capitalise(item.status || 'active'))}</span>
            ${item.views !== undefined
              ? `<span><i class="fa-solid fa-eye" aria-hidden="true"></i> ${item.views}</span>`
              : ''
            }
          </div>
        </div>
      `;

      listingsGrid.appendChild(card);
    });
  }


  /* ==========================================================
     9. RENDER: MY REQUESTS
  ========================================================== */

  function renderRequests(requests) {
    requestsList.innerHTML = '';

    if (!requests || requests.length === 0) {
      requestsList.appendChild(buildEmptyState(
        'fa-solid fa-bullhorn',
        'No requests yet',
        "Post a request and let the community help you find what you need.",
        { href: '../sell/index.html?type=request', label: 'Post a Request' }
      ));
      return;
    }

    requests.forEach((item, i) => {
      const el = buildListItem({
        href:     item.link || '#',
        icon:     item.emoji || '📢',
        title:    item.title,
        status:   item.status,
        meta:     item.meta,
        time:     item.time,
        delay:    i * 55,
      });
      requestsList.appendChild(el);
    });
  }


  /* ==========================================================
     10. RENDER: MY REPLIES
  ========================================================== */

  function renderReplies(replies) {
    repliesList.innerHTML = '';

    if (!replies || replies.length === 0) {
      repliesList.appendChild(buildEmptyState(
        'fa-solid fa-reply',
        'No replies yet',
        'When you respond to someone\'s request, it will appear here.',
        null
      ));
      return;
    }

    replies.forEach((item, i) => {
      const el = buildListItem({
        href:     item.link || '#',
        icon:     '💬',
        title:    item.request_title || item.title,
        meta:     item.body?.slice(0, 60) + '…' || '',
        time:     item.time,
        delay:    i * 55,
      });
      repliesList.appendChild(el);
    });
  }


  /* ==========================================================
     11. LOGOUT
  ========================================================== */

  logoutBtn.addEventListener('click', async () => {
    const confirmed = confirm('Are you sure you want to log out?');
    if (!confirmed) return;

    try {
      // FUTURE: This is the real Supabase logout call
      await window._supabase.auth.signOut();
    } catch (err) {
      console.warn('JARA: Logout error.', err?.message);
    }

    window.location.href = '../auth/login.html';
  });


  /* ==========================================================
     12. SHARE PROFILE
  ========================================================== */

  function handleShareProfile() {
    const profile = state.profile;
    const name    = profile?.full_name || 'JARA Member';
    // FUTURE: Use real profile URL once public profile pages are built
    const url     = `https://jara.app/profile/${profile?.jara_id || 'JARA-00001'}`;
    const text    = `Check out ${name}'s profile on JARA ∆ — the campus marketplace.`;

    if (navigator.share) {
      navigator.share({ title: `${name} — JARA ∆`, text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        showToast('Profile link copied!');
      }).catch(() => {
        showToast('Could not copy link. Try manually: ' + url);
      });
    }
  }

  shareBtn.addEventListener('click', handleShareProfile);
  shareProfileBtn.addEventListener('click', handleShareProfile);


  /* ==========================================================
     13. NOTIFICATION TOGGLE
  ========================================================== */

  notifToggle.addEventListener('change', () => {
    // FUTURE: Save preference to user's profile or browser settings
    // For now just visual feedback
    const isOn = notifToggle.checked;
    showToast(isOn ? 'Notifications enabled' : 'Notifications disabled');
  });


  /* ==========================================================
     14. PULL-TO-REFRESH
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
     FUTURE: Re-run the Supabase profile + stats queries here.
     For now, we just re-render with placeholder data.
    */
    await new Promise(resolve => setTimeout(resolve, 1200));

    renderProfileHeader(PLACEHOLDER_PROFILE);
    renderStats(PLACEHOLDER_STATS);
    renderListings(PLACEHOLDER_LISTINGS);
    renderRequests(PLACEHOLDER_REQUESTS);
    renderReplies(PLACEHOLDER_REPLIES);

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
     15. UTILITY HELPERS
  ========================================================== */

  function escapeHTML(str) {
    if (!str && str !== 0) return '';
    const d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
  }

  function buildEmptyState(iconCls, title, sub, link) {
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
      ${link
        ? `<a href="${link.href}" class="btn-primary">
             ${escapeHTML(link.label)}
             <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
           </a>`
        : ''
      }
    `;
    return el;
  }

  function buildListItem({ href, icon, title, status, meta, time, delay = 0 }) {
    const el = document.createElement('a');
    el.className = 'list-item';
    el.href      = href || '#';
    el.setAttribute('role', 'listitem');
    el.style.animationDelay = `${delay}ms`;
    el.style.animation = 'fade-up 280ms ease both';

    const statusMap = {
      active:  'status-pill--active',
      paused:  'status-pill--paused',
      expired: 'status-pill--expired',
      pending: 'status-pill--pending',
    };
    const statusCls = statusMap[status] || '';

    el.innerHTML = `
      <div class="list-item__icon" aria-hidden="true">${icon || '📦'}</div>
      <div class="list-item__content">
        <p class="list-item__title">${escapeHTML(title)}</p>
        <div class="list-item__meta">
          ${status
            ? `<span class="status-pill ${statusCls}">${escapeHTML(capitalise(status))}</span>`
            : ''
          }
          ${meta ? `<span>${escapeHTML(meta)}</span>` : ''}
          ${time ? `<span>${escapeHTML(time)}</span>` : ''}
        </div>
      </div>
      <i class="fa-solid fa-chevron-right list-item__arrow" aria-hidden="true"></i>
    `;

    return el;
  }

  /** Small non-blocking toast notification */
  function showToast(message) {
    const existing = document.getElementById('jaraToast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id          = 'jaraToast';
    toast.textContent = message;
    Object.assign(toast.style, {
      position:     'fixed',
      bottom:       'calc(var(--bottom-nav-height, 68px) + 16px)',
      left:         '50%',
      transform:    'translateX(-50%) translateY(8px)',
      background:   'var(--color-surface-2, #1A1A2A)',
      border:       '1px solid var(--color-border, #2A2A3E)',
      borderRadius: '9999px',
      padding:      '10px 20px',
      fontSize:     '0.875rem',
      fontFamily:   'var(--font-display)',
      fontWeight:   '600',
      color:        'var(--color-text-primary, #F4F4F8)',
      zIndex:       '200',
      boxShadow:    '0 8px 32px rgba(0,0,0,0.4)',
      transition:   'opacity 300ms ease, transform 300ms ease',
      opacity:      '0',
      whiteSpace:   'nowrap',
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
    }, 2500);
  }


  /* ==========================================================
     16. INIT
  ========================================================== */

  async function init() {
    // Load user — returns profile data (real or placeholder)
    const profile = await loadUser();
    if (!profile) return;

    // Render all sections
    renderProfileHeader(profile);
    renderStats(PLACEHOLDER_STATS);
    renderListings(PLACEHOLDER_LISTINGS);
    renderRequests(PLACEHOLDER_REQUESTS);
    renderReplies(PLACEHOLDER_REPLIES);

    // Start on Listings tab
    switchContentTab('listings');
  }

  init();


/* ============================================================
   End of DOMContentLoaded
============================================================ */
});
