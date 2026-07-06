/* ============================================================
   JARA ∆ — Admin Dashboard v2
   js/admin.js

   Depends on:
     - window._supabase  (js/supabase-client.js)
     - DOM in admin/index.html

   TABLE OF CONTENTS
   1.  Placeholder data
   2.  State
   3.  Auth guard
   4.  Sidebar + mobile nav
   5.  Section router
   6.  Home — greeting + attention line
   7.  Home — KPI cards
   8.  Home — Command Queue
   9.  Home — Quick Actions
   10. Home — System Health
   11. Businesses section
   12. Users section
   13. Listings section
   14. Founding Members section
   15. JARA PRO section
   16. Reports section
   17. Announcements section
   18. Analytics section
   19. Settings section
   20. Confirm modal
   21. Utility helpers
   22. Init
============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ==========================================================
     1. PLACEHOLDER DATA
  ========================================================== */

  /* FUTURE: SELECT * FROM profiles WHERE account_type IN ('business','service_provider') */
  const DATA_BIZ = [
    { id:'b1', name:"Blessing's Kitchen",   owner:'Blessing Adeyemi', category:'Food & Drinks',     status:'verified',  isPro:true  },
    { id:'b2', name:'ZM Creative Studio',   owner:'Zainab Mohammed',  category:'Creative Services', status:'pending',   isPro:false },
    { id:'b3', name:'Emeka Power Rentals',  owner:'Emeka Johnson',    category:'Power & Generator', status:'pending',   isPro:false },
    { id:'b4', name:'Kemi Laundry',         owner:'Kemi Fashola',     category:'Laundry & Errands', status:'verified',  isPro:false },
    { id:'b5', name:'David Prints',         owner:'David Kolawole',   category:'Printing & Typing', status:'suspended', isPro:false },
  ];

  /* FUTURE: SELECT * FROM profiles ORDER BY created_at DESC */
  const DATA_USERS = [
    { id:'u1', name:'Precious Okafor',  jaraId:'JARA-00001', type:'student',      status:'verified',  isFounder:true  },
    { id:'u2', name:'Adaeze Okonkwo',   jaraId:'JARA-00066', type:'student',      status:'verified',  isFounder:false },
    { id:'u3', name:'Tunde Eze',        jaraId:'JARA-00112', type:'seller',       status:'suspended', isFounder:false },
    { id:'u4', name:'Fatima Kola',      jaraId:'JARA-00099', type:'student',      status:'pending',   isFounder:false },
    { id:'u5', name:'Hassan Bello',     jaraId:'JARA-00077', type:'student',      status:'pending',   isFounder:false },
    { id:'u6', name:'Ngozi Adeleke',    jaraId:'JARA-00134', type:'professional', status:'verified',  isFounder:true  },
  ];

  /* FUTURE: SELECT * FROM products UNION ALL services UNION ALL requests */
  const DATA_LISTINGS = [
    { id:'p1', title:'Honda Generator 2.5KVA',       type:'product', seller:'Emeka J.',   views:89 },
    { id:'s2', title:'Graphic Design — Flyers',      type:'service', seller:'Zainab M.',  views:134 },
    { id:'p3', title:'Fairly Used iPhone 12',        type:'product', seller:'Hassan B.',  views:67 },
    { id:'r1', title:'Need generator tonight',       type:'request', seller:'Anonymous',  views:12 },
    { id:'s4', title:'Assignment Typing Service',    type:'service', seller:'David K.',   views:45 },
  ];

  /* FUTURE: SELECT * FROM profiles WHERE is_founding_member = TRUE */
  const DATA_FOUNDING = [
    { id:'f1', name:'Precious Okafor',  jaraId:'JARA-00001', awarded:'10 Jan 2025' },
    { id:'f2', name:'Adaeze Okonkwo',   jaraId:'JARA-00066', awarded:'16 Jan 2025' },
    { id:'f3', name:'Ngozi Adeleke',    jaraId:'JARA-00134', awarded:'20 Jan 2025' },
  ];

  const FOUNDING_TOTAL = 100;

  /* FUTURE: SELECT * FROM premium_subscriptions WHERE status = 'pending' */
  const DATA_PRO_PENDING = [
    { id:'pp1', name:'David Kolawole', jaraId:'JARA-00112', plan:'Monthly',  amount:'₦1,500', ref:'ZEN240128441', time:'2 hours ago' },
    { id:'pp2', name:'Ngozi Adeleke',  jaraId:'JARA-00134', plan:'3 Months', amount:'₦3,500', ref:'OPY240127992', time:'5 hours ago' },
  ];

  /* FUTURE: SELECT * FROM premium_subscriptions WHERE status = 'active' */
  const DATA_PRO_ACTIVE = [
    { id:'pa1', name:"Blessing's Kitchen", jaraId:'JARA-00042', plan:'Monthly',  expires:'28 Feb 2025' },
    { id:'pa2', name:'ZM Creative Studio', jaraId:'JARA-00031', plan:'3 Months', expires:'10 Apr 2025' },
  ];

  /* FUTURE: SELECT * FROM premium_subscriptions WHERE status = 'expired' */
  const DATA_PRO_EXPIRED = [
    { id:'pe1', name:'Kemi Laundry', jaraId:'JARA-00088', plan:'Monthly', expires:'15 Jan 2025' },
  ];

  /* FUTURE: SELECT * FROM reports WHERE status = 'pending' */
  const DATA_REPORTS = [
    { id:'r1', title:'Suspicious Generator Listing', reason:'Possible scam — price too good to be true', reporter:'Anonymous',    time:'2 hours ago' },
    { id:'r2', title:'Profile: Unknown User',        reason:'Fake identity, no school affiliation',      reporter:'Tunde E.',     time:'5 hours ago' },
    { id:'r3', title:'Service: Laptop Repair',       reason:'Charged and disappeared',                   reporter:'Adaeze O.',    time:'1 day ago'   },
  ];

  /* FUTURE: Aggregated from multiple tables */
  const DATA_KPI = [
    { id:'kNewUsers',   icon:'fa-solid fa-user-plus',    label:'New Users Today',         value:8,   iconCls:''       },
    { id:'kBizPending', icon:'fa-solid fa-store',        label:'Biz Awaiting Verif.',     value:2,   iconCls:'--warn' },
    { id:'kStudents',   icon:'fa-solid fa-graduation-cap',label:'Student Verifications',   value:5,   iconCls:''       },
    { id:'kProPending', icon:'fa-solid fa-crown',        label:'Pending PRO',             value:2,   iconCls:'--gold' },
    { id:'kReports',    icon:'fa-solid fa-flag',         label:'Pending Reports',         value:3,   iconCls:'--red'  },
    { id:'kTotalUsers', icon:'fa-solid fa-users',        label:'Total Members',           value:247, iconCls:''       },
    { id:'kTotalBiz',   icon:'fa-solid fa-buildings',    label:'Total Businesses',        value:38,  iconCls:''       },
    { id:'kListings',   icon:'fa-solid fa-box',          label:'Total Listings',          value:614, iconCls:''       },
    { id:'kProActive',  icon:'fa-solid fa-crown',        label:'Active PRO',              value:7,   iconCls:'--gold' },
    { id:'kFounding',   icon:'fa-solid fa-medal',        label:'Founding Members',        value:3,   iconCls:''       },
  ];

  /* Queue tasks — processed 4 at a time */
  const QUEUE_TASKS = [
    { id:'q1', type:'biz',    icon:'fa-solid fa-store',      iconCls:'--biz',    title:'Verify: ZM Creative Studio',    sub:'Business verification pending',    action:'verify_biz',  target:'b2', targetName:'ZM Creative Studio'  },
    { id:'q2', type:'biz',    icon:'fa-solid fa-store',      iconCls:'--biz',    title:'Verify: Emeka Power Rentals',   sub:'Business verification pending',    action:'verify_biz',  target:'b3', targetName:'Emeka Power Rentals' },
    { id:'q3', type:'pro',    icon:'fa-solid fa-crown',      iconCls:'--pro',    title:'Approve PRO: David Kolawole',   sub:'Monthly · ₦1,500 · Ref: ZEN240128441', action:'approve_pro', target:'pp1', targetName:'David Kolawole' },
    { id:'q4', type:'report', icon:'fa-solid fa-flag',       iconCls:'--report', title:'Review Report: Generator Listing', sub:'Reported: Possible scam',       action:'dismiss_report', target:'r1', targetName:'Generator Listing' },
    { id:'q5', type:'user',   icon:'fa-solid fa-user-check', iconCls:'--user',   title:'Verify: Fatima Kola',           sub:'Student verification pending',     action:'verify_user', target:'u4', targetName:'Fatima Kola'      },
    { id:'q6', type:'pro',    icon:'fa-solid fa-crown',      iconCls:'--pro',    title:'Approve PRO: Ngozi Adeleke',    sub:'3 Months · ₦3,500 · Ref: OPY240127992', action:'approve_pro', target:'pp2', targetName:'Ngozi Adeleke' },
  ];

  const ANALYTICS_CHART = [6,11,9,18,24,29,22,37,44,38,52,61,49,70];
  const ANALYTICS_LABELS = ['12','13','14','15','16','17','18','19','20','21','22','23','24','25'];
  const ANALYTICS_CATS   = [
    { name:'Generator',    n:284 },
    { name:'Laundry',      n:221 },
    { name:'Food',         n:198 },
    { name:'Printing',     n:167 },
    { name:'Tutoring',     n:134 },
    { name:'Haircut',      n:98  },
  ];

  const HEALTH_ITEMS = [
    { name:'Database',       status:'Operational', color:'green' },
    { name:'Auth',           status:'Operational', color:'green' },
    { name:'Storage',        status:'Operational', color:'green' },
    { name:'Website',        status:'Operational', color:'green' },
    { name:'Payments',       status:'Operational', color:'green' },
    { name:'Email',          status:'Operational', color:'green' },
  ];

  const PLATFORM_TOGGLES = [
    { id:'tog_launch',   icon:'fa-solid fa-rocket',                 cls:'green',  label:'Launch Mode',             sub:'Platform is live.',                checked:true  },
    { id:'tog_maint',    icon:'fa-solid fa-triangle-exclamation',   cls:'orange', label:'Maintenance Mode',        sub:'Show maintenance page to users.',   checked:false },
    { id:'tog_reg',      icon:'fa-solid fa-user-plus',              cls:'purple', label:'New Registrations',       sub:'Allow new users to sign up.',       checked:true  },
    { id:'tog_email',    icon:'fa-solid fa-envelope-circle-check',  cls:'blue',   label:'Email Verification',      sub:'Require email before login.',       checked:true  },
  ];

  const NOTIF_TOGGLES = [
    { id:'ntog_reports', icon:'fa-solid fa-flag',      cls:'red',    label:'Report Alerts',         sub:'Notify on new reports.',            checked:true  },
    { id:'ntog_pro',     icon:'fa-solid fa-crown',     cls:'gold',   label:'PRO Payments',          sub:'Notify on new PRO requests.',       checked:true  },
    { id:'ntog_security',icon:'fa-solid fa-shield-halved',cls:'blue',label:'Security Alerts',       sub:'Unusual login attempts.',           checked:true  },
  ];


  /* ==========================================================
     2. STATE
  ========================================================== */
  const S = {
    section:       'home',
    userId:        null,
    queueIndex:    0,       // pointer into QUEUE_TASKS
    queueVisible:  [],      // IDs currently visible in queue
    pendingModal:  null,    // { action, target, targetName, onConfirm }
    bizFilter:     'all',
    userFilter:    'all',
    listingFilter: 'all',
    proTab:        'pending',
  };

  const QUEUE_MAX = 4;


  /* ==========================================================
     3. AUTH GUARD
     FUTURE: Uncomment the is_admin check once the column exists.
  ========================================================== */
  async function authGuard() {
    try {
      const { data: { session } } = await window._supabase.auth.getSession();
      if (!session) { window.location.href = '../auth/login.html'; return false; }
      S.userId = session.user.id;

      /*
       FUTURE:
       const { data: profile } = await window._supabase
         .from('profiles').select('is_admin').eq('id', S.userId).single();
       if (!profile?.is_admin) { window.location.href = '../explore/index.html'; return false; }
      */
      return true;
    } catch {
      window.location.href = '../auth/login.html';
      return false;
    }
  }


  /* ==========================================================
     4. SIDEBAR + MOBILE NAV
  ========================================================== */
  const sidebar  = document.getElementById('aSidebar');
  const overlay  = document.getElementById('aOverlay');
  const menuBtn  = document.getElementById('menuBtn');

  function openSidebar()  { sidebar.classList.add('is-open');     overlay.classList.add('is-visible');  menuBtn?.setAttribute('aria-expanded','true'); }
  function closeSidebar() { sidebar.classList.remove('is-open');  overlay.classList.remove('is-visible'); menuBtn?.setAttribute('aria-expanded','false'); }

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
    await window._supabase.auth.signOut();
    window.location.href = '../auth/login.html';
  });


  /* ==========================================================
     5. SECTION ROUTER
  ========================================================== */
  const SECTION_MAP = {
    home:          'secHome',
    businesses:    'secBusinesses',
    users:         'secUsers',
    listings:      'secListings',
    founding:      'secFounding',
    pro:           'secPro',
    reports:       'secReports',
    announcements: 'secAnnouncements',
    analytics:     'secAnalytics',
    settings:      'secSettings',
  };

  const RENDER_MAP = {
    home:          renderHome,
    businesses:    renderBusinesses,
    users:         renderUsers,
    listings:      renderListings,
    founding:      renderFounding,
    pro:           renderPro,
    reports:       renderReports,
    announcements: renderAnnouncements,
    analytics:     renderAnalytics,
    settings:      renderSettings,
  };

  function goTo(section) {
    if (!SECTION_MAP[section]) return;
    S.section = section;

    document.querySelectorAll('.a-section').forEach(el => {
      el.hidden = true;
      el.classList.remove('a-section--active');
    });

    const target = document.getElementById(SECTION_MAP[section]);
    target.hidden = false;
    target.classList.add('a-section--active');

    document.querySelectorAll('.a-nav__link').forEach(l => {
      l.classList.toggle('a-nav__link--active', l.dataset.section === section);
    });

    RENDER_MAP[section]?.();
    document.querySelector('.a-main')?.scrollTo({ top:0, behavior:'smooth' });
  }

  // Quick action buttons on home
  document.querySelectorAll('.qa-btn[data-section]').forEach(btn => {
    btn.addEventListener('click', () => goTo(btn.dataset.section));
  });


  /* ==========================================================
     6. HOME — GREETING + ATTENTION LINE
  ========================================================== */

  function renderGreeting() {
    const hour = new Date().getHours();
    const label = document.getElementById('greetingLabel');
    if (label) {
      label.textContent =
        hour < 12 ? 'Good morning,' :
        hour < 17 ? 'Good afternoon,' :
        'Good evening,';
    }

    // Build attention message dynamically
    const pending  = DATA_PRO_PENDING.length;
    const reports  = DATA_REPORTS.length;
    const bizPend  = DATA_BIZ.filter(b => b.status === 'pending').length;
    const userPend = DATA_USERS.filter(u => u.status === 'pending').length;
    const total    = pending + reports + bizPend + userPend;

    let msg = '';
    if      (total === 0)    msg = 'You\'re all caught up. Everything is running smoothly.';
    else if (reports > 0)    msg = `${reports} report${reports > 1 ? 's' : ''} require${reports === 1 ? 's' : ''} your review.`;
    else if (pending > 0)    msg = `${pending} PRO payment${pending > 1 ? 's' : ''} awaiting approval.`;
    else if (bizPend > 0)    msg = `${bizPend} ${bizPend === 1 ? 'business' : 'businesses'} waiting for verification.`;
    else if (userPend > 0)   msg = `${userPend} member${userPend > 1 ? 's' : ''} pending verification.`;
    else                     msg = `${total} operation${total > 1 ? 's' : ''} require${total === 1 ? 's' : ''} your attention today.`;

    const attnEl = document.getElementById('greetingAttention');
    if (attnEl) {
      attnEl.style.opacity = '0';
      setTimeout(() => {
        attnEl.textContent  = msg;
        attnEl.style.opacity = '1';
      }, 200);
    }

    // Nav dots
    const bizDot    = document.getElementById('bizDot');
    const proDot    = document.getElementById('proDot');
    const reportDot = document.getElementById('reportDot');
    if (bizDot)    { bizDot.hidden    = bizPend === 0; }
    if (proDot)    { proDot.hidden    = pending === 0; }
    if (reportDot) { reportDot.hidden = reports === 0; }
  }


  /* ==========================================================
     7. HOME — KPI CARDS
  ========================================================== */

  function renderKPI() {
    const grid = document.getElementById('kpiGrid');
    if (!grid) return;
    grid.innerHTML = '';

    DATA_KPI.forEach((item, i) => {
      const card = document.createElement('div');
      card.className = 'kpi-card';
      card.style.animationDelay = `${i * 35}ms`;

      card.innerHTML = `
        <div class="kpi-card__icon kpi-card__icon${item.iconCls || ''}">
          <i class="${item.icon}" aria-hidden="true"></i>
        </div>
        <span class="kpi-card__value" id="${item.id}">0</span>
        <span class="kpi-card__label">${esc(item.label)}</span>
      `;
      grid.appendChild(card);
      requestAnimationFrame(() => countUp(document.getElementById(item.id), item.value));
    });
  }


  /* ==========================================================
     8. HOME — COMMAND QUEUE
  ========================================================== */

  function renderQueue() {
    const list = document.getElementById('queueList');
    const countEl = document.getElementById('queueCount');
    if (!list) return;

    list.innerHTML = '';
    S.queueVisible = [];
    S.queueIndex   = 0;

    // Fill up to QUEUE_MAX
    for (let i = 0; i < Math.min(QUEUE_MAX, QUEUE_TASKS.length); i++) {
      appendQueueItem(QUEUE_TASKS[i]);
      S.queueIndex = i + 1;
    }

    updateQueueCount(countEl);

    if (QUEUE_TASKS.length === 0) showQueueEmpty(list);
  }

  function appendQueueItem(task) {
    const list = document.getElementById('queueList');
    if (!list) return;

    const item = document.createElement('div');
    item.className = 'queue-item';
    item.id        = `qi-${task.id}`;
    item.setAttribute('role', 'listitem');
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
          data-task="${task.id}"
          data-action="${task.action}"
          data-target="${task.target}"
          data-name="${esc(task.targetName)}"
          type="button">
          Done
        </button>
        <button class="a-btn a-btn--ghost a-btn--sm queue-skip-btn"
          data-task="${task.id}"
          type="button">
          Skip
        </button>
      </div>
    `;

    list.appendChild(item);
    S.queueVisible.push(task.id);

    // Attach button listeners
    item.querySelector('.queue-complete-btn').addEventListener('click', e => {
      const btn = e.currentTarget;
      completeQueueItem(btn.dataset.task, btn.dataset.action, btn.dataset.target, btn.dataset.name);
    });

    item.querySelector('.queue-skip-btn').addEventListener('click', e => {
      skipQueueItem(e.currentTarget.dataset.task);
    });
  }

  function completeQueueItem(taskId, action, target, name) {
    const messages = {
      verify_biz:      `${name} has been verified.`,
      approve_pro:     `PRO activated for ${name}.`,
      dismiss_report:  `Report dismissed.`,
      verify_user:     `${name} has been verified.`,
    };

    openModal(
      'Confirm Action',
      messages[action] ? `Proceed? ${messages[action]}` : 'Are you sure?',
      () => {
        removeQueueItem(taskId);
        pullNextQueueItem();
        showToast(messages[action] || 'Action completed.');
        renderGreeting();
      }
    );
  }

  function skipQueueItem(taskId) {
    removeQueueItem(taskId);
    pullNextQueueItem();
  }

  function removeQueueItem(taskId) {
    const el = document.getElementById(`qi-${taskId}`);
    if (!el) return;
    el.classList.add('is-completing');
    S.queueVisible = S.queueVisible.filter(id => id !== taskId);
    setTimeout(() => el.remove(), 330);
  }

  function pullNextQueueItem() {
    const list = document.getElementById('queueList');
    const countEl = document.getElementById('queueCount');
    if (!list) return;

    // After animation, check if we have more tasks
    setTimeout(() => {
      if (S.queueIndex < QUEUE_TASKS.length) {
        appendQueueItem(QUEUE_TASKS[S.queueIndex]);
        S.queueIndex++;
        updateQueueCount(countEl);
      } else if (S.queueVisible.length === 0) {
        showQueueEmpty(list);
        if (countEl) countEl.textContent = '';
      }
    }, 350);
  }

  function updateQueueCount(el) {
    if (!el) return;
    const remaining = QUEUE_TASKS.length - S.queueIndex + S.queueVisible.length;
    el.textContent = remaining > 0 ? `${remaining} remaining` : '';
  }

  function showQueueEmpty(list) {
    list.innerHTML = '';
    const el = document.createElement('div');
    el.className = 'queue-empty';
    el.innerHTML = `
      <div class="queue-empty__icon"><i class="fa-solid fa-circle-check" aria-hidden="true"></i></div>
      <p class="queue-empty__title">Excellent work, Chief Executive.</p>
      <p class="queue-empty__sub">No pending operations remain. Enjoy your day.</p>
    `;
    list.appendChild(el);
  }


  /* ==========================================================
     9. HOME — QUICK ACTIONS (buttons already in HTML)
  ========================================================== */
  // Handled by section router — no additional code needed.


  /* ==========================================================
     10. HOME — SYSTEM HEALTH
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
     11. BUSINESSES SECTION
  ========================================================== */

  function renderBusinesses() {
    const cards = document.getElementById('bizCards');
    if (!cards) return;

    const filtered = DATA_BIZ.filter(b =>
      S.bizFilter === 'all' || b.status === S.bizFilter
    );

    const search = document.getElementById('bizSearch')?.value.toLowerCase() || '';
    const final  = search ? filtered.filter(b =>
      b.name.toLowerCase().includes(search) || b.category.toLowerCase().includes(search)
    ) : filtered;

    cards.innerHTML = '';

    if (final.length === 0) {
      cards.innerHTML = '<p style="padding:1.5rem;text-align:center;color:var(--text-3);font-size:.875rem;">No businesses match this filter.</p>';
      return;
    }

    final.forEach((biz, i) => {
      const card = document.createElement('div');
      card.className = 'entity-card';
      card.setAttribute('role', 'listitem');
      card.style.animationDelay = `${i * 40}ms`;

      card.innerHTML = `
        <div class="entity-card__avatar">${esc(initials(biz.name))}</div>
        <div class="entity-card__info">
          <p class="entity-card__name">${esc(biz.name)}</p>
          <div class="entity-card__sub">
            <span>${esc(biz.category)}</span>
            <span class="pill pill--${biz.status}">${cap(biz.status)}</span>
            ${biz.isPro ? '<span class="pill pill--pro">PRO</span>' : ''}
          </div>
        </div>
        <div class="entity-card__actions">
          ${biz.status === 'pending'
            ? `<button class="a-btn a-btn--success a-btn--xs" data-action="verify_biz" data-id="${biz.id}" data-name="${esc(biz.name)}" type="button">Verify</button>
               <button class="a-btn a-btn--danger  a-btn--xs" data-action="reject_biz"  data-id="${biz.id}" data-name="${esc(biz.name)}" type="button">Reject</button>`
            : biz.status === 'verified'
            ? `<button class="a-btn a-btn--warn a-btn--xs" data-action="suspend_biz" data-id="${biz.id}" data-name="${esc(biz.name)}" type="button">Suspend</button>`
            : `<button class="a-btn a-btn--success a-btn--xs" data-action="unsuspend_biz" data-id="${biz.id}" data-name="${esc(biz.name)}" type="button">Unsuspend</button>`
          }
        </div>
      `;
      cards.appendChild(card);
    });

    attachActionBtns(cards);
  }

  // Filter chips
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
     12. USERS SECTION
  ========================================================== */

  function renderUsers() {
    const cards = document.getElementById('userCards');
    if (!cards) return;

    const filtered = DATA_USERS.filter(u =>
      S.userFilter === 'all' ||
      u.type === S.userFilter ||
      u.status === S.userFilter
    );

    const search = document.getElementById('userSearch')?.value.toLowerCase() || '';
    const final  = search ? filtered.filter(u =>
      u.name.toLowerCase().includes(search) || u.jaraId.toLowerCase().includes(search)
    ) : filtered;

    cards.innerHTML = '';

    final.forEach((user, i) => {
      const card = document.createElement('div');
      card.className = 'entity-card';
      card.setAttribute('role', 'listitem');
      card.style.animationDelay = `${i * 40}ms`;

      card.innerHTML = `
        <div class="entity-card__avatar">${esc(initials(user.name))}</div>
        <div class="entity-card__info">
          <p class="entity-card__name">${esc(user.name)}</p>
          <div class="entity-card__sub">
            <span>${esc(user.jaraId)}</span>
            <span class="pill pill--${user.status}">${cap(user.status)}</span>
            ${user.isFounder ? '<span class="pill pill--founding">Founder</span>' : ''}
            <span class="pill pill--${user.type}">${cap(user.type)}</span>
          </div>
        </div>
        <div class="entity-card__actions">
          ${user.status === 'pending'
            ? `<button class="a-btn a-btn--success a-btn--xs" data-action="verify_user" data-id="${user.id}" data-name="${esc(user.name)}" type="button">Verify</button>`
            : ''
          }
          ${user.status !== 'suspended'
            ? `<button class="a-btn a-btn--warn a-btn--xs" data-action="suspend_user" data-id="${user.id}" data-name="${esc(user.name)}" type="button">Suspend</button>`
            : `<button class="a-btn a-btn--success a-btn--xs" data-action="unsuspend_user" data-id="${user.id}" data-name="${esc(user.name)}" type="button">Restore</button>`
          }
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
     13. LISTINGS SECTION
  ========================================================== */

  function renderListings() {
    const cards = document.getElementById('listingCards');
    if (!cards) return;

    const filtered = DATA_LISTINGS.filter(l =>
      S.listingFilter === 'all' || l.type === S.listingFilter
    );

    cards.innerHTML = '';

    filtered.forEach((item, i) => {
      const card = document.createElement('div');
      card.className = 'entity-card';
      card.setAttribute('role', 'listitem');
      card.style.animationDelay = `${i * 40}ms`;

      card.innerHTML = `
        <div class="entity-card__avatar" style="font-size:1.25rem">
          ${item.type === 'product' ? '📦' : item.type === 'service' ? '🛠️' : '📢'}
        </div>
        <div class="entity-card__info">
          <p class="entity-card__name">${esc(item.title)}</p>
          <div class="entity-card__sub">
            <span class="pill pill--${item.type}">${cap(item.type)}</span>
            <span>${esc(item.seller)}</span>
            <span><i class="fa-solid fa-eye" style="font-size:.625rem" aria-hidden="true"></i> ${item.views}</span>
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
     14. FOUNDING MEMBERS SECTION
  ========================================================== */

  function renderFounding() {
    const awarded   = DATA_FOUNDING.length;
    const remaining = FOUNDING_TOTAL - awarded;
    const pct       = (awarded / FOUNDING_TOTAL) * 100;
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

    DATA_FOUNDING.forEach((m, i) => {
      const card = document.createElement('div');
      card.className = 'entity-card';
      card.setAttribute('role', 'listitem');
      card.style.animationDelay = `${i * 40}ms`;

      card.innerHTML = `
        <div class="entity-card__avatar entity-card__avatar--gold" style="font-size:.875rem">
          #${i + 1}
        </div>
        <div class="entity-card__info">
          <p class="entity-card__name">${esc(m.name)}</p>
          <div class="entity-card__sub">
            <span>${esc(m.jaraId)}</span>
            <span>Awarded ${esc(m.awarded)}</span>
          </div>
        </div>
        <div class="entity-card__actions">
          ${!isComplete
            ? `<button class="a-btn a-btn--danger a-btn--xs" data-action="remove_founding" data-id="${m.id}" data-name="${esc(m.name)}" type="button">Remove</button>`
            : ''
          }
        </div>
      `;
      cards.appendChild(card);
    });

    attachActionBtns(cards);
  }


  /* ==========================================================
     15. JARA PRO SECTION
  ========================================================== */

  function renderPro() {
    // Update pending badge
    const badge = document.getElementById('pendingProBadge');
    if (badge) badge.textContent = DATA_PRO_PENDING.length;

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

    if (tab === 'pending')  renderProPending();
    if (tab === 'active')   renderProActive();
    if (tab === 'expired')  renderProExpired();
  }

  document.querySelectorAll('[data-pro-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      S.proTab = btn.dataset.proTab;
      renderProTab(S.proTab);
    });
  });

  function renderProPending() {
    const cards = document.getElementById('pendingProCards');
    if (!cards) return;
    cards.innerHTML = '';

    if (DATA_PRO_PENDING.length === 0) {
      cards.innerHTML = '<p style="padding:1.5rem;text-align:center;color:var(--text-3);font-size:.875rem;">No pending PRO requests 🎉</p>';
      return;
    }

    DATA_PRO_PENDING.forEach((req, i) => {
      const card = document.createElement('div');
      card.className = 'pro-req-card';
      card.style.animationDelay = `${i * 50}ms`;

      card.innerHTML = `
        <div class="pro-req-card__header">
          <div class="entity-card__avatar" style="font-size:.875rem">${esc(initials(req.name))}</div>
          <div class="entity-card__info">
            <p class="entity-card__name">${esc(req.name)}</p>
            <div class="entity-card__sub"><span>${esc(req.jaraId)}</span></div>
          </div>
          <span class="pill pill--pending">Pending</span>
        </div>
        <div class="pro-req-card__body">
          <div class="pro-req-card__field">
            <span class="pro-req-card__key">Plan</span>
            <span class="pro-req-card__val">${esc(req.plan)}</span>
          </div>
          <div class="pro-req-card__field">
            <span class="pro-req-card__key">Amount</span>
            <span class="pro-req-card__val" style="color:var(--gold)">${esc(req.amount)}</span>
          </div>
          <div class="pro-req-card__field">
            <span class="pro-req-card__key">Reference</span>
            <span class="pro-req-card__ref">${esc(req.ref)}</span>
          </div>
          <div class="pro-req-card__field">
            <span class="pro-req-card__key">Submitted</span>
            <span class="pro-req-card__val">${esc(req.time)}</span>
          </div>
        </div>
        <div class="pro-req-card__actions">
          <button class="a-btn a-btn--gold"    data-action="approve_pro" data-id="${req.id}" data-name="${esc(req.name)}" type="button">
            <i class="fa-solid fa-crown" aria-hidden="true"></i> Approve PRO
          </button>
          <button class="a-btn a-btn--danger"  data-action="reject_pro"  data-id="${req.id}" data-name="${esc(req.name)}" type="button">Reject</button>
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

    DATA_PRO_ACTIVE.forEach((m, i) => {
      const card = document.createElement('div');
      card.className = 'entity-card';
      card.style.animationDelay = `${i * 40}ms`;
      card.innerHTML = `
        <div class="entity-card__avatar entity-card__avatar--gold" style="font-size:.875rem">${esc(initials(m.name))}</div>
        <div class="entity-card__info">
          <p class="entity-card__name">${esc(m.name)}</p>
          <div class="entity-card__sub">
            <span class="pill pill--pro">PRO</span>
            <span>${esc(m.plan)}</span>
            <span>Expires ${esc(m.expires)}</span>
          </div>
        </div>
        <div class="entity-card__actions">
          <button class="a-btn a-btn--danger a-btn--xs" data-action="remove_pro" data-id="${m.id}" data-name="${esc(m.name)}" type="button">Remove</button>
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

    if (DATA_PRO_EXPIRED.length === 0) {
      cards.innerHTML = '<p style="padding:1.5rem;text-align:center;color:var(--text-3);font-size:.875rem;">No expired members.</p>';
      return;
    }

    DATA_PRO_EXPIRED.forEach((m, i) => {
      const card = document.createElement('div');
      card.className = 'entity-card';
      card.style.animationDelay = `${i * 40}ms`;
      card.innerHTML = `
        <div class="entity-card__avatar" style="font-size:.875rem;opacity:.5">${esc(initials(m.name))}</div>
        <div class="entity-card__info">
          <p class="entity-card__name">${esc(m.name)}</p>
          <div class="entity-card__sub">
            <span style="color:var(--red)">Expired ${esc(m.expires)}</span>
            <span>${esc(m.plan)}</span>
          </div>
        </div>
        <div class="entity-card__actions">
          <button class="a-btn a-btn--warn a-btn--xs" data-action="reactivate_pro" data-id="${m.id}" data-name="${esc(m.name)}" type="button">Reactivate</button>
        </div>
      `;
      cards.appendChild(card);
    });
    attachActionBtns(cards);
  }


  /* ==========================================================
     16. REPORTS SECTION
  ========================================================== */

  function renderReports() {
    const cards = document.getElementById('reportCards');
    if (!cards) return;
    cards.innerHTML = '';

    if (DATA_REPORTS.length === 0) {
      cards.innerHTML = '<p style="padding:1.5rem;text-align:center;color:var(--text-3);font-size:.875rem;">No pending reports 🎉</p>';
      return;
    }

    DATA_REPORTS.forEach((rep, i) => {
      const card = document.createElement('div');
      card.className = 'report-card';
      card.style.animationDelay = `${i * 50}ms`;

      card.innerHTML = `
        <div class="report-card__header">
          <div class="report-card__icon"><i class="fa-solid fa-flag" aria-hidden="true"></i></div>
          <div>
            <p class="report-card__title">${esc(rep.title)}</p>
            <p class="report-card__reason">${esc(rep.reason)}</p>
            <p class="report-card__meta">Reported by ${esc(rep.reporter)} · ${esc(rep.time)}</p>
          </div>
        </div>
        <div class="report-card__actions">
          <button class="a-btn a-btn--ghost a-btn--sm"   data-action="dismiss_report"  data-id="${rep.id}" data-name="${esc(rep.title)}" type="button">Dismiss</button>
          <button class="a-btn a-btn--warn a-btn--sm"    data-action="warn_user_report" data-id="${rep.id}" data-name="${esc(rep.title)}" type="button">Warn User</button>
          <button class="a-btn a-btn--danger a-btn--sm"  data-action="remove_listing"   data-id="${rep.id}" data-name="${esc(rep.title)}" type="button">Remove Listing</button>
        </div>
      `;
      cards.appendChild(card);
    });

    attachActionBtns(cards);
  }


  /* ==========================================================
     17. ANNOUNCEMENTS SECTION
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
      showToast('Announcement engine not yet connected. Reference marked with FUTURE: in code.');
      /* FUTURE: INSERT INTO notifications (user_id, type, title, body)
                 SELECT id, 'announcement', annTitle, annBody
                 FROM profiles WHERE account_type MATCHES audience */
    });
  }


  /* ==========================================================
     18. ANALYTICS SECTION
  ========================================================== */

  function renderAnalytics() {
    // KPI row
    const kpiEl = document.getElementById('analyticsKpi');
    if (kpiEl) {
      kpiEl.innerHTML = '';
      const items = [
        { icon:'fa-solid fa-users',       label:'New Users (30d)',    value:63  },
        { icon:'fa-solid fa-boxes-stacked',label:'New Listings (30d)', value:184 },
        { icon:'fa-solid fa-magnifying-glass',label:'Searches (30d)',  value:1420 },
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

    // Bar chart
    const barsEl   = document.getElementById('growthBars');
    const labelsEl = document.getElementById('growthLabels');
    if (barsEl && labelsEl) {
      barsEl.innerHTML   = '';
      labelsEl.innerHTML = '';
      const maxV = Math.max(...ANALYTICS_CHART);
      ANALYTICS_CHART.forEach((v, i) => {
        const bar = document.createElement('div');
        bar.className = 'mini-chart__bar';
        bar.style.height = `${(v / maxV) * 100}%`;
        bar.style.animationDelay = `${i * 25}ms`;
        bar.title = `${v} users`;
        barsEl.appendChild(bar);
      });
      ANALYTICS_LABELS.forEach(l => {
        const el = document.createElement('div');
        el.className   = 'mini-chart__label';
        el.textContent = l;
        labelsEl.appendChild(el);
      });
    }

    // Categories
    const catEl = document.getElementById('catList');
    if (catEl) {
      catEl.innerHTML = '';
      const maxC = ANALYTICS_CATS[0].n;
      ANALYTICS_CATS.forEach(cat => {
        const row = document.createElement('div');
        row.className = 'cat-row';
        row.innerHTML = `
          <span class="cat-row__name">${esc(cat.name)}</span>
          <div class="cat-row__track">
            <div class="cat-row__fill" style="width:0%" data-w="${(cat.n/maxC)*100}"></div>
          </div>
          <span class="cat-row__count">${cat.n}</span>
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
     19. SETTINGS SECTION
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
        /* FUTURE: UPDATE platform_settings SET [key] = [value] WHERE id = 1 */
      });
    });
  }


  /* ==========================================================
     20. CONFIRM MODAL
  ========================================================== */

  const modal        = document.getElementById('aModal');
  const modalBackdrop= document.getElementById('modalBackdrop');
  const modalTitle   = document.getElementById('modalTitle');
  const modalBody    = document.getElementById('modalBody');
  const modalConfirm = document.getElementById('modalConfirm');
  const modalCancel  = document.getElementById('modalCancel');

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

  modalConfirm?.addEventListener('click', () => {
    S.pendingModal?.();
    closeModal();
  });

  // Centralised action handler for all entity action buttons
  function attachActionBtns(container) {
    container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const { action, id, name } = btn.dataset;
        const msgs = {
          verify_biz:       `Verify "${name}" as a legitimate JARA business?`,
          reject_biz:       `Reject verification for "${name}"?`,
          suspend_biz:      `Suspend "${name}"?`,
          unsuspend_biz:    `Restore "${name}"?`,
          verify_user:      `Verify "${name}"?`,
          suspend_user:     `Suspend "${name}"?`,
          unsuspend_user:   `Restore "${name}"?`,
          remove_listing:   `Remove listing "${name}"? This cannot be undone.`,
          remove_founding:  `Remove Founding Member badge from "${name}"?`,
          approve_pro:      `Activate JARA PRO for "${name}"?`,
          reject_pro:       `Reject PRO request from "${name}"?`,
          remove_pro:       `Remove PRO from "${name}"?`,
          reactivate_pro:   `Reactivate PRO for "${name}"?`,
          dismiss_report:   `Dismiss the report for "${name}"?`,
          warn_user_report: `Send a warning to the user linked to "${name}"?`,
        };

        const toasts = {
          verify_biz:       `${name} has been verified.`,
          reject_biz:       `${name} rejected.`,
          suspend_biz:      `${name} suspended.`,
          unsuspend_biz:    `${name} restored.`,
          verify_user:      `${name} verified.`,
          suspend_user:     `${name} suspended.`,
          unsuspend_user:   `${name} restored.`,
          remove_listing:   `Listing removed.`,
          remove_founding:  `Founding badge removed from ${name}.`,
          approve_pro:      `PRO activated for ${name}.`,
          reject_pro:       `PRO request from ${name} rejected.`,
          remove_pro:       `PRO removed from ${name}.`,
          reactivate_pro:   `PRO reactivated for ${name}.`,
          dismiss_report:   `Report dismissed.`,
          warn_user_report: `Warning sent.`,
        };

        openModal(
          'Confirm Action',
          msgs[action] || `Proceed with this action on "${name}"?`,
          () => {
            showToast(toasts[action] || 'Action completed.');
            renderGreeting();

            /*
             FUTURE: Based on action, call the appropriate Supabase function:

             'verify_biz' / 'verify_user':
               await window._supabase.from('profiles')
                 .update({ is_verified: true }).eq('id', id);

             'approve_pro':
               await window._supabase.from('premium_subscriptions')
                 .update({ status: 'active' }).eq('id', id);
               await window._supabase.from('profiles')
                 .update({ is_premium: true, has_pending_pro: false }).eq('id', userId);

             'reject_pro':
               await window._supabase.from('premium_subscriptions')
                 .update({ status: 'rejected' }).eq('id', id);

             'remove_founding':
               await window._supabase.from('profiles')
                 .update({ is_founding_member: false }).eq('id', id);

             Admin actions requiring Service Role (suspend, delete):
               → Handle via Supabase Edge Functions to keep keys server-side.
            */
          }
        );
      });
    });
  }


  /* ==========================================================
     21. UTILITY
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
      transition: 'opacity 300ms ease, transform 300ms ease',
      opacity: '0', transform: 'translateY(8px)',
    });
    document.body.appendChild(t);

    requestAnimationFrame(() => {
      t.style.opacity   = '1';
      t.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
      t.style.opacity   = '0';
      t.style.transform = 'translateY(8px)';
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
     22. INIT
  ========================================================== */

  async function init() {
    const authed = await authGuard();
    if (!authed) return;

    goTo('home');
  }

  init();

});
