/* ============================================================
   JARA ∆ — Admin Panel Logic
   js/admin.js

   Depends on:
     - window._supabase  (js/supabase-client.js)
     - DOM in admin/index.html

   SECURITY NOTE:
   ─────────────────────────────────────────────────────────────
   This page guards itself by checking that the logged-in user
   has admin status. The real enforcement must ALSO happen at
   the database level via Supabase RLS policies and a
   separate `admin_users` table or a role column.
   Never rely only on frontend checks for security.
   ─────────────────────────────────────────────────────────────

   TABLE OF CONTENTS
   1.  Constants — placeholder data
   2.  State
   3.  Auth guard — admin only
   4.  Sidebar navigation
   5.  Mobile sidebar toggle
   6.  Section renderer
   7.  Overview section
   8.  KPI cards
   9.  Activity feed
   10. Users section
   11. Businesses section
   12. Listings section
   13. Founding Members section
   14. JARA PRO section
   15. Announcements section
   16. Analytics section
   17. Settings section
   18. Confirmation modal
   19. Utility helpers
   20. Init
============================================================ */

document.addEventListener('DOMContentLoaded', () => {


  /* ==========================================================
     1. CONSTANTS — PLACEHOLDER DATA
     Each block is labelled with its future Supabase query.
  ========================================================== */

  /* FUTURE: SELECT COUNT(*) per type from profiles table */
  const PLACEHOLDER_KPI = [
    { id: 'totalUsers',       icon: 'fa-solid fa-users',          label: 'Total Members',        value: 247,  accent: 'accent' },
    { id: 'totalBusinesses',  icon: 'fa-solid fa-store',          label: 'Businesses',           value: 38,   accent: '' },
    { id: 'totalListings',    icon: 'fa-solid fa-box',            label: 'Total Listings',       value: 614,  accent: '' },
    { id: 'totalProducts',    icon: 'fa-solid fa-tag',            label: 'Products',             value: 312,  accent: '' },
    { id: 'totalServices',    icon: 'fa-solid fa-screwdriver-wrench', label: 'Services',         value: 189,  accent: '' },
    { id: 'totalRequests',    icon: 'fa-solid fa-bullhorn',       label: 'Requests',             value: 113,  accent: '' },
    { id: 'verifiedUsers',    icon: 'fa-solid fa-circle-check',   label: 'Verified Users',       value: 12,   accent: 'green' },
    { id: 'pendingVerif',     icon: 'fa-solid fa-clock',          label: 'Pending Verifications',value: 5,    accent: '' },
    { id: 'reportedListings', icon: 'fa-solid fa-flag',           label: 'Reported Listings',    value: 3,    accent: 'red' },
    { id: 'foundingMembers',  icon: 'fa-solid fa-medal',          label: 'Founding Members',     value: 12,   accent: '' },
    { id: 'proMembers',       icon: 'fa-solid fa-crown',          label: 'JARA PRO Members',     value: 7,    accent: 'gold' },
    { id: 'verifiedBiz',      icon: 'fa-solid fa-badge-check',    label: 'Verified Businesses',  value: 8,    accent: '' },
  ];

  /* FUTURE: SELECT * FROM profiles ORDER BY created_at DESC LIMIT 20 */
  const PLACEHOLDER_USERS = [
    { id: 'u1',  name: 'Precious Okafor',  email: 'precious@jara.app',    jaraId: 'JARA-00001', type: 'student',      status: 'verified',  joined: '10 Jan 2025' },
    { id: 'u2',  name: 'Blessing Adeyemi', email: 'blessing@example.com', jaraId: 'JARA-00042', type: 'business',     status: 'verified',  joined: '12 Jan 2025' },
    { id: 'u3',  name: 'Emeka Johnson',    email: 'emeka@example.com',    jaraId: 'JARA-00018', type: 'seller',       status: 'pending',   joined: '14 Jan 2025' },
    { id: 'u4',  name: 'Adaeze Okonkwo',   email: 'adaeze@example.com',   jaraId: 'JARA-00066', type: 'student',      status: 'verified',  joined: '16 Jan 2025' },
    { id: 'u5',  name: 'Zainab Mohammed',  email: 'zainab@example.com',   jaraId: 'JARA-00031', type: 'professional', status: 'pending',   joined: '18 Jan 2025' },
    { id: 'u6',  name: 'Fatima Kola',      email: 'fatima@example.com',   jaraId: 'JARA-00099', type: 'student',      status: 'verified',  joined: '20 Jan 2025' },
    { id: 'u7',  name: 'Tunde Eze',        email: 'tunde@example.com',    jaraId: 'JARA-00112', type: 'seller',       status: 'suspended', joined: '22 Jan 2025' },
  ];

  /* FUTURE: SELECT * FROM profiles WHERE account_type IN ('business','service_provider') */
  const PLACEHOLDER_BIZ = [
    { id: 'b1', name: "Blessing's Kitchen", owner: 'Blessing Adeyemi', category: 'Food & Drinks', status: 'verified', joined: '12 Jan 2025' },
    { id: 'b2', name: 'ZM Creative Studio', owner: 'Zainab Mohammed',  category: 'Creative Services', status: 'pending', joined: '18 Jan 2025' },
    { id: 'b3', name: 'Emeka Power Rentals', owner: 'Emeka Johnson',   category: 'Power & Generator', status: 'pending', joined: '14 Jan 2025' },
    { id: 'b4', name: 'Kemi Laundry',       owner: 'Kemi Fashola',     category: 'Laundry & Errands', status: 'verified', joined: '9 Jan 2025' },
  ];

  /* FUTURE: SELECT * FROM products UNION ALL services UNION ALL requests ORDER BY created_at DESC LIMIT 20 */
  const PLACEHOLDER_LISTINGS = [
    { id: 'p1', title: 'Honda Generator 2.5KVA', type: 'product', seller: 'Emeka J.', status: 'active', views: 89 },
    { id: 's2', title: 'Graphic Design — Flyers & Logos', type: 'service', seller: 'Zainab M.', status: 'active', views: 134 },
    { id: 'p3', title: 'Fairly Used iPhone 12', type: 'product', seller: 'Hassan B.', status: 'active', views: 67 },
    { id: 'rq1', title: 'Need generator tonight', type: 'request', seller: 'Anonymous', status: 'active', views: 12 },
    { id: 's4', title: 'Assignment Typing', type: 'service', seller: 'David K.', status: 'active', views: 45 },
  ];

  /* FUTURE: SELECT * FROM reports WHERE status = 'pending' ORDER BY created_at DESC */
  const PLACEHOLDER_REPORTS = [
    { id: 'r1', title: 'Suspicious Generator Listing', reason: 'Possible scam — price too good', reporter: 'Anonymous', time: '2 hours ago' },
    { id: 'r2', title: 'Profile: Unknown User', reason: 'Fake identity, no school affiliation', reporter: 'Tunde E.', time: '5 hours ago' },
    { id: 'r3', title: 'Service: Laptop Repair', reason: 'Charged and disappeared', reporter: 'Adaeze O.', time: '1 day ago' },
  ];

  /* FUTURE: SELECT * FROM profiles WHERE is_founding_member = TRUE ORDER BY created_at ASC */
  const PLACEHOLDER_FOUNDING = [
    { id: 'f1', name: 'Precious Okafor',  jaraId: 'JARA-00001', awarded: '10 Jan 2025' },
    { id: 'f2', name: 'Blessing Adeyemi', jaraId: 'JARA-00042', awarded: '12 Jan 2025' },
    { id: 'f3', name: 'Adaeze Okonkwo',   jaraId: 'JARA-00066', awarded: '16 Jan 2025' },
    { id: 'f4', name: 'Fatima Kola',      jaraId: 'JARA-00099', awarded: '20 Jan 2025' },
  ];

  /* FUTURE: SELECT * FROM premium_subscriptions WHERE status IN ('active','expired') ORDER BY created_at DESC */
  const PLACEHOLDER_PRO = [
    { id: 'pr1', name: 'Blessing Adeyemi', plan: 'Monthly',   expires: '28 Feb 2025', status: 'active'  },
    { id: 'pr2', name: 'Zainab Mohammed',  plan: '3 Months',  expires: '10 Apr 2025', status: 'active'  },
    { id: 'pr3', name: 'Kemi Fashola',     plan: 'Monthly',   expires: '15 Jan 2025', status: 'expired' },
  ];

  const PLACEHOLDER_ACTIVITY = [
    { type: 'user',    icon: 'fa-solid fa-user-plus',      text: '<strong>Adaeze Okonkwo</strong> joined JARA.',            time: '2 min ago' },
    { type: 'report',  icon: 'fa-solid fa-flag',           text: 'Listing <strong>"Generator for Rent"</strong> reported.', time: '18 min ago' },
    { type: 'biz',     icon: 'fa-solid fa-store',          text: '<strong>ZM Creative Studio</strong> requested verification.', time: '1 hr ago' },
    { type: 'pro',     icon: 'fa-solid fa-crown',          text: '<strong>Blessing Adeyemi</strong> subscribed to PRO.',    time: '3 hrs ago' },
    { type: 'listing', icon: 'fa-solid fa-box',            text: '<strong>12 new listings</strong> created today.',         time: '6 hrs ago' },
    { type: 'user',    icon: 'fa-solid fa-user-check',     text: '<strong>Fatima Kola</strong> verified their email.',      time: 'Yesterday' },
  ];

  const PLACEHOLDER_SENT_ANN = [
    { title: 'Welcome to JARA ∆', to: 'All members', time: '10 Jan 2025' },
  ];

  /* FUTURE: Analytics data from a separate analytics table or aggregation function */
  const ANALYTICS_CHART_DATA = [8, 14, 11, 22, 19, 31, 28, 36, 42, 38, 55, 61, 48, 70];
  const ANALYTICS_CHART_LABELS = ['12/1','13/1','14/1','15/1','16/1','17/1','18/1','19/1','20/1','21/1','22/1','23/1','24/1','25/1'];
  const ANALYTICS_CATEGORIES = [
    { name: 'Generator',    searches: 284 },
    { name: 'Laundry',      searches: 221 },
    { name: 'Food',         searches: 198 },
    { name: 'Laptop Repair',searches: 167 },
    { name: 'Printing',     searches: 134 },
    { name: 'Books',        searches: 112 },
    { name: 'Tutoring',     searches: 98  },
    { name: 'Haircut',      searches: 87  },
  ];


  /* ==========================================================
     2. STATE
  ========================================================== */
  const state = {
    activeSection:  'overview',
    userFilter:     'all',
    listingFilter:  'all',
    userId:         null,
    modalAction:    null,   // { action, targetId, label }
  };


  /* ==========================================================
     3. AUTH GUARD — ADMIN ONLY
     ─────────────────────────────────────────────────────────
     FUTURE: Add a column `is_admin BOOLEAN DEFAULT FALSE` to
     the profiles table, or create a separate `admin_users`
     table. Then check:
       SELECT is_admin FROM profiles WHERE id = auth.uid()
     If FALSE → redirect to explore.
     ─────────────────────────────────────────────────────────
  ========================================================== */

  async function adminGuard() {
    try {
      const { data: { session } } = await window._supabase.auth.getSession();

      if (!session) {
        window.location.href = '../auth/login.html';
        return false;
      }

      state.userId = session.user.id;

      /*
       FUTURE: Uncomment this block when the is_admin column exists:

       const { data: profile, error } = await window._supabase
         .from('profiles')
         .select('is_admin')
         .eq('id', state.userId)
         .single();

       if (error || !profile?.is_admin) {
         window.location.href = '../explore/index.html';
         return false;
       }
      */

      return true;

    } catch (err) {
      console.error('JARA admin guard error:', err);
      window.location.href = '../auth/login.html';
      return false;
    }
  }


  /* ==========================================================
     4. SIDEBAR NAVIGATION
  ========================================================== */

  const sidebarLinks = document.querySelectorAll('.sidebar-link');

  sidebarLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.dataset.section;
      if (section) switchSection(section);
      // Close mobile sidebar after navigation
      closeMobileSidebar();
    });
  });

  // Quick action buttons on overview
  document.querySelectorAll('.quick-action[data-section]').forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.dataset.section;
      if (section) switchSection(section);
    });
  });

  function switchSection(sectionName) {
    state.activeSection = sectionName;

    // Update sidebar links
    sidebarLinks.forEach(link => {
      link.classList.toggle('sidebar-link--active', link.dataset.section === sectionName);
    });

    // Update panels
    document.querySelectorAll('.admin-section').forEach(panel => {
      const id = `section${capitalise(sectionName)}`;
      if (panel.id === id) {
        panel.removeAttribute('hidden');
        panel.classList.add('admin-section--active');
      } else {
        panel.setAttribute('hidden', '');
        panel.classList.remove('admin-section--active');
      }
    });

    // Scroll to top
    document.querySelector('.admin-main')?.scrollTo({ top: 0, behavior: 'smooth' });
  }


  /* ==========================================================
     5. MOBILE SIDEBAR TOGGLE
  ========================================================== */

  const sidebarToggle  = document.getElementById('sidebarToggle');
  const adminSidebar   = document.getElementById('adminSidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');

  function openMobileSidebar() {
    adminSidebar.classList.add('is-open');
    sidebarOverlay.classList.add('is-visible');
    sidebarToggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileSidebar() {
    adminSidebar.classList.remove('is-open');
    sidebarOverlay.classList.remove('is-visible');
    sidebarToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  sidebarToggle.addEventListener('click', () => {
    const isOpen = adminSidebar.classList.contains('is-open');
    isOpen ? closeMobileSidebar() : openMobileSidebar();
  });

  sidebarOverlay.addEventListener('click', closeMobileSidebar);


  /* ==========================================================
     6. SECTION RENDERER — calls the right render function
  ========================================================== */

  function renderSection(section) {
    const renders = {
      overview:      renderOverview,
      users:         renderUsers,
      businesses:    renderBusinesses,
      listings:      renderListings,
      founding:      renderFounding,
      pro:           renderPro,
      announcements: renderAnnouncements,
      analytics:     renderAnalytics,
      settings:      renderSettings,
    };
    renders[section]?.();
  }


  /* ==========================================================
     7. OVERVIEW SECTION
  ========================================================== */

  function renderOverview() {
    // Greeting
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const el = document.getElementById('overviewGreeting');
    if (el) el.textContent = `${greeting}, Precious 👋`;

    // Status bar time
    const timeEl = document.getElementById('statusTime');
    if (timeEl) {
      timeEl.textContent = new Date().toLocaleString('en-NG', {
        weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      });
    }

    // KPI grid
    renderKPIGrid();

    // Activity feed
    renderActivityFeed();

    // Update sidebar badges
    const pendingBadge = document.getElementById('pendingVerifBadge');
    const reportsBadge = document.getElementById('reportsBadge');
    if (pendingBadge) pendingBadge.textContent = 5;
    if (reportsBadge) reportsBadge.textContent = PLACEHOLDER_REPORTS.length;
  }


  /* ==========================================================
     8. KPI CARDS
  ========================================================== */

  function renderKPIGrid() {
    const grid = document.getElementById('kpiGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const accentCls = { accent: 'kpi-card--accent', gold: 'kpi-card--gold', red: 'kpi-card--red', green: 'kpi-card--green' };

    PLACEHOLDER_KPI.forEach((item, i) => {
      const card = document.createElement('div');
      card.className = `kpi-card ${accentCls[item.accent] || ''}`;
      card.style.animationDelay = `${i * 40}ms`;

      card.innerHTML = `
        <div class="kpi-card__icon"><i class="${item.icon}" aria-hidden="true"></i></div>
        <div class="kpi-card__body">
          <span class="kpi-card__value" id="${item.id}">0</span>
          <span class="kpi-card__label">${escapeHTML(item.label)}</span>
        </div>
      `;

      grid.appendChild(card);

      // Count-up animation
      requestAnimationFrame(() => countUp(document.getElementById(item.id), item.value));
    });
  }

  function countUp(el, target) {
    if (!el) return;
    let current = 0;
    const step  = Math.max(1, Math.ceil(target / 20));
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = current.toLocaleString();
      if (current >= target) clearInterval(timer);
    }, 40);
  }


  /* ==========================================================
     9. ACTIVITY FEED
  ========================================================== */

  function renderActivityFeed() {
    const feed = document.getElementById('activityFeed');
    if (!feed) return;
    feed.innerHTML = '';

    const typeClass = { user: 'user', report: 'report', biz: 'biz', listing: 'listing', pro: 'pro' };

    PLACEHOLDER_ACTIVITY.forEach((item, i) => {
      const el = document.createElement('div');
      el.className = 'activity-item';
      el.style.animationDelay = `${i * 40}ms`;

      el.innerHTML = `
        <div class="activity-item__dot activity-item__dot--${typeClass[item.type] || 'user'}">
          <i class="${item.icon}" aria-hidden="true"></i>
        </div>
        <div class="activity-item__content">
          <p class="activity-item__text">${item.text}</p>
          <p class="activity-item__time">${escapeHTML(item.time)}</p>
        </div>
      `;

      feed.appendChild(el);
    });
  }


  /* ==========================================================
     10. USERS SECTION
  ========================================================== */

  function renderUsers() {
    const tbody  = document.getElementById('usersTableBody');
    const count  = document.getElementById('userCount');
    if (!tbody) return;

    const filtered = PLACEHOLDER_USERS.filter(u =>
      state.userFilter === 'all' ||
      u.type === state.userFilter ||
      u.status === state.userFilter ||
      (state.userFilter === 'pro' && u.isPro)
    );

    if (count) count.textContent = `${filtered.length} users`;

    tbody.innerHTML = '';

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--color-text-tertiary);">No users match this filter.</td></tr>`;
      return;
    }

    filtered.forEach((user, i) => {
      const initials = getInitials(user.name);
      const tr = document.createElement('tr');
      tr.style.animationDelay = `${i * 30}ms`;

      tr.innerHTML = `
        <td>
          <div class="table-member">
            <div class="table-member__avatar">${escapeHTML(initials)}</div>
            <div class="table-member__info">
              <p class="table-member__name">${escapeHTML(user.name)}</p>
              <p class="table-member__email">${escapeHTML(user.email)}</p>
            </div>
          </div>
        </td>
        <td><code>${escapeHTML(user.jaraId)}</code></td>
        <td><span class="pill pill--${user.type}">${escapeHTML(capitalise(user.type))}</span></td>
        <td><span class="pill pill--${user.status}">${escapeHTML(capitalise(user.status))}</span></td>
        <td>${escapeHTML(user.joined)}</td>
        <td>
          <div class="table-actions">
            ${user.status !== 'verified'
              ? `<button class="table-btn table-btn--verify"
                   data-action="verify" data-id="${user.id}" data-name="${escapeHTML(user.name)}">
                   Verify
                 </button>`
              : ''
            }
            ${user.status !== 'suspended'
              ? `<button class="table-btn table-btn--suspend"
                   data-action="suspend" data-id="${user.id}" data-name="${escapeHTML(user.name)}">
                   Suspend
                 </button>`
              : `<button class="table-btn table-btn--verify"
                   data-action="unsuspend" data-id="${user.id}" data-name="${escapeHTML(user.name)}">
                   Unsuspend
                   </button>`
            }
            <button class="table-btn table-btn--delete"
              data-action="delete_user" data-id="${user.id}" data-name="${escapeHTML(user.name)}">
              Delete
            </button>
          </div>
        </td>
      `;

      tbody.appendChild(tr);
    });

    attachTableBtnListeners(tbody);
  }

  // User filter chips
  document.querySelectorAll('[data-filter]').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('[data-filter]').forEach(c => c.classList.remove('filter-chip--active'));
      chip.classList.add('filter-chip--active');
      state.userFilter = chip.dataset.filter;
      renderUsers();
    });
  });

  // User search
  const userSearch = document.getElementById('userSearch');
  if (userSearch) {
    userSearch.addEventListener('input', () => {
      const q = userSearch.value.trim().toLowerCase();
      document.querySelectorAll('#usersTableBody tr').forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
  }


  /* ==========================================================
     11. BUSINESSES SECTION
  ========================================================== */

  function renderBusinesses() {
    const pending = PLACEHOLDER_BIZ.filter(b => b.status === 'pending');
    const all     = PLACEHOLDER_BIZ;

    // Pending list
    const pendingEl = document.getElementById('pendingBizList');
    if (pendingEl) {
      if (pending.length === 0) {
        pendingEl.innerHTML = `<p style="padding:1.5rem;text-align:center;color:var(--color-text-tertiary);font-size:.875rem;">No pending verifications 🎉</p>`;
      } else {
        pendingEl.innerHTML = '';
        pending.forEach(biz => {
          const row = document.createElement('div');
          row.className = 'biz-row';
          row.innerHTML = `
            <div class="table-member__avatar">${escapeHTML(getInitials(biz.name))}</div>
            <div class="biz-row__content">
              <p class="biz-row__name">${escapeHTML(biz.name)}</p>
              <p class="biz-row__sub">${escapeHTML(biz.category)} · ${escapeHTML(biz.owner)}</p>
            </div>
            <div class="biz-row__actions">
              <button class="table-btn table-btn--verify" data-action="verify_biz" data-id="${biz.id}" data-name="${escapeHTML(biz.name)}">Verify</button>
              <button class="table-btn table-btn--reject" data-action="reject_biz" data-id="${biz.id}" data-name="${escapeHTML(biz.name)}">Reject</button>
            </div>
          `;
          pendingEl.appendChild(row);
          attachTableBtnListeners(pendingEl);
        });
      }
    }

    // All businesses table
    const tbody  = document.getElementById('bizTableBody');
    const count  = document.getElementById('bizCount');
    if (!tbody) return;
    if (count) count.textContent = `${all.length} businesses`;

    tbody.innerHTML = '';
    all.forEach((biz, i) => {
      const tr = document.createElement('tr');
      tr.style.animationDelay = `${i * 30}ms`;
      tr.innerHTML = `
        <td>
          <div class="table-member">
            <div class="table-member__avatar">${escapeHTML(getInitials(biz.name))}</div>
            <div class="table-member__info">
              <p class="table-member__name">${escapeHTML(biz.name)}</p>
            </div>
          </div>
        </td>
        <td>${escapeHTML(biz.owner)}</td>
        <td>${escapeHTML(biz.category)}</td>
        <td><span class="pill pill--${biz.status}">${escapeHTML(capitalise(biz.status))}</span></td>
        <td>${escapeHTML(biz.joined)}</td>
        <td>
          <div class="table-actions">
            ${biz.status !== 'verified'
              ? `<button class="table-btn table-btn--verify" data-action="verify_biz" data-id="${biz.id}" data-name="${escapeHTML(biz.name)}">Verify</button>`
              : '<span style="font-size:.75rem;color:var(--color-success)">✓ Verified</span>'
            }
            <button class="table-btn table-btn--suspend" data-action="suspend_biz" data-id="${biz.id}" data-name="${escapeHTML(biz.name)}">Suspend</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    attachTableBtnListeners(tbody);
  }


  /* ==========================================================
     12. LISTINGS SECTION
  ========================================================== */

  function renderListings() {
    // Reports
    const reportsEl = document.getElementById('reportedList');
    if (reportsEl) {
      reportsEl.innerHTML = '';
      if (PLACEHOLDER_REPORTS.length === 0) {
        reportsEl.innerHTML = `<p style="padding:1.5rem;text-align:center;color:var(--color-text-tertiary);font-size:.875rem;">No reported listings 🎉</p>`;
      } else {
        PLACEHOLDER_REPORTS.forEach(report => {
          const row = document.createElement('div');
          row.className = 'report-row';
          row.innerHTML = `
            <div class="report-row__icon"><i class="fa-solid fa-flag" aria-hidden="true"></i></div>
            <div class="report-row__content">
              <p class="report-row__title">${escapeHTML(report.title)}</p>
              <p class="report-row__reason">${escapeHTML(report.reason)}</p>
              <p class="report-row__meta">Reported by ${escapeHTML(report.reporter)} · ${escapeHTML(report.time)}</p>
            </div>
            <div class="report-row__actions">
              <button class="table-btn table-btn--approve" data-action="dismiss_report" data-id="${report.id}" data-name="${escapeHTML(report.title)}">Dismiss</button>
              <button class="table-btn table-btn--delete"  data-action="remove_listing" data-id="${report.id}" data-name="${escapeHTML(report.title)}">Remove</button>
            </div>
          `;
          reportsEl.appendChild(row);
        });
        attachTableBtnListeners(reportsEl);
      }
    }

    // Listings table
    const tbody = document.getElementById('listingsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const filtered = PLACEHOLDER_LISTINGS.filter(l =>
      state.listingFilter === 'all' || l.type === state.listingFilter
    );

    filtered.forEach((listing, i) => {
      const typeDotCls = { product: 'product', service: 'service', request: 'request' }[listing.type] || 'product';
      const tr = document.createElement('tr');
      tr.style.animationDelay = `${i * 30}ms`;
      tr.innerHTML = `
        <td style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHTML(listing.title)}</td>
        <td>
          <span style="display:flex;align-items:center;gap:6px">
            <span class="type-dot type-dot--${typeDotCls}"></span>
            ${escapeHTML(capitalise(listing.type))}
          </span>
        </td>
        <td>${escapeHTML(listing.seller)}</td>
        <td><span class="pill pill--active">${escapeHTML(capitalise(listing.status))}</span></td>
        <td>${listing.views}</td>
        <td>
          <div class="table-actions">
            <button class="table-btn table-btn--delete" data-action="remove_listing" data-id="${listing.id}" data-name="${escapeHTML(listing.title)}">Remove</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    attachTableBtnListeners(tbody);
  }

  // Listing filter chips
  document.querySelectorAll('[data-listing-filter]').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('[data-listing-filter]').forEach(c => c.classList.remove('filter-chip--active'));
      chip.classList.add('filter-chip--active');
      state.listingFilter = chip.dataset.listingFilter;
      const tbody = document.getElementById('listingsTableBody');
      if (tbody) renderListings();
    });
  });


  /* ==========================================================
     13. FOUNDING MEMBERS SECTION
  ========================================================== */

  function renderFounding() {
    const total     = 100;
    const awarded   = PLACEHOLDER_FOUNDING.length;
    const remaining = total - awarded;
    const pct       = (awarded / total) * 100;

    // Progress bar
    const fill = document.getElementById('foundingBarFill');
    if (fill) setTimeout(() => { fill.style.width = `${pct}%`; }, 100);

    const awardedEl   = document.getElementById('foundingAwarded');
    const remainingEl = document.getElementById('foundingRemaining');
    if (awardedEl)   awardedEl.textContent   = `${awarded} awarded`;
    if (remainingEl) remainingEl.textContent = `${remaining} remaining`;

    // Table
    const tbody = document.getElementById('foundingTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    PLACEHOLDER_FOUNDING.forEach((member, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="color:var(--color-gold);font-weight:700;font-family:var(--font-display)">#${i + 1}</td>
        <td>
          <div class="table-member">
            <div class="table-member__avatar">${escapeHTML(getInitials(member.name))}</div>
            <div class="table-member__info">
              <p class="table-member__name">${escapeHTML(member.name)}</p>
            </div>
          </div>
        </td>
        <td><code>${escapeHTML(member.jaraId)}</code></td>
        <td>${escapeHTML(member.awarded)}</td>
        <td>
          <button class="table-btn table-btn--remove" data-action="remove_founding" data-id="${member.id}" data-name="${escapeHTML(member.name)}">Remove</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    attachTableBtnListeners(tbody);
  }


  /* ==========================================================
     14. JARA PRO SECTION
  ========================================================== */

  function renderPro() {
    const active  = PLACEHOLDER_PRO.filter(p => p.status === 'active').length;
    const expired = PLACEHOLDER_PRO.filter(p => p.status === 'expired').length;

    const totalEl   = document.getElementById('proTotal');
    const activeEl  = document.getElementById('proActive');
    const expiredEl = document.getElementById('proExpired');

    if (totalEl)   countUp(totalEl,   PLACEHOLDER_PRO.length);
    if (activeEl)  countUp(activeEl,  active);
    if (expiredEl) countUp(expiredEl, expired);

    const tbody = document.getElementById('proTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    PLACEHOLDER_PRO.forEach(member => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div class="table-member">
            <div class="table-member__avatar">${escapeHTML(getInitials(member.name))}</div>
            <div class="table-member__info">
              <p class="table-member__name">${escapeHTML(member.name)}</p>
            </div>
          </div>
        </td>
        <td>${escapeHTML(member.plan)}</td>
        <td>${escapeHTML(member.expires)}</td>
        <td><span class="pill pill--${member.status}">${escapeHTML(capitalise(member.status))}</span></td>
        <td>
          <div class="table-actions">
            <button class="table-btn table-btn--remove" data-action="remove_pro" data-id="${member.id}" data-name="${escapeHTML(member.name)}">Remove PRO</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    attachTableBtnListeners(tbody);
  }


  /* ==========================================================
     15. ANNOUNCEMENTS SECTION
  ========================================================== */

  function renderAnnouncements() {
    // Char counter
    const body     = document.getElementById('annBody');
    const countEl  = document.getElementById('annCharCount');
    const sendBtn  = document.getElementById('annSendBtn');

    if (body && countEl) {
      body.addEventListener('input', () => {
        const len = body.value.length;
        countEl.textContent = len;
        if (sendBtn) sendBtn.disabled = len === 0;
      });
    }

    // Send button (placeholder — shows toast)
    if (sendBtn) {
      sendBtn.addEventListener('click', () => {
        showToast('Announcement sending will be connected when the notification engine is ready.');
      });
    }

    // Sent announcements
    const sentEl = document.getElementById('sentAnnouncements');
    if (sentEl) {
      sentEl.innerHTML = '';
      if (PLACEHOLDER_SENT_ANN.length === 0) {
        sentEl.innerHTML = `<p style="padding:1.5rem;text-align:center;color:var(--color-text-tertiary);font-size:.875rem;">No announcements sent yet.</p>`;
      } else {
        PLACEHOLDER_SENT_ANN.forEach(ann => {
          const row = document.createElement('div');
          row.className = 'sent-ann-row';
          row.innerHTML = `
            <div class="kpi-card__icon" style="flex-shrink:0">
              <i class="fa-solid fa-bullhorn" style="color:var(--color-accent-light)"></i>
            </div>
            <div class="sent-ann-row__content">
              <p class="sent-ann-row__title">${escapeHTML(ann.title)}</p>
              <p class="sent-ann-row__meta">Sent to ${escapeHTML(ann.to)} · ${escapeHTML(ann.time)}</p>
            </div>
          `;
          sentEl.appendChild(row);
        });
      }
    }
  }


  /* ==========================================================
     16. ANALYTICS SECTION
  ========================================================== */

  function renderAnalytics() {
    // Top metrics
    const anaEl = {
      newUsers:     document.getElementById('anaNewUsers'),
      newListings:  document.getElementById('anaNewListings'),
      searches:     document.getElementById('anaSearches'),
    };

    if (anaEl.newUsers)    countUp(anaEl.newUsers,    63);
    if (anaEl.newListings) countUp(anaEl.newListings, 184);
    if (anaEl.searches)    countUp(anaEl.searches,    1420);

    // Growth chart
    const barsEl   = document.getElementById('chartBars');
    const labelsEl = document.getElementById('chartLabels');

    if (barsEl && labelsEl) {
      barsEl.innerHTML   = '';
      labelsEl.innerHTML = '';
      const maxVal = Math.max(...ANALYTICS_CHART_DATA);

      ANALYTICS_CHART_DATA.forEach((val, i) => {
        const bar = document.createElement('div');
        bar.className = 'chart-bar';
        bar.style.height = `${(val / maxVal) * 100}%`;
        bar.style.animationDelay = `${i * 30}ms`;
        bar.title = `${val} users`;
        barsEl.appendChild(bar);
      });

      ANALYTICS_CHART_LABELS.forEach(label => {
        const el = document.createElement('div');
        el.className     = 'chart-label';
        el.textContent   = label;
        labelsEl.appendChild(el);
      });
    }

    // Category breakdown
    const catEl = document.getElementById('categoryBreakdown');
    if (catEl) {
      catEl.innerHTML = '';
      const max = ANALYTICS_CATEGORIES[0].searches;

      ANALYTICS_CATEGORIES.forEach((cat, i) => {
        const row = document.createElement('div');
        row.className = 'cat-bar-row';
        row.innerHTML = `
          <span class="cat-bar-row__label">${escapeHTML(cat.name)}</span>
          <div class="cat-bar-row__track">
            <div class="cat-bar-row__fill" style="width:0%" data-target="${(cat.searches/max)*100}"></div>
          </div>
          <span class="cat-bar-row__count">${cat.searches}</span>
        `;
        catEl.appendChild(row);
      });

      // Animate bars after render
      requestAnimationFrame(() => {
        setTimeout(() => {
          document.querySelectorAll('.cat-bar-row__fill').forEach(fill => {
            fill.style.width = fill.dataset.target + '%';
          });
        }, 150);
      });
    }
  }


  /* ==========================================================
     17. SETTINGS SECTION
  ========================================================== */

  function renderSettings() {
    // Toggle listeners (placeholders — show toast on change)
    ['launchMode', 'maintenanceMode', 'newRegistrations', 'emailVerification',
     'reportAlerts', 'verificationAlerts', 'proAlerts'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', () => {
        const label = el.closest('.settings-row')?.querySelector('.settings-row__label')?.textContent || id;
        showToast(`${label}: ${el.checked ? 'Enabled' : 'Disabled'}. Settings sync will be connected to Supabase.`);
        /*
         FUTURE: UPDATE platform_settings SET [key] = [value]
                 WHERE id = 1  (single settings row)
        */
      });
    });
  }


  /* ==========================================================
     18. CONFIRMATION MODAL
  ========================================================== */

  const confirmModal  = document.getElementById('confirmModal');
  const modalBackdrop = document.getElementById('modalBackdrop');
  const modalClose    = document.getElementById('modalClose');
  const modalCancel   = document.getElementById('modalCancel');
  const modalConfirm  = document.getElementById('modalConfirm');
  const modalTitle    = document.getElementById('modalTitle');
  const modalBody     = document.getElementById('modalBody');

  function openModal(title, body, action) {
    state.modalAction    = action;
    modalTitle.textContent = title;
    modalBody.textContent  = body;
    confirmModal.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    confirmModal.setAttribute('hidden', '');
    state.modalAction = null;
    document.body.style.overflow = '';
  }

  modalClose.addEventListener('click', closeModal);
  modalCancel.addEventListener('click', closeModal);
  modalBackdrop.addEventListener('click', closeModal);

  modalConfirm.addEventListener('click', async () => {
    const action = state.modalAction;
    if (!action) { closeModal(); return; }

    closeModal();

    const actionMessages = {
      verify:           `${action.name} has been verified.`,
      unsuspend:        `${action.name} has been unsuspended.`,
      suspend:          `${action.name} has been suspended.`,
      delete_user:      `${action.name} has been deleted.`,
      verify_biz:       `${action.name} has been verified.`,
      reject_biz:       `${action.name} verification has been rejected.`,
      suspend_biz:      `${action.name} has been suspended.`,
      remove_listing:   `Listing "${action.name}" has been removed.`,
      dismiss_report:   `Report for "${action.name}" has been dismissed.`,
      remove_founding:  `Founding Member badge removed from ${action.name}.`,
      remove_pro:       `PRO status removed from ${action.name}.`,
    };

    showToast(actionMessages[action.action] || 'Action completed.');

    /*
     FUTURE: Based on action.action, run the corresponding Supabase query:

     'verify':
       await window._supabase.from('profiles')
         .update({ is_verified: true }).eq('id', action.id);

     'suspend':
       await window._supabase.auth.admin.updateUserById(action.id, { ban_duration: 'none' });
       // (Requires Service Role key — NEVER use in client-side JS)

     'delete_user':
       await window._supabase.auth.admin.deleteUser(action.id);
       // (Requires Service Role key — handle via a Supabase Edge Function)

     'remove_founding':
       await window._supabase.from('profiles')
         .update({ is_founding_member: false }).eq('id', action.id);

     'remove_pro':
       await window._supabase.from('profiles')
         .update({ is_premium: false, premium_expires_at: null }).eq('id', action.id);
       await window._supabase.from('premium_subscriptions')
         .update({ status: 'cancelled' }).eq('user_id', action.id).eq('status', 'active');
    */
  });

  // Attach listeners to all action buttons in a container
  function attachTableBtnListeners(container) {
    container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const 
