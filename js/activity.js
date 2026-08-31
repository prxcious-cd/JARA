/* ============================================================
   JARA ∆ — Activity Page
   js/activity.js

   Drives the 4-tab activity experience:
     Tab 1 — Notifications (from Supabase notifications table)
     Tab 2 — My Activity  (listings, requests, replies)
     Tab 3 — Saved        (favorites table)
     Tab 4 — Recent       (localStorage view history)

   All IDs verified against activity/index.html.

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
    userId:       null,
    notifFilter:  'all',
    notifications: [],
  };

  /* ==========================================================
     DOM REFS — verified against activity/index.html
  ========================================================== */

  // Topbar
  const markAllRead    = document.getElementById('markAllRead');
  const notifBadge     = document.getElementById('notifBadge');

  // Tabs
  const tabNotifications = document.getElementById('tabNotifications');
  const tabActivity      = document.getElementById('tabActivity');
  const tabSaved         = document.getElementById('tabSaved');
  const tabViewed        = document.getElementById('tabViewed');

  // Panels
  const panelNotifications = document.getElementById('panelNotifications');
  const panelActivity      = document.getElementById('panelActivity');
  const panelSaved         = document.getElementById('panelSaved');
  const panelViewed        = document.getElementById('panelViewed');

  // Notification panel
  const notifFilterRow  = document.getElementById('notifFilterRow');
  const notifList       = document.getElementById('notifList');
  const notifFilters    = document.querySelectorAll('[data-notif-filter]');

  // Activity panel
  const statListings    = document.getElementById('statListings');
  const statRequests    = document.getElementById('statRequests');
  const statReplies     = document.getElementById('statReplies');
  const statViews       = document.getElementById('statViews');
  const myListingsList  = document.getElementById('myListingsList');
  const myRequestsList  = document.getElementById('myRequestsList');
  const myRepliesList   = document.getElementById('myRepliesList');

  // Saved + Viewed panels
  const savedList       = document.getElementById('savedList');
  const viewedList      = document.getElementById('viewedList');


  /* ==========================================================
     TAB SWITCHING
  ========================================================== */

  const TABS = [
    { tab: tabNotifications, panel: panelNotifications, key: 'notifications' },
    { tab: tabActivity,      panel: panelActivity,      key: 'activity'      },
    { tab: tabSaved,         panel: panelSaved,         key: 'saved'         },
    { tab: tabViewed,        panel: panelViewed,        key: 'viewed'        },
  ];

  function activateTab(key) {
    TABS.forEach(({ tab, panel, key: k }) => {
      const isActive = k === key;
      tab?.classList.toggle('ac-tab--active', isActive);
      tab?.setAttribute('aria-selected', String(isActive));
      if (panel) panel.hidden = !isActive;
    });

    // Load content for tab on first visit
    if (key === 'notifications') loadNotifications();
    if (key === 'activity')      loadActivity();
    if (key === 'saved')         loadSaved();
    if (key === 'viewed')        loadViewed();
  }

  TABS.forEach(({ tab, key }) => {
    tab?.addEventListener('click', () => activateTab(key));
  });


  /* ==========================================================
     NOTIFICATION FILTER CHIPS
     Uses data-notif-filter — matches activity/index.html exactly
  ========================================================== */

  notifFilters.forEach(chip => {
    chip.addEventListener('click', () => {
      notifFilters.forEach(c => {
        c.classList.remove('notif-filter--active');
        c.setAttribute('aria-pressed', 'false');
      });
      chip.classList.add('notif-filter--active');
      chip.setAttribute('aria-pressed', 'true');

      S.notifFilter = chip.dataset.notifFilter;
      renderNotifications();
    });
  });


  /* ==========================================================
     LOAD NOTIFICATIONS
  ========================================================== */

  async function loadNotifications() {
    if (!notifList) return;

    showListSkeleton(notifList, 4);

    try {
      const sb = window._supabase;
      if (!sb || !S.userId) {
        showEmpty(notifList, 'fa-solid fa-bell', 'No notifications', 'You\'re all caught up.');
        return;
      }

      const { data, error } = await sb
        .from('notifications')
        .select('id, type, title, body, link_url, is_read, created_at')
        .eq('user_id', S.userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw new Error(error.message);

      S.notifications = data || [];

      // Show mark all read if there are unread
      const unreadCount = S.notifications.filter(n => !n.is_read).length;
      if (markAllRead) markAllRead.hidden = unreadCount === 0;
      if (notifBadge) {
        notifBadge.textContent = unreadCount;
        notifBadge.hidden = unreadCount === 0;
      }

      renderNotifications();

    } catch (err) {
      console.error('Activity: loadNotifications error:', err.message);
      showEmpty(notifList, 'fa-solid fa-bell', 'Could not load notifications', 'Please check your connection.');
    }
  }

  function renderNotifications() {
    if (!notifList) return;
    notifList.innerHTML = '';

    let filtered = S.notifications;

    if (S.notifFilter === 'unread') {
      filtered = filtered.filter(n => !n.is_read);
    } else if (S.notifFilter !== 'all') {
      filtered = filtered.filter(n => n.type === S.notifFilter);
    }

    if (filtered.length === 0) {
      showEmpty(notifList, 'fa-solid fa-bell-slash',
        S.notifFilter === 'unread' ? 'All caught up' : 'No notifications',
        S.notifFilter === 'unread' ? 'No unread notifications.' : 'Nothing here yet.'
      );
      return;
    }

    filtered.forEach(notif => {
      const item = document.createElement('div');
      item.className = `notif-item${notif.is_read ? '' : ' notif-item--unread'}`;
      item.setAttribute('role', 'listitem');

      const typeIcon = {
        listings: 'fa-solid fa-box',
        requests: 'fa-solid fa-bullhorn',
        system:   'fa-solid fa-circle-info',
      }[notif.type] || 'fa-solid fa-bell';

      item.innerHTML = `
        <div class="notif-item__icon">
          <i class="${typeIcon}" aria-hidden="true"></i>
        </div>
        <div class="notif-item__content">
          <p class="notif-item__title">${esc(notif.title || 'Notification')}</p>
          ${notif.body ? `<p class="notif-item__body">${esc(notif.body)}</p>` : ''}
          <p class="notif-item__time">${timeAgo(notif.created_at)}</p>
        </div>
        ${!notif.is_read ? '<span class="notif-item__dot" aria-label="Unread"></span>' : ''}
      `;

      if (notif.link_url) {
        item.style.cursor = 'pointer';
        item.addEventListener('click', () => {
          markRead(notif.id);
          window.location.href = notif.link_url;
        });
      } else {
        item.addEventListener('click', () => markRead(notif.id));
      }

      notifList.appendChild(item);
    });
  }

  async function markRead(notifId) {
    const sb = window._supabase;
    if (!sb) return;

    try {
      await sb.from('notifications').update({ is_read: true }).eq('id', notifId);
      const notif = S.notifications.find(n => n.id === notifId);
      if (notif) notif.is_read = true;

      const unreadCount = S.notifications.filter(n => !n.is_read).length;
      if (notifBadge) { notifBadge.textContent = unreadCount; notifBadge.hidden = unreadCount === 0; }
      if (markAllRead) markAllRead.hidden = unreadCount === 0;

      renderNotifications();
    } catch (err) {
      console.error('Activity: markRead error:', err.message);
    }
  }

  markAllRead?.addEventListener('click', async () => {
    const sb = window._supabase;
    if (!sb || !S.userId) return;

    try {
      await sb.from('notifications')
        .update({ is_read: true })
        .eq('user_id', S.userId)
        .eq('is_read', false);

      S.notifications.forEach(n => n.is_read = true);
      if (notifBadge) { notifBadge.textContent = '0'; notifBadge.hidden = true; }
      if (markAllRead) markAllRead.hidden = true;
      renderNotifications();
    } catch (err) {
      console.error('Activity: markAllRead error:', err.message);
    }
  });


  /* ==========================================================
     LOAD ACTIVITY TAB
  ========================================================== */

  async function loadActivity() {
    if (!S.userId) return;

    try {
      const sb = window._supabase;
      if (!sb) return;

      // Load stats in parallel
      const [listingsRes, requestsRes] = await Promise.all([
        sb.from('listings')
          .select('id', { count: 'exact', head: true })
          .eq('owner_id', S.userId)
          .eq('status', 'active'),

        sb.from('listings')
          .select('id', { count: 'exact', head: true })
          .eq('owner_id', S.userId)
          .eq('listing_type', 'request')
          .eq('status', 'active'),
      ]);

      if (statListings) statListings.textContent = listingsRes.count || 0;
      if (statRequests) statRequests.textContent = requestsRes.count || 0;
      if (statReplies)  statReplies.textContent  = 0;
      if (statViews)    statViews.textContent    = 0;

      // Load my listings
      await loadMyListings();
      await loadMyRequests();

      // Replies placeholder
      if (myRepliesList) {
        showEmpty(myRepliesList, 'fa-solid fa-reply', 'No replies yet',
          'Your replies to campus requests will appear here.');
      }

    } catch (err) {
      console.error('Activity: loadActivity error:', err.message);
    }
  }

  async function loadMyListings() {
    if (!myListingsList) return;
    showListSkeleton(myListingsList, 2);

    try {
      const { data, error } = await window.JARAListings.fetch({
        ownerId:   S.userId,
        status:    null,
        type:      'product',
        limit:     5,
        offset:    0,
        orderBy:   'created_at',
        ascending: false,
      });

      myListingsList.innerHTML = '';

      if (error || !data || data.length === 0) {
        showEmpty(myListingsList, 'fa-solid fa-box-open', 'No listings yet',
          'Create your first listing to start selling.');
        return;
      }

      data.forEach(listing => {
        const cover = window.JARAListings.getCoverImage(listing);
        const price = window.JARAListings.formatPrice(listing);
        const item  = document.createElement('a');
        item.className = 'activity-item j-card';
        item.href      = `../listing/index.html?id=${esc(listing.id)}`;
        item.setAttribute('role', 'listitem');
        item.innerHTML = `
          <div class="activity-item__img-wrap">
            ${cover
              ? `<img src="${esc(cover)}" alt="${esc(listing.title)}" loading="lazy" class="activity-item__img" />`
              : `<div class="activity-item__img-placeholder"><i class="fa-solid fa-image" aria-hidden="true"></i></div>`
            }
          </div>
          <div class="activity-item__content">
            <p class="activity-item__title">${esc(listing.title)}</p>
            <p class="activity-item__price">${esc(price)}</p>
            <p class="activity-item__meta">${timeAgo(listing.created_at)}</p>
          </div>
          <a class="activity-item__edit" href="../sell/index.html?edit=${esc(listing.id)}"
             aria-label="Edit" onclick="event.stopPropagation()">
            <i class="fa-solid fa-pen" aria-hidden="true"></i>
          </a>
        `;
        myListingsList.appendChild(item);
      });

    } catch (err) {
      console.error('Activity: loadMyListings error:', err.message);
      showEmpty(myListingsList, 'fa-solid fa-box-open', 'Could not load listings', '');
    }
  }

  async function loadMyRequests() {
    if (!myRequestsList) return;
    showListSkeleton(myRequestsList, 2);

    try {
      const { data, error } = await window.JARAListings.fetch({
        ownerId:   S.userId,
        type:      'request',
        status:    'active',
        limit:     5,
        offset:    0,
        orderBy:   'created_at',
        ascending: false,
      });

      myRequestsList.innerHTML = '';

      if (error || !data || data.length === 0) {
        showEmpty(myRequestsList, 'fa-solid fa-bullhorn', 'No requests yet',
          'Post a request when you need something on campus.');
        return;
      }

      data.forEach(listing => {
        const item = document.createElement('a');
        item.className = 'activity-item j-card';
        item.href      = `../listing/index.html?id=${esc(listing.id)}`;
        item.setAttribute('role', 'listitem');
        item.innerHTML = `
          <div class="activity-item__icon">
            <i class="fa-solid fa-bullhorn" aria-hidden="true"></i>
          </div>
          <div class="activity-item__content">
            <p class="activity-item__title">${esc(listing.title)}</p>
            <p class="activity-item__meta">${timeAgo(listing.created_at)}</p>
          </div>
        `;
        myRequestsList.appendChild(item);
      });

    } catch (err) {
      console.error('Activity: loadMyRequests error:', err.message);
      showEmpty(myRequestsList, 'fa-solid fa-bullhorn', 'Could not load requests', '');
    }
  }


  /* ==========================================================
     LOAD SAVED TAB
  ========================================================== */

  async function loadSaved() {
    if (!savedList) return;
    showListSkeleton(savedList, 3);

    /*
     FUTURE: The favorites table has product_id/service_id columns
     not listing_id. Once the schema is unified, replace with:
       SELECT f.*, l.* FROM favorites f
       JOIN listings l ON l.id = f.listing_id
       WHERE f.user_id = auth.uid()
    */

    // For now show empty state with helpful message
    showEmpty(savedList, 'fa-solid fa-bookmark',
      'No saved items',
      'Tap the bookmark icon on any listing to save it here.'
    );
  }


  /* ==========================================================
     LOAD RECENTLY VIEWED TAB
  ========================================================== */

  function loadViewed() {
    if (!viewedList) return;

    /*
     FUTURE: Store view history in localStorage or Supabase:
       const viewed = JSON.parse(localStorage.getItem('jara_viewed') || '[]');
    */

    showEmpty(viewedList, 'fa-solid fa-clock-rotate-left',
      'No recent views',
      'Listings you view will appear here.'
    );
  }


  /* ==========================================================
     HELPERS
  ========================================================== */

  function showListSkeleton(container, count) {
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const skel = document.createElement('div');
      skel.className = 'activity-item j-skel';
      skel.style.height = '72px';
      skel.setAttribute('aria-hidden', 'true');
      container.appendChild(skel);
    }
  }

  function showEmpty(container, icon, title, body) {
    if (!container) return;
    container.innerHTML = '';
    if (window.jaraEmpty) {
      window.jaraEmpty(container, { icon, title, body });
    } else {
      container.innerHTML = `
        <div style="text-align:center;padding:2rem 1rem">
          <i class="${icon}" style="font-size:2rem;color:#55556A;margin-bottom:0.75rem;display:block" aria-hidden="true"></i>
          <p style="font-family:'Space Grotesk',sans-serif;font-weight:700;color:#F4F4F8;margin-bottom:0.25rem">${esc(title)}</p>
          <p style="font-size:0.875rem;color:#9090A8">${esc(body)}</p>
        </div>
      `;
    }
  }

  function esc(str) {
    if (!str && str !== 0) return '';
    const d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
  }

  function timeAgo(iso) {
    try {
      const diff  = Date.now() - new Date(iso).getTime();
      const mins  = Math.floor(diff / 60000);
      const hours = Math.floor(mins / 60);
      const days  = Math.floor(hours / 24);
      if (mins  < 1)  return 'just now';
      if (mins  < 60) return `${mins}m ago`;
      if (hours < 24) return `${hours}h ago`;
      if (days  < 7)  return `${days}d ago`;
      return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
    } catch { return ''; }
  }


  /* ==========================================================
     INJECT CARD STYLES
  ========================================================== */

  function injectStyles() {
    if (document.getElementById('activity-card-styles')) return;
    const style = document.createElement('style');
    style.id = 'activity-card-styles';
    style.textContent = `
      .activity-item {
        display: flex;
        align-items: center;
        gap: 0.875rem;
        background: var(--color-surface, #111118);
        border: 1px solid var(--color-border, #2A2A3E);
        border-radius: 14px;
        padding: 0.875rem;
        text-decoration: none;
        margin-bottom: 0.625rem;
        transition: border-color 200ms ease, transform 150ms ease;
      }
      .activity-item:hover { border-color: rgba(124,58,237,0.3); transform: translateX(2px); }

      .activity-item__img-wrap {
        width: 48px; height: 48px;
        border-radius: 10px; overflow: hidden;
        background: #1A1A2A; flex-shrink: 0;
      }
      .activity-item__img { width: 100%; height: 100%; object-fit: cover; }
      .activity-item__img-placeholder {
        width: 100%; height: 100%;
        display: flex; align-items: center; justify-content: center;
        font-size: 1.25rem; color: #55556A;
      }
      .activity-item__icon {
        width: 40px; height: 40px; border-radius: 10px;
        background: rgba(245,158,11,0.1);
        display: flex; align-items: center; justify-content: center;
        font-size: 1rem; color: #F59E0B; flex-shrink: 0;
      }
      .activity-item__content { flex: 1; min-width: 0; }
      .activity-item__title {
        font-family: 'Space Grotesk', sans-serif;
        font-size: 0.9rem; font-weight: 700; color: #F4F4F8;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        margin-bottom: 2px;
      }
      .activity-item__price {
        font-family: 'Space Grotesk', sans-serif;
        font-size: 0.8125rem; font-weight: 700; color: #A78BFA; margin-bottom: 2px;
      }
      .activity-item__meta { font-size: 0.75rem; color: #55556A; }
      .activity-item__edit {
        width: 32px; height: 32px; border-radius: 8px;
        background: #1A1A2A; border: 1px solid #2A2A3E;
        display: flex; align-items: center; justify-content: center;
        color: #9090A8; font-size: 0.75rem; flex-shrink: 0;
        text-decoration: none; transition: background 150ms ease;
      }
      .activity-item__edit:hover { background: #2A2A3E; color: #F4F4F8; }

      .notif-item {
        display: flex; align-items: flex-start; gap: 0.875rem;
        padding: 1rem 1.25rem;
        border-bottom: 1px solid #1E1E2E;
        cursor: pointer;
        transition: background 150ms ease;
      }
      .notif-item:hover { background: rgba(124,58,237,0.04); }
      .notif-item--unread { background: rgba(124,58,237,0.05); }

      .notif-item__icon {
        width: 36px; height: 36px; border-radius: 10px;
        background: rgba(124,58,237,0.1);
        display: flex; align-items: center; justify-content: center;
        font-size: 0.875rem; color: #A78BFA; flex-shrink: 0;
      }
      .notif-item__content { flex: 1; min-width: 0; }
      .notif-item__title {
        font-family: 'Space Grotesk', sans-serif;
        font-size: 0.9rem; font-weight: 700; color: #F4F4F8; margin-bottom: 2px;
      }
      .notif-item__body { font-size: 0.875rem; color: #9090A8; margin-bottom: 3px; line-height: 1.5; }
      .notif-item__time { font-size: 0.75rem; color: #55556A; }
      .notif-item__dot {
        width: 8px; height: 8px; border-radius: 50%;
        background: #7C3AED; flex-shrink: 0; margin-top: 6px;
      }
    `;
    document.head.appendChild(style);
  }


  /* ==========================================================
     INIT
  ========================================================== */

  async function init() {
    injectStyles();

    try {
      const result = await JARAAuth.getCurrentUser();
      if (!result) return;
      S.userId = result.user.id;
    } catch (err) {
      console.error('Activity: init error:', err.message);
    }

    // Load notifications tab by default (it is the active tab)
    loadNotifications();
  }

  init();

});
