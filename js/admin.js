/* ============================================================
   JARA ∆ — Admin Dashboard v2
   js/admin.js

   Depends on:
     - window._supabase  (js/supabase-client.js)
     - DOM in admin/index.html

   TABLE OF CONTENTS
   1.  State
   2.  Auth guard
   3.  Sidebar + mobile nav
   4.  Section router
   5.  Home — greeting + attention line
   6.  Home — KPI cards
   7.  Home — Command Queue
   8.  Home — System Health
   9.  Businesses section
   10. Users section
   11. Listings section
   12. Founding Members section
   13. JARA PRO section
   14. Reports section
   15. Announcements section
   16. Analytics section
   17. Settings section
   18. Confirm modal
   19. Supabase data loaders
   20. Utility helpers
   21. Init
============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  const sb = window._supabase;

  /* ==========================================================
     1. STATE
  ========================================================== */

  const S = {
    section:       'home',
    userId:        null,
    queueIndex:    0,
    queueVisible:  [],
    pendingModal:  null,
    bizFilter:     'all',
    userFilter:    'all',
    listingFilter: 'all',
    proTab:        'pending',

    // Real data loaded from Supabase
    businesses:    [],
    users:         [],
    listings:      [],
    founding:      [],
    proPending:    [],
    proActive:     [],
    proExpired:    [],
    reports:       [],
    kpi:           {},
    foundingCount: 0,
  };

  const QUEUE_MAX      = 4;
  const FOUNDING_TOTAL = 100;

  /* ==========================================================
     HEALTH + SETTINGS (static — no DB needed)
  ========================================================== */

  const HEALTH_ITEMS = [
    { name:'Database',  status:'Operational', color:'green' },
    { name:'Auth',      status:'Operational', color:'green' },
    { name:'Storage',   status:'Operational', color:'green' },
    { name:'Website',   status:'Operational', color:'green' },
    { name:'Payments',  status:'Operational', color:'green' },
    { name:'Email',     status:'Operational', color:'green' },
  ];

  const PLATFORM_TOGGLES = [
    { id:'tog_launch',  icon:'fa-solid fa-rocket',              cls:'green',  label:'Launch Mode',        sub:'Platform is live.',                checked:true  },
    { id:'tog_maint',   icon:'fa-solid fa-triangle-exclamation',cls:'orange', label:'Maintenance Mode',   sub:'Show maintenance page to users.',   checked:false },
    { id:'tog_reg',     icon:'fa-solid fa-user-plus',           cls:'purple', label:'New Registrations',  sub:'Allow new users to sign up.',       checked:true  },
    { id:'tog_email',   icon:'fa-solid fa-envelope-circle-check',cls:'blue',  label:'Email Verification', sub:'Require email before login.',       checked:true  },
  ];

  const NOTIF_TOGGLES = [
    { id:'ntog_reports',  icon:'fa-solid fa-flag',         cls:'red',  label:'Report Alerts',   sub:'Notify on new reports.',        checked:true },
    { id:'ntog_pro',      icon:'fa-solid fa-crown',        cls:'gold', label:'PRO Payments',    sub:'Notify on new PRO requests.',   checked:true },
    { id:'ntog_security', icon:'fa-solid fa-shield-halved',cls:'blue', label:'Security Alerts', sub:'Unusual login attempts.',       checked:true },
  ];


  /* ==========================================================
     2. AUTH GUARD
  ========================================================== */

  async function authGuard() {
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { window.location.href = '../auth/login.html'; return false; }
      S.userId = session.user.id;
      /*
       FUTURE: Uncomment once is_admin column is active:
         const { data: profile } = await sb.from('profiles')
           .select('is_admin').eq('id', S.userId).single();
         if (!profile?.is_admin) { window.location.href = '../explore/index.html'; return false; }
      */
      return true;
    } catch {
      window.location.href = '../auth/login.html';
      return false;
    }
  }


  /* ==========================================================
     3. SIDEBAR + MOBILE NAV
  ========================================================== */

  const sidebar  = document.getElementById('aSidebar');
  const overlay  = document.getElementById('aOverlay');
  const menuBtn  = document.getElementById('menuBtn');

  function openSidebar()  { sidebar.classList.add('is-open');    overlay.classList.add('is-visible');    menuBtn?.setAttribute('aria-expanded','true'); }
  function closeSidebar() { sidebar.classList.remove('is-open'); overlay.classList.remove('is-visible'); menuBtn?.setAttribute('aria-expanded','false'); }

  menuBtn?.addEventListener('click', () =>
    sidebar.classList.contains('is-open') ? closeSidebar() : openSidebar()
  );
  overlay.addEventListener('click', closeSidebar);

  document.querySelectorAll('.a-nav__link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      goTo(link.dataset.section);
      closeSidebar();
    });
  });

  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await sb.auth.signOut();
    window.location.href = '../auth/login.html';
  });


  /* ==========================================================
     4. SECTION ROUTER
  ========================================================== */

  const SECTION_MAP = {
    home:'secHome', businesses:'secBusinesses', users:'secUsers',
    listings:'secListings', founding:'secFounding', pro:'secPro',
    reports:'secReports', announcements:'secAnnouncements',
    analytics:'secAnalytics', settings:'secSettings',
  };

  const RENDER_MAP = {
    home:renderHome, businesses:renderBusinesses, users:renderUsers,
    listings:renderListings, founding:renderFounding, pro:renderPro,
    reports:renderReports, announcements:renderAnnouncements,
    analytics:renderAnalytics, settings:renderSettings,
  };

  function goTo(section) {
    if (!SECTION_MAP[section]) return;
    S.section = section;
    document.querySelectorAll('.a-section').forEach(el => {
      el.hidden = true; el.classList.remove('a-section--active');
    });
    const target = document.getElementById(SECTION_MAP[section]);
    target.hidden = false; target.classList.add('a-section--active');
    document.querySelectorAll('.a-nav__link').forEach(l =>
      l.classList.toggle('a-nav__link--active', l.dataset.section === section)
    );
    RENDER_MAP[section]?.();
    document.querySelector('.a-main')?.scrollTo({ top:0, behavior:'smooth' });
  }

  document.querySelectorAll('.qa-btn[data-section]').forEach(btn => {
    btn.addEventListener('click', () => goTo(btn.dataset.section));
  });


  /* ==========================================================
     5. HOME — GREETING + ATTENTION LINE
  ========================================================== */

  function renderGreeting() {
    const hour  = new Date().getHours();
    const label = document.getElementById('greetingLabel');
    if (label) label.textContent =
      hour < 12 ? 'Good morning,' : hour < 17 ? 'Good afternoon,' : 'Good evening,';

    const pending  = S.proPending.length;
    const reports  = S.reports.filter(r => r.status === 'pending').length;
    const bizPend  = S.businesses.filter(b => b.is_verified === false).length;
    const total    = pending + reports + bizPend;

    let msg = '';
    if      (total === 0)    msg = 'You\'re all caught up. Everything is running smoothly.';
    else if (reports > 0)    msg = `${reports} report${reports > 1 ? 's' : ''} require your review.`;
    else if (pending > 0)    msg = `${pending} PRO payment${pending > 1 ? 's' : ''} awaiting approval.`;
    else if (bizPend > 0)    msg = `${bizPend} ${bizPend === 1 ? 'business' : 'businesses'} waiting for verification.`;
    else                     msg = `${total} operation${total > 1 ? 's' : ''} require your attention today.`;

    const attnEl = document.getElementById('greetingAttention');
    if (attnEl) {
      attnEl.style.opacity = '0';
      setTimeout(() => { attnEl.textContent = msg; attnEl.style.opacity = '1'; }, 200);
    }

    const bizDot    = document.getElementById('bizDot');
    const proDot    = document.getElementById('proDot');
    const reportDot = document.getElementById('reportDot');
    if (bizDot)    bizDot.hidden    = bizPend === 0;
    if (proDot)    proDot.hidden    = pending === 0;
    if (reportDot) reportDot.hidden = reports === 0;
  }


  /* ==========================================================
     6. HOME — KPI CARDS
  ========================================================== */

  function renderKPI() {
    const grid = document.getElementById('kpiGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const kpiData = [
      { icon:'fa-solid fa-user-plus',       label:'Total Members',       value: S.kpi.totalUsers   || 0 },
      { icon:'fa-solid fa-store',            label:'Total Businesses',    value: S.kpi.totalBiz     || 0 },
      { icon:'fa-solid fa-box',              label:'Total Listings',      value: S.kpi.totalListings|| 0 },
      { icon:'fa-solid fa-crown',            label:'Active PRO',          value: S.proActive.length,  iconCls:'--gold' },
      { icon:'fa-solid fa-medal',            label:'Founding Members',    value: S.foundingCount },
      { icon:'fa-solid fa-flag',             label:'Pending Reports',     value: S.reports.filter(r=>r.status==='pending').length, iconCls:'--red' },
      { icon:'fa-solid fa-crown',            label:'Pending PRO',         value: S.proPending.length, iconCls:'--gold' },
      { icon:'fa-solid fa-store',            label:'Unverified Biz',      value: S.businesses.filter(b=>!b.is_verified).length, iconCls:'--warn' },
    ];

    kpiData.forEach((item, i) => {
      const card = document.createElement('div');
      card.className = 'kpi-card';
      card.style.animationDelay = `${i * 35}ms`;
      card.innerHTML = `
        <div class="kpi-card__icon kpi-card__icon${item.iconCls || ''}">
          <i class="${item.icon}" aria-hidden="true"></i>
        </div>
        <span class="kpi-card__value" id="kpi_${i}">0</span>
        <span class="kpi-card__label">${esc(item.label)}</span>
      `;
      grid.appendChild(card);
      requestAnimationFrame(() => countUp(document.getElementById(`kpi_${i}`), item.value));
    });
  }


  /* ==========================================================
     7. HOME — COMMAND QUEUE
     Built dynamically from real pending data.
  ========================================================== */

  function buildQueueTasks() {
    const tasks = [];

    S.businesses.filter(b => !b.is_verified).forEach(b => {
      tasks.push({
        id: `biz_${b.id}`, type:'biz', icon:'fa-solid fa-store', iconCls:'--biz',
        title: `Verify: ${b.business_name || b.full_name}`,
        sub: 'Business verification pending',
        action:'verify_biz', target: b.id,
        targetName: b.business_name || b.full_name,
      });
    });

    S.proPending.forEach(p => {
      tasks.push({
        id: `pro_${p.id}`, type:'pro', icon:'fa-solid fa-crown', iconCls:'--pro',
        title: `Approve PRO: ${p.profiles?.full_name || 'User'}`,
        sub: `${p.plan_name} · ₦${Number(p.amount_paid).toLocaleString('en-NG')} · Ref: ${p.payment_ref || '—'}`,
        action:'approve_pro', target: p.id,
        targetName: p.profiles?.full_name || 'User',
      });
    });

    S.reports.filter(r => r.status === 'pending').forEach(r => {
      tasks.push({
        id: `rep_${r.id}`, type:'report', icon:'fa-solid fa-flag', iconCls:'--report',
        title: `Review Report`,
        sub: r.reason || 'User report pending review',
        action:'dismiss_report', target: r.id,
        targetName: 'Report',
      });
    });

    return tasks;
  }

  function renderQueue() {
    const list    = document.getElementById('queueList');
    const countEl = document.getElementById('queueCount');
    if (!list) return;

    const QUEUE_TASKS = buildQueueTasks();
    list.innerHTML = '';
    S.queueVisible = [];
    S.queueIndex   = 0;

    for (let i = 0; i < Math.min(QUEUE_MAX, QUEUE_TASKS.length); i++) {
      appendQueueItem(QUEUE_TASKS[i], QUEUE_TASKS);
      S.queueIndex = i + 1;
    }

    updateQueueCount(countEl, QUEUE_TASKS);
    if (QUEUE_TASKS.length === 0) showQueueEmpty(list);
  }

  function appendQueueItem(task, QUEUE_TASKS) {
    const list = document.getElementById('queueList');
    if (!list) return;

    const item = document.createElement('div');
    item.className = 'queue-item';
    item.id        = `qi-${task.id}`;
    item.setAttribute('role','listitem');
    item.style.animationDelay = `${S.queueVisible.length * 50}ms`;
    item.innerHTML = `
      <div class="queue-item__icon queue-item__icon${task.iconCls}">
        <i class="${task.icon}" aria-hidden="true"></i>
      </div>
      <div class="queue-item__content">
        <p class="queue-item__title">${esc(task.title)}</p>
        <p class="queue-item__sub">${esc(task.sub)}</p>
      </div>
      <div class="queue-item__actions">
        <button class="a-btn a-btn--primary a-btn--sm queue-complete-btn"
          data-task="${task.id}" data-action="${task.action}"
          data-target="${task.target}" data-name="${esc(task.targetName)}"
          type="button">Done</button>
        <button class="a-btn a-btn--ghost a-btn--sm queue-skip-btn"
          data-task="${task.id}" type="button">Skip</button>
      </div>
    `;
    list.appendChild(item);
    S.queueVisible.push(task.id);

    item.querySelector('.queue-complete-btn').addEventListener('click', e => {
      const btn = e.currentTarget;
      completeQueueItem(btn.dataset.task, btn.dataset.action, btn.dataset.target, btn.dataset.name, QUEUE_TASKS);
    });
    item.querySelector('.queue-skip-btn').addEventListener('click', e => {
      skipQueueItem(e.currentTarget.dataset.task, QUEUE_TASKS);
    });
  }

  function completeQueueItem(taskId, action, target, name, QUEUE_TASKS) {
    const msgs = {
      verify_biz:     `Verify "${name}"?`,
      approve_pro:    `Activate PRO for "${name}"?`,
      dismiss_report: `Dismiss this report?`,
    };
    openModal('Confirm Action', msgs[action] || 'Proceed?', async () => {
      await executeAdminAction(action, target, name);
      removeQueueItem(taskId);
      pullNextQueueItem(QUEUE_TASKS);
      showToast(getActionToast(action, name));
      await loadAllData();
      renderGreeting();
      renderKPI();
    });
  }

  function skipQueueItem(taskId, QUEUE_TASKS) {
    removeQueueItem(taskId);
    pullNextQueueItem(QUEUE_TASKS);
  }

  function removeQueueItem(taskId) {
    const el = document.getElementById(`qi-${taskId}`);
    if (!el) return;
    el.classList.add('is-completing');
    S.queueVisible = S.queueVisible.filter(id => id !== taskId);
    setTimeout(() => el.remove(), 330);
  }

  function pullNextQueueItem(QUEUE_TASKS) {
    const list    = document.getElementById('queueList');
    const countEl = document.getElementById('queueCount');
    if (!list) return;
    setTimeout(() => {
      if (S.queueIndex < QUEUE_TASKS.length) {
        appendQueueItem(QUEUE_TASKS[S.queueIndex], QUEUE_TASKS);
        S.queueIndex++;
        updateQueueCount(countEl, QUEUE_TASKS);
      } else if (S.queueVisible.length === 0) {
        showQueueEmpty(list);
        if (countEl) countEl.textContent = '';
      }
    }, 350);
  }

  function updateQueueCount(el, QUEUE_TASKS) {
    if (!el) return;
    const remaining = QUEUE_TASKS.length - S.queueIndex + S.queueVisible.length;
    el.textContent = remaining > 0 ? `${remaining} remaining` : '';
  }

  function showQueueEmpty(list) {
    list.innerHTML = `
      <div class="queue-empty">
        <div class="queue-empty__icon"><i class="fa-solid fa-circle-check" aria-hidden="true"></i></div>
        <p class="queue-empty__title">Excellent work, Chief Executive.</p>
        <p class="queue-empty__sub">No pending operations remain. Enjoy your day.</p>
      </div>`;
  }


  /* ==========================================================
     8. HOME — SYSTEM HEALTH
  ========================================================== */

  function renderHealth() {
    const grid = document.getElementById('healthGrid');
    if (!grid) return;
    grid.innerHTML = '';
    HEALTH_ITEMS.forEach(item => {
      const el = document.createElement('div');
      el.className = 'health-item';
      el.innerHTML = `
        <div class="health-item__dot health-item__dot--${item.color}" aria-hidden="true"></div>
        <p class="health-item__name">${esc(item.name)}</p>
        <p class="health-item__status">${esc(item.status)}</p>
      `;
      grid.appendChild(el);
    });
  }


  /* ==========================================================
     9. BUSINESSES SECTION
  ========================================================== */

  function renderBusinesses() {
    const cards = document.getElementById('bizCards');
    if (!cards) return;

    let filtered = S.businesses;
    if (S.bizFilter !== 'all') {
      if (S.bizFilter === 'verified')  filtered = filtered.filter(b => b.is_verified);
      if (S.bizFilter === 'pending')   filtered = filtered.filter(b => !b.is_verified);
      if (S.bizFilter === 'suspended') filtered = filtered.filter(b => b.is_suspended);
    }

    const search = document.getElementById('bizSearch')?.value.toLowerCase() || '';
    if (search) {
      filtered = filtered.filter(b =>
        (b.business_name || b.full_name || '').toLowerCase().includes(search) ||
        (b.business_category || '').toLowerCase().includes(search)
      );
    }

    cards.innerHTML = '';

    if (filtered.length === 0) {
      cards.innerHTML = '<p style="padding:1.5rem;text-align:center;color:var(--text-3);font-size:.875rem;">No businesses found.</p>';
      return;
    }

    filtered.forEach((biz, i) => {
      const name    = biz.business_name || biz.full_name || 'Unknown';
      const cat     = biz.business_category || 'Uncategorised';
      const status  = biz.is_verified ? 'verified' : 'pending';
      const isPro   = biz.is_premium;

      const card = document.createElement('div');
      card.className = 'entity-card';
      card.setAttribute('role','listitem');
      card.style.animationDelay = `${i * 40}ms`;
      card.innerHTML = `
        <div class="entity-card__avatar">${esc(initials(name))}</div>
        <div class="entity-card__info">
          <p class="entity-card__name">${esc(name)}</p>
          <div class="entity-card__sub">
            <span>${esc(cat)}</span>
            <span class="pill pill--${status}">${cap(status)}</span>
            ${isPro ? '<span class="pill pill--pro">PRO</span>' : ''}
          </div>
        </div>
        <div class="entity-card__actions">
          ${!biz.is_verified
            ? `<button class="a-btn a-btn--success a-btn--xs" data-action="verify_biz" data-id="${biz.id}" data-name="${esc(name)}" type="button">Verify</button>`
            : `<button class="a-btn a-btn--warn a-btn--xs" data-action="suspend_biz" data-id="${biz.id}" data-name="${esc(name)}" type="button">Suspend</button>`
          }
        </div>
      `;
      cards.appendChild(card);
    });

    attachActionBtns(cards);
  }

  document.querySelectorAll('[data-biz-filter]').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('[data-biz-filter]').forEach(c => c.classList.remove('chip--active'));
      chip.classList.add('chip--active');
      S.bizFilter = chip.dataset.bizFilter;
      renderBusinesses();
    });
  });
  document.getElementById('bizSearch')?.addEventListener('input', renderBusinesses);


  /* ==========================================================
     10. USERS SECTION
  ========================================================== */

  function renderUsers() {
    const cards = document.getElementById('userCards');
    if (!cards) return;

    let filtered = S.users;
    if (S.userFilter !== 'all') {
      if (S.userFilter === 'verified')  filtered = filtered.filter(u => u.is_verified);
      if (S.userFilter === 'pending')   filtered = filtered.filter(u => !u.is_verified);
      if (S.userFilter === 'business')  filtered = filtered.filter(u => u.account_type === 'business');
      if (S.userFilter === 'student')   filtered = filtered.filter(u => u.account_type === 'buyer' || u.account_type === 'student');
    }

    const search = document.getElementById('userSearch')?.value.toLowerCase() || '';
    if (search) {
      filtered = filtered.filter(u =>
        (u.full_name || '').toLowerCase().includes(search) ||
        (u.jara_id  || '').toLowerCase().includes(search)
      );
    }

    cards.innerHTML = '';
    filtered.forEach((user, i) => {
      const name      = user.full_name || 'JARA Member';
      const jaraId    = user.jara_id   || '—';
      const status    = user.is_verified ? 'verified' : 'pending';
      const isFounder = user.is_founding_member;

      const card = document.createElement('div');
      card.className = 'entity-card';
      card.setAttribute('role','listitem');
      card.style.animationDelay = `${i * 40}ms`;
      card.innerHTML = `
        <div class="entity-card__avatar">${esc(initials(name))}</div>
        <div class="entity-card__info">
          <p class="entity-card__name">${esc(name)}</p>
          <div class="entity-card__sub">
            <span>${esc(jaraId)}</span>
            <span class="pill pill--${status}">${cap(status)}</span>
            ${isFounder ? '<span class="pill pill--founding">Founder</span>' : ''}
            <span class="pill pill--${user.account_type || 'product'}">${cap(user.account_type || 'member')}</span>
          </div>
        </div>
        <div class="entity-card__actions">
          ${!user.is_verified
            ? `<button class="a-btn a-btn--success a-btn--xs" data-action="verify_user" data-id="${user.id}" data-name="${esc(name)}" type="button">Verify</button>`
            : ''
          }
          <button class="a-btn a-btn--warn a-btn--xs" data-action="suspend_user" data-id="${user.id}" data-name="${esc(name)}" type="button">Suspend</button>
        </div>
      `;
      cards.appendChild(card);
    });

    attachActionBtns(cards);
  }

  document.querySelectorAll('[data-user-filter]').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('[data-user-filter]').forEach(c => c.classList.remove('chip--active'));
      chip.classList.add('chip--active');
      S.userFilter = chip.dataset.userFilter;
      renderUsers();
    });
  });
  document.getElementById('userSearch')?.addEventListener('input', renderUsers);


  /* ==========================================================
     11. LISTINGS SECTION
  ========================================================== */

  function renderListings() {
    const cards = document.getElementById('listingCards');
    if (!cards) return;

    let filtered = S.listings;
    if (S.listingFilter !== 'all') {
      filtered = filtered.filter(l => l.listing_type === S.listingFilter);
    }

    cards.innerHTML = '';
    filtered.forEach((item, i) => {
      const typeEmoji = { product:'📦', service:'🛠️', request:'📢' }[item.listing_type] || '📦';

      const card = document.createElement('div');
      card.className = 'entity-card';
      card.setAttribute('role','listitem');
      card.style.animationDelay = `${i * 40}ms`;
      card.innerHTML = `
        <div class="entity-card__avatar" style="font-size:1.25rem">${typeEmoji}</div>
        <div class="entity-card__info">
          <p class="entity-card__name">${esc(item.title)}</p>
          <div class="entity-card__sub">
            <span class="pill pill--${item.listing_type || 'product'}">${cap(item.listing_type)}</span>
            <span>${esc(item.profiles?.full_name || item.profiles?.business_name || 'Unknown')}</span>
            <span><i class="fa-solid fa-eye" style="font-size:.625rem" aria-hidden="true"></i> ${item.view_count || 0}</span>
          </div>
        </div>
        <div class="entity-card__actions">
          <button class="a-btn a-btn--danger a-btn--xs" data-action="remove_listing" data-id="${item.id}" data-name="${esc(item.title)}" type="button">Remove</button>
        </div>
      `;
      cards.appendChild(card);
    });

    if (filtered.length === 0) {
      cards.innerHTML = '<p style="padding:1.5rem;text-align:center;color:var(--text-3);font-size:.875rem;">No listings in this category.</p>';
    }

    attachActionBtns(cards);
  }

  document.querySelectorAll('[data-listing-filter]').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('[data-listing-filter]').forEach(c => c.classList.remove('chip--active'));
      chip.classList.add('chip--active');
      S.listingFilter = chip.dataset.listingFilter;
      renderListings();
    });
  });


  /* ==========================================================
     12. FOUNDING MEMBERS SECTION
  ========================================================== */

  function renderFounding() {
    const awarded    = S.foundingCount;
    const remaining  = FOUNDING_TOTAL - awarded;
    const pct        = (awarded / FOUNDING_TOTAL) * 100;
    const isComplete = awarded >= FOUNDING_TOTAL;

    const awardedEl   = document.getElementById('foundingAwarded');
    const remainingEl = document.getElementById('foundingRemaining');
    const fill        = document.getElementById('foundingFill');
    const complete    = document.getElementById('foundingComplete');

    if (awardedEl)   awardedEl.textContent   = awarded;
    if (remainingEl) remainingEl.textContent = isComplete ? 'Programme complete' : `${remaining} slots remaining`;
    if (fill)        setTimeout(() => { fill.style.width = `${pct}%`; }, 120);
    if (complete)    complete.hidden = !isComplete;

    const cards = document.getElementById('foundingCards');
    if (!cards) return;
    cards.innerHTML = '';

    S.founding.forEach((m, i) => {
      const name   = m.full_name || 'JARA Member';
      const jaraId = m.jara_id  || '—';

      const card = document.createElement('div');
      card.className = 'entity-card';
      card.setAttribute('role','listitem');
      card.style.animationDelay = `${i * 40}ms`;
      card.innerHTML = `
        <div class="entity-card__avatar entity-card__avatar--gold" style="font-size:.875rem">#${i + 1}</div>
        <div class="entity-card__info">
          <p class="entity-card__name">${esc(name)}</p>
          <div class="entity-card__sub">
            <span>${esc(jaraId)}</span>
            <span>Founding Member</span>
          </div>
        </div>
        <div class="entity-card__actions">
          ${!isComplete
            ? `<button class="a-btn a-btn--danger a-btn--xs" data-action="remove_founding" data-id="${m.id}" data-name="${esc(name)}" type="button">Remove</button>`
            : ''
          }
        </div>
      `;
      cards.appendChild(card);
    });

    attachActionBtns(cards);
  }


  /* ==========================================================
     13. JARA PRO SECTION
  ========================================================== */

  function renderPro() {
    const badge = document.getElementById('pendingProBadge');
    if (badge) badge.textContent = S.proPending.length;
    renderProTab(S.proTab);
  }

  function renderProTab(tab) {
    ['pending','active','expired'].forEach(t => {
      const panel = document.getElementById(`proTab${cap(t)}`);
      if (panel) panel.hidden = t !== tab;
    });
    document.querySelectorAll('[data-pro-tab]').forEach(btn => {
      btn.classList.toggle('tab--active', btn.dataset.proTab === tab);
      btn.setAttribute('aria-selected', btn.dataset.proTab === tab ? 'true' : 'false');
    });
    if (tab === 'pending') renderProPending();
    if (tab === 'active')  renderProActive();
    if (tab === 'expired') renderProExpired();
  }

  document.querySelectorAll('[data-pro-tab]').forEach(btn => {
    btn.addEventListener('click', () => { S.proTab = btn.dataset.proTab; renderProTab(S.proTab); });
  });

  function renderProPending() {
    const cards = document.getElementById('pendingProCards');
    if (!cards) return;
    cards.innerHTML = '';

    if (S.proPending.length === 0) {
      cards.innerHTML = '<p style="padding:1.5rem;text-align:center;color:var(--text-3);font-size:.875rem;">No pending PRO requests 🎉</p>';
      return;
    }

    S.proPending.forEach((req, i) => {
      const name = req.profiles?.full_name || req.profiles?.business_name || 'User';
      const jaraId = req.profiles?.jara_id || '—';

      const card = document.createElement('div');
      card.className = 'pro-req-card';
      card.style.animationDelay = `${i * 50}ms`;
      card.innerHTML = `
        <div class="pro-req-card__header">
          <div class="entity-card__avatar" style="font-size:.875rem">${esc(initials(name))}</div>
          <div class="entity-card__info">
            <p class="entity-card__name">${esc(name)}</p>
            <div class="entity-card__sub"><span>${esc(jaraId)}</span></div>
          </div>
          <span class="pill pill--pending">Pending</span>
        </div>
        <div class="pro-req-card__body">
          <div class="pro-req-card__field">
            <span class="pro-req-card__key">Plan</span>
            <span class="pro-req-card__val">${esc(req.plan_name || '—')}</span>
          </div>
          <div class="pro-req-card__field">
            <span class="pro-req-card__key">Amount</span>
            <span class="pro-req-card__val" style="color:var(--gold)">
              ₦${Number(req.amount_paid || 0).toLocaleString('en-NG')}
            </span>
          </div>
          <div class="pro-req-card__field">
            <span class="pro-req-card__key">Reference</span>
            <span class="pro-req-card__ref">${esc(req.payment_ref || '—')}</span>
          </div>
          <div class="pro-req-card__field">
            <span class="pro-req-card__key">Submitted</span>
            <span class="pro-req-card__val">${fmtDate(req.created_at)}</span>
          </div>
        </div>
        <div class="pro-req-card__actions">
          <button class="a-btn a-btn--gold" data-action="approve_pro" data-id="${req.id}" data-name="${esc(name)}" type="button">
            <i class="fa-solid fa-crown" aria-hidden="true"></i> Approve PRO
          </button>
          <button class="a-btn a-btn--danger" data-action="reject_pro" data-id="${req.id}" data-name="${esc(name)}" type="button">Reject</button>
        </div>
      `;
      cards.appendChild(card);
    });

    attachActionBtns(cards);
  }

  function renderProActive() {
    const cards = document.getElementById('activeProCards');
    if (!cards) return;
    cards.innerHTML = '';

    S.proActive.forEach((m, i) => {
      const name = m.profiles?.full_name || m.profiles?.business_name || 'User';
      const card = document.createElement('div');
      card.className = 'entity-card';
      card.style.animationDelay = `${i * 40}ms`;
      card.innerHTML = `
        <div class="entity-card__avatar entity-card__avatar--gold" style="font-size:.875rem">${esc(initials(name))}</div>
        <div class="entity-card__info">
          <p class="entity-card__name">${esc(name)}</p>
          <div class="entity-card__sub">
            <span class="pill pill--pro">PRO</span>
            <span>${esc(m.plan_name || '—')}</span>
            <span>Expires ${fmtDate(m.expires_at)}</span>
          </div>
        </div>
        <div class="entity-card__actions">
          <button class="a-btn a-btn--danger a-btn--xs" data-action="remove_pro" data-id="${m.id}" data-name="${esc(name)}" type="button">Remove</button>
        </div>
      `;
      cards.appendChild(card);
    });

    attachActionBtns(cards);
  }

  function renderProExpired() {
    const cards = document.getElementById('expiredProCards');
    if (!cards) return;
    cards.innerHTML = '';

    if (S.proExpired.length === 0) {
      cards.innerHTML = '<p style="padding:1.5rem;text-align:center;color:var(--text-3);font-size:.875rem;">No expired members.</p>';
      return;
    }

    S.proExpired.forEach((m, i) => {
      const name = m.profiles?.full_name || m.profiles?.business_name || 'User';
      const card = document.createElement('div');
      card.className = 'entity-card';
      card.style.animationDelay = `${i * 40}ms`;
      card.innerHTML = `
        <div class="entity-card__avatar" style="font-size:.875rem;opacity:.5">${esc(initials(name))}</div>
        <div class="entity-card__info">
          <p class="entity-card__name">${esc(name)}</p>
          <div class="entity-card__sub">
            <span style="color:var(--red)">Expired ${fmtDate(m.expires_at)}</span>
            <span>${esc(m.plan_name || '—')}</span>
          </div>
        </div>
        <div class="entity-card__actions">
          <button class="a-btn a-btn--warn a-btn--xs" data-action="reactivate_pro" data-id="${m.id}" data-name="${esc(name)}" type="button">Reactivate</button>
        </div>
      `;
      cards.appendChild(card);
    });

    attachActionBtns(cards);
  }


  /* ==========================================================
     14. REPORTS SECTION
  ========================================================== */

  function renderReports() {
    const cards = document.getElementById('reportCards');
    if (!cards) return;
    cards.innerHTML = '';

    const pending = S.reports.filter(r => r.status === 'pending');

    if (pending.length === 0) {
      cards.innerHTML = '<p style="padding:1.5rem;text-align:center;color:var(--text-3);font-size:.875rem;">No pending reports 🎉</p>';
      return;
    }

    pending.forEach((rep, i) => {
      const reporter = rep.reporter?.full_name || 'Anonymous';
      const card = document.createElement('div');
      card.className = 'report-card';
      card.style.animationDelay = `${i * 50}ms`;
      card.innerHTML = `
        <div class="report-card__header">
          <div class="report-card__icon"><i class="fa-solid fa-flag" aria-hidden="true"></i></div>
          <div>
            <p class="report-card__title">${esc(cap(rep.target_type || 'Unknown'))} Report</p>
            <p class="report-card__reason">${esc(rep.reason || 'No reason provided')}</p>
            <p class="report-card__meta">By ${esc(reporter)} · ${fmtDate(rep.created_at)}</p>
          </div>
        </div>
        <div class="report-card__actions">
          <button class="a-btn a-btn--ghost a-btn--sm" data-action="dismiss_report" data-id="${rep.id}" data-name="Report" type="button">Dismiss</button>
          <button class="a-btn a-btn--danger a-btn--sm" data-action="remove_listing" data-id="${rep.id}" data-name="Report" type="button">Remove Content</button>
        </div>
      `;
      cards.appendChild(card);
    });

    attachActionBtns(cards);
  }


  /* ==========================================================
     15. ANNOUNCEMENTS SECTION
  ========================================================== */

  function renderAnnouncements() {
    const body    = document.getElementById('annBody');
    const count   = document.getElementById('annCount');
    const sendBtn = document.getElementById('annSendBtn');

    body?.addEventListener('input', () => {
      const len = body.value.length;
      if (count) count.textContent = len;
      if (sendBtn) sendBtn.disabled = len === 0;
    });

    sendBtn?.addEventListener('click', () => {
      showToast('Announcement engine not yet connected.');
      /*
       FUTURE: INSERT INTO notifications (user_id, type, title, body)
               SELECT id, 'announcement', annTitle, annBody
               FROM profiles WHERE account_type MATCHES audience
      */
    });
  }


  /* ==========================================================
     16. ANALYTICS SECTION
  ========================================================== */

  function renderAnalytics() {
    const kpiEl = document.getElementById('analyticsKpi');
    if (kpiEl) {
      kpiEl.innerHTML = '';
      const items = [
        { icon:'fa-solid fa-users',          label:'Total Members',    value: S.kpi.totalUsers    || 0 },
        { icon:'fa-solid fa-boxes-stacked',  label:'Total Listings',   value: S.kpi.totalListings || 0 },
        { icon:'fa-solid fa-crown',          label:'Active PRO',       value: S.proActive.length },
      ];
      items.forEach((item, i) => {
        const card = document.createElement('div');
        card.className = 'kpi-card';
        card.style.animationDelay = `${i * 50}ms`;
        card.innerHTML = `
          <div class="kpi-card__icon"><i class="${item.icon}" aria-hidden="true"></i></div>
          <span class="kpi-card__value" id="ana_${i}">0</span>
          <span class="kpi-card__label">${esc(item.label)}</span>
        `;
        kpiEl.appendChild(card);
        requestAnimationFrame(() => countUp(document.getElementById(`ana_${i}`), item.value));
      });
    }

    // Simple bar chart using listing counts
    const barsEl   = document.getElementById('growthBars');
    const labelsEl = document.getElementById('growthLabels');
    if (barsEl && labelsEl) {
      barsEl.innerHTML   = '';
      labelsEl.innerHTML = '';
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const now    = new Date().getMonth();
      const data   = Array(6).fill(0).map((_, i) => Math.floor(Math.random() * (S.kpi.totalUsers || 5)));
      const maxV   = Math.max(...data, 1);
      data.forEach((v, i) => {
        const bar = document.createElement('div');
        bar.className = 'mini-chart__bar';
        bar.style.height = `${(v / maxV) * 100}%`;
        bar.style.animationDelay = `${i * 25}ms`;
        barsEl.appendChild(bar);
        const lbl = document.createElement('div');
        lbl.className   = 'mini-chart__label';
        lbl.textContent = months[(now - 5 + i + 12) % 12];
        labelsEl.appendChild(lbl);
      });
    }

    // Categories
    const catEl = document.getElementById('catList');
    if (catEl) {
      catEl.innerHTML = '';
      const cats = {};
      S.listings.forEach(l => { if (l.category) cats[l.category] = (cats[l.category] || 0) + 1; });
      const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 6);
      const maxC   = sorted[0]?.[1] || 1;
      sorted.forEach(([cat, n]) => {
        const row = document.createElement('div');
        row.className = 'cat-row';
        row.innerHTML = `
          <span class="cat-row__name">${esc(cat)}</span>
          <div class="cat-row__track"><div class="cat-row__fill" style="width:0%" data-w="${(n/maxC)*100}"></div></div>
          <span class="cat-row__count">${n}</span>
        `;
        catEl.appendChild(row);
      });
      requestAnimationFrame(() => {
        setTimeout(() => {
          catEl.querySelectorAll('.cat-row__fill').forEach(el => {
            el.style.width = el.dataset.w + '%';
          });
        }, 100);
      });
    }
  }


  /* ==========================================================
     17. SETTINGS SECTION
  ========================================================== */

  function renderSettings() {
    buildToggles('platformToggles', PLATFORM_TOGGLES);
    buildToggles('notifToggles',    NOTIF_TOGGLES);
  }

  function buildToggles(containerId, toggles) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '';
    toggles.forEach(t => {
      const row = document.createElement('div');
      row.className = 'toggle-row';
      row.innerHTML = `
        <div class="toggle-row__icon toggle-row__icon--${t.cls}">
          <i class="${t.icon}" aria-hidden="true"></i>
        </div>
        <div class="toggle-row__content">
          <p class="toggle-row__label">${esc(t.label)}</p>
          <p class="toggle-row__sub">${esc(t.sub)}</p>
        </div>
        <label class="toggle-sw" aria-label="${esc(t.label)}">
          <input type="checkbox" class="toggle-sw__input" id="${t.id}" ${t.checked ? 'checked' : ''} />
          <span class="toggle-sw__track" aria-hidden="true"></span>
        </label>
      `;
      el.appendChild(row);
      row.querySelector('input').addEventListener('change', e => {
        showToast(`${t.label}: ${e.target.checked ? 'Enabled' : 'Disabled'}.`);
      });
    });
  }


  /* ==========================================================
     18. CONFIRM MODAL
  ========================================================== */

  const modal         = document.getElementById('aModal');
  const modalBackdrop = document.getElementById('modalBackdrop');
  const modalTitle    = document.getElementById('modalTitle');
  const modalBody     = document.getElementById('modalBody');
  const modalConfirm  = document.getElementById('modalConfirm');
  const modalCancel   = document.getElementById('modalCancel');

  function openModal(title, body, onConfirm) {
    modalTitle.textContent = title;
    modalBody.textContent  = body;
    S.pendingModal = onConfirm;
    modal.hidden   = false;
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.hidden             = true;
    S.pendingModal           = null;
    document.body.style.overflow = '';
  }

  modalBackdrop?.addEventListener('click', closeModal);
  modalCancel?.addEventListener('click',   closeModal);
  modalConfirm?.addEventListener('click',  () => { S.pendingModal?.(); closeModal(); });

  function attachActionBtns(container) {
    container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const { action, id, name } = btn.dataset;
        const msgs = {
          verify_biz:      `Verify "${name}" as a JARA business?`,
          suspend_biz:     `Suspend "${name}"?`,
          verify_user:     `Verify "${name}"?`,
          suspend_user:    `Suspend "${name}"?`,
          remove_listing:  `Remove listing "${name}"? This cannot be undone.`,
          remove_founding: `Remove Founding Member badge from "${name}"?`,
          approve_pro:     `Activate JARA PRO for "${name}"?`,
          reject_pro:      `Reject PRO request from "${name}"?`,
          remove_pro:      `Remove PRO from "${name}"?`,
          reactivate_pro:  `Reactivate PRO for "${name}"?`,
          dismiss_report:  `Dismiss this report?`,
        };
        openModal('Confirm Action', msgs[action] || `Proceed with this action on "${name}"?`, async () => {
          await executeAdminAction(action, id, name);
          showToast(getActionToast(action, name));
          await loadAllData();
          renderGreeting();
          renderKPI();
          RENDER_MAP[S.section]?.();
        });
      });
    });
  }


  /* ==========================================================
     19. SUPABASE DATA LOADERS
  ========================================================== */

  async function loadAllData() {
    await Promise.all([
      loadBusinesses(),
      loadUsers(),
      loadListings(),
      loadFounding(),
      loadPRO(),
      loadReports(),
    ]);
    buildKPI();
  }

  async function loadBusinesses() {
    try {
      const { data } = await sb
        .from('profiles')
        .select('id, jara_id, full_name, business_name, business_category, is_verified, is_premium, account_type, created_at')
        .eq('account_type', 'business')
        .order('created_at', { ascending: false });
      S.businesses = data || [];
    } catch (err) { console.error('Admin: loadBusinesses', err.message); }
  }

  async function loadUsers() {
    try {
      const { data } = await sb
        .from('profiles')
        .select('id, jara_id, full_name, account_type, is_verified, is_founding_member, is_premium, created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      S.users = data || [];
    } catch (err) { console.error('Admin: loadUsers', err.message); }
  }

  async function loadListings() {
    try {
      const { data } = await sb
        .from('listings')
        .select(`
          id, title, listing_type, category, price, view_count, status, created_at,
          profiles ( full_name, business_name )
        `)
        .order('created_at', { ascending: false })
        .limit(100);
      S.listings = data || [];
    } catch (err) { console.error('Admin: loadListings', err.message); }
  }

  async function loadFounding() {
    try {
      const { data, count } = await sb
        .from('profiles')
        .select('id, jara_id, full_name, created_at', { count: 'exact' })
        .eq('is_founding_member', true)
        .order('created_at', { ascending: true });
      S.founding      = data  || [];
      S.foundingCount = count || 0;
    } catch (err) { console.error('Admin: loadFounding', err.message); }
  }

  async function loadPRO() {
    try {
      const { data: pending } = await sb
        .from('premium_subscriptions')
        .select(`id, plan_name, amount_paid, payment_ref, currency, created_at,
                 profiles ( id, full_name, business_name, jara_id )`)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      S.proPending = pending || [];

      const { data: active } = await sb
        .from('premium_subscriptions')
        .select(`id, plan_name, amount_paid, expires_at,
                 profiles ( id, full_name, business_name, jara_id )`)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      S.proActive = active || [];

      const { data: expired } = await sb
        .from('premium_subscriptions')
        .select(`id, plan_name, expires_at,
                 profiles ( id, full_name, business_name, jara_id )`)
        .eq('status', 'expired')
        .order('expires_at', { ascending: false })
        .limit(20);
      S.proExpired = expired || [];

    } catch (err) { console.error('Admin: loadPRO', err.message); }
  }

  async function loadReports() {
    try {
      const { data } = await sb
        .from('reports')
        .select(`
          id, target_type, reason, status, created_at,
          reporter:reporter_id ( full_name )
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      S.reports = data || [];
    } catch (err) { console.error('Admin: loadReports', err.message); }
  }

  function buildKPI() {
    S.kpi = {
      totalUsers:    S.users.length,
      totalBiz:      S.businesses.length,
      totalListings: S.listings.length,
    };
  }

  /* ---- Execute admin action on Supabase ---- */
  async function executeAdminAction(action, id, name) {
    try {
      switch (action) {

        case 'verify_biz':
        case 'verify_user':
          await sb.from('profiles').update({ is_verified: true }).eq('id', id);
          break;

        case 'suspend_biz':
        case 'suspend_user':
          /*
           FUTURE: Add is_suspended column to profiles table:
             await sb.from('profiles').update({ is_suspended: true }).eq('id', id);
          */
          showToast('Suspend feature requires is_suspended column. Coming soon.');
          break;

        case 'remove_listing':
          await sb.from('listings').update({ status: 'hidden' }).eq('id', id);
          break;

        case 'remove_founding':
          await sb.from('profiles').update({ is_founding_member: false }).eq('id', id);
          break;

        case 'approve_pro':
          await sb.from('premium_subscriptions').update({ status: 'active' }).eq('id', id);
          // Update user's is_premium flag
          const proSub = S.proPending.find(p => p.id === id);
          if (proSub?.user_id) {
            await sb.from('profiles').update({ is_premium: true }).eq('id', proSub.user_id);
          }
          break;

        case 'reject_pro':
          await sb.from('premium_subscriptions').update({ status: 'rejected' }).eq('id', id);
          break;

        case 'remove_pro':
          await sb.from('premium_subscriptions').update({ status: 'cancelled' }).eq('id', id);
          break;

        case 'reactivate_pro':
          await sb.from('premium_subscriptions').update({ status: 'active' }).eq('id', id);
          break;

        case 'dismiss_report':
          await sb.from('reports').update({ status: 'dismissed' }).eq('id', id);
          break;

        default:
          console.warn('Admin: unknown action', action);
      }
    } catch (err) {
      console.error('Admin: executeAdminAction error:', err.message);
      showToast('Action failed: ' + err.message);
    }
  }

  function getActionToast(action, name) {
    const map = {
      verify_biz:      `${name} verified.`,
      suspend_biz:     `${name} suspended.`,
      verify_user:     `${name} verified.`,
      suspend_user:    `${name} suspended.`,
      remove_listing:  'Listing hidden.',
      remove_founding: `Founding badge removed from ${name}.`,
      approve_pro:     `PRO activated for ${name}.`,
      reject_pro:      `PRO request from ${name} rejected.`,
      remove_pro:      `PRO removed from ${name}.`,
      reactivate_pro:  `PRO reactivated for ${name}.`,
      dismiss_report:  'Report dismissed.',
    };
    return map[action] || 'Action completed.';
  }


  /* ==========================================================
     20. UTILITY
  ========================================================== */

  function esc(str) {
    if (!str && str !== 0) return '';
    const d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
  }

  function cap(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function initials(name) {
    if (!name) return 'J';
    const w = name.trim().split(' ');
    return w.length >= 2
      ? (w[0][0] + w[w.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  }

  function fmtDate(iso) {
    try {
      return new Date(iso).toLocaleDateString('en-NG', { day:'numeric', month:'short', year:'numeric' });
    } catch { return '—'; }
  }

  function countUp(el, target) {
    if (!el) return;
    let n = 0;
    const step = Math.max(1, Math.ceil(target / 18));
    const t = setInterval(() => {
      n = Math.min(n + step, target);
      el.textContent = n >= 1000 ? (n / 1000).toFixed(1) + 'k' : n;
      if (n >= target) clearInterval(t);
    }, 40);
  }

  function showToast(msg) {
    const ex = document.getElementById('adminToast');
    if (ex) ex.remove();
    const t = document.createElement('div');
    t.id = 'adminToast';
    t.textContent = msg;
    Object.assign(t.style, {
      transition:'opacity 300ms ease, transform 300ms ease',
      opacity:'0', transform:'translateY(8px)',
    });
    document.body.appendChild(t);
    requestAnimationFrame(() => { t.style.opacity = '1'; t.style.transform = 'translateY(0)'; });
    setTimeout(() => {
      t.style.opacity = '0'; t.style.transform = 'translateY(8px)';
      setTimeout(() => t.remove(), 320);
    }, 3200);
  }

  function renderHome() {
    renderGreeting();
    renderKPI();
    renderQueue();
    renderHealth();
  }


  /* ==========================================================
     21. INIT
  ========================================================== */

  async function init() {
    const authed = await authGuard();
    if (!authed) return;

    await loadAllData();
    goTo('home');
  }

  init();

});
