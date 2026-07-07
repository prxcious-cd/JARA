/* ============================================================
   JARA ∆ — PRO / Premium Page  (v2)
   js/premium.js

   PAYMENT FLOW
   ────────────────────────────────────────────────────────────
   1. Landing panel → user selects Monthly or Yearly plan.
   2. Payment panel opens → bank transfer instructions shown.
   3. User transfers to OPay 9127523472, then fills:
        • Transaction Reference
        • Amount Paid
        • Payment Screenshot
   4. Submit → FUTURE Supabase insert (status: pending) →
      Submitted panel shown.
   5. Admin approves in Admin Dashboard → profile updated.
   6. Next visit → Active PRO card replaces plans.

   ADMIN CONNECTION
   ────────────────────────────────────────────────────────────
   Every FUTURE: comment shows the exact Supabase call.
   Submitted records appear in Admin → JARA PRO → Pending
   with: business ID, name, plan, amount, reference, screenshot.

   TABLE OF CONTENTS
   1.  Constants
   2.  State
   3.  DOM refs
   4.  Auth + user load
   5.  Panel router
   6.  Landing — render benefits + plans + user state
   7.  Plan selection
   8.  Copy account number
   9.  Screenshot upload
   10. Payment submission
   11. Status panel
   12. Manage PRO panel
   13. Navigation helpers
   14. Utilities
   15. Init
============================================================ */

document.addEventListener('DOMContentLoaded', () => {


  /* ==========================================================
     1. CONSTANTS
  ========================================================== */

  const BENEFITS = [
    { icon:'fa-solid fa-crown',               cls:'gold',   title:'PRO Badge',              desc:'A verified PRO badge on your profile and every listing builds instant trust with buyers.' },
    { icon:'fa-solid fa-magnifying-glass-chart', cls:'purple', title:'Increased Visibility',   desc:'PRO listings rank higher in search results and appear first in Explore.' },
    { icon:'fa-solid fa-bolt',                cls:'gold',   title:'Higher Priority in Search', desc:'Your business and listings appear before non-PRO accounts in every search.' },
    { icon:'fa-solid fa-store',               cls:'blue',   title:'Priority Exposure',        desc:'Featured placement on Explore and category pages. More eyes, more customers.' },
    { icon:'fa-solid fa-chart-simple',        cls:'green',  title:'Premium Business Tools',   desc:'Store analytics, QR code generator and detailed buyer insights.', soon:true },
    { icon:'fa-solid fa-headset',             cls:'purple', title:'Priority Support',         desc:'Direct access to the JARA team. Your queries are handled first.', soon:true },
    { icon:'fa-solid fa-star',                cls:'gold',   title:'Future PRO Features',      desc:'Every new premium feature ships to PRO members first, for life.', wide:true },
  ];

  const PLANS = [
    {
      key:'monthly', period:'Monthly',
      amount:2500, display:'₦2,500', per:'per month',
      recommended:false, saving:null,
      perks:['All PRO features','Cancel by not renewing','Activated within 24 hours'],
    },
    {
      key:'yearly', period:'Yearly',
      amount:25000, display:'₦25,000', per:'per year',
      recommended:true, saving:'Save ₦5,000',
      perks:['All PRO features','Only ₦2,083/month','Founding PRO status','Activated within 24 hours'],
    },
  ];

  const ACCOUNT = {
    bank:    'OPay',
    name:    'Adedeji Precious A',
    number:  '9127523472',
  };


  /* ==========================================================
     2. STATE
  ========================================================== */
  const S = {
    userId:         null,
    isFounder:      false,
    isPro:          false,
    proStatus:      null,   // null | 'pending' | 'active' | 'rejected'
    proSub:         null,   // subscription record
    selectedPlan:   null,
    screenshotFile: null,
    submittedRef:   '',
  };


  /* ==========================================================
     3. DOM REFS
  ========================================================== */
  const $ = id => document.getElementById(id);

  const panelLanding   = $('panelLanding');
  const panelPayment   = $('panelPayment');
  const panelSubmitted = $('panelSubmitted');
  const panelStatus    = $('panelStatus');
  const panelManage    = $('panelManage');

  const ALL_PANELS = [panelLanding, panelPayment, panelSubmitted, panelStatus, panelManage];


  /* ==========================================================
     4. AUTH + USER LOAD
  ========================================================== */

  async function loadUser() {
    try {
      const { data: { session } } = await window._supabase.auth.getSession();
      if (!session) return;
      S.userId = session.user.id;

      /*
       FUTURE: SELECT id, full_name, is_founding_member, is_premium,
                 premium_expires_at
               FROM profiles
               WHERE id = auth.uid()
               LIMIT 1
      */
      // ── Placeholder ──────────────────────────────────────────
      // Change is_founding_member to true  → shows Lifetime PRO screen
      // Change proStatus to 'active'       → shows Manage PRO card
      // Change proStatus to 'pending'      → shows pending notice
      // Change proStatus to 'rejected'     → shows rejected notice
      const mockProfile = {
        is_founding_member: false,
        is_premium:         false,
      };
      S.isFounder = mockProfile.is_founding_member;
      S.isPro     = mockProfile.is_premium;
      S.proStatus = null;
      S.proSub    = null;
      // ─────────────────────────────────────────────────────────

      /*
       FUTURE: SELECT * FROM premium_subscriptions
               WHERE user_id = auth.uid()
               ORDER BY created_at DESC LIMIT 1
      */

      // Founding slot count
      /*
       FUTURE: SELECT COUNT(*) FROM profiles WHERE is_founding_member = TRUE
      */
      const foundingUsed = $('foundingUsed');
      if (foundingUsed) foundingUsed.textContent = 3; // placeholder

    } catch (e) {
      console.warn('JARA PRO: session load failed.', e?.message);
    }
  }


  /* ==========================================================
     5. PANEL ROUTER
  ========================================================== */

  function showPanel(panel) {
    ALL_PANELS.forEach(p => { if (p) p.setAttribute('hidden', ''); });
    if (panel) {
      panel.removeAttribute('hidden');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }


  /* ==========================================================
     6. LANDING — BUILD + APPLY USER STATE
  ========================================================== */

  function renderLanding() {
    buildBenefits();
    buildPlans();
    applyUserState();
  }

  /* Build benefit cards */
  function buildBenefits() {
    const grid = $('benefitsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    BENEFITS.forEach((b, i) => {
      const card = document.createElement('div');
      card.className = `benefit-card${b.wide ? ' benefit-card--wide' : ''}`;
      card.style.animationDelay = `${i * 45}ms`;
      card.style.animation = 'fade-up 280ms ease both';

      card.innerHTML = `
        <div class="benefit-card__icon benefit-card__icon--${b.cls}">
          <i class="${b.icon}" aria-hidden="true"></i>
        </div>
        <div>
          <h3 class="benefit-card__title">${esc(b.title)}</h3>
          <p  class="benefit-card__desc">${esc(b.desc)}</p>
        </div>
        ${b.soon ? '<span class="benefit-card__soon">Soon</span>' : ''}
      `;
      grid.appendChild(card);
    });
  }

  /* Build plan cards */
  function buildPlans() {
    const grid = $('plansGrid');
    if (!grid) return;
    grid.innerHTML = '';

    PLANS.forEach(plan => {
      const card = document.createElement('div');
      card.className = `plan-card${plan.recommended ? ' plan-card--recommended' : ''}`;

      card.innerHTML = `
        ${plan.recommended ? '<div class="plan-card__ribbon">Best Value</div>' : ''}
        <div>
          <p class="plan-card__period">${esc(plan.period)}</p>
          <div class="plan-card__price">
            <span class="plan-card__currency">₦</span>
            <span class="plan-card__amount">${plan.amount.toLocaleString('en-NG')}</span>
            <span class="plan-card__per">${esc(plan.per)}</span>
          </div>
          ${plan.saving ? `<span class="plan-card__saving">${esc(plan.saving)}</span>` : ''}
        </div>
        <ul class="plan-card__perks">
          ${plan.perks.map(p => `<li><i class="fa-solid fa-check" aria-hidden="true"></i>${esc(p)}</li>`).join('')}
        </ul>
        <button class="plan-card__btn${plan.recommended ? ' plan-card__btn--gold' : ''}"
          data-plan="${plan.key}" type="button">
          <i class="fa-solid fa-crown" aria-hidden="true"></i>
          Select ${plan.period}
        </button>
      `;

      grid.appendChild(card);
    });

    // Plan select listeners
    grid.querySelectorAll('[data-plan]').forEach(btn => {
      btn.addEventListener('click', () => {
        const plan = PLANS.find(p => p.key === btn.dataset.plan);
        if (plan) openPaymentPanel(plan);
      });
    });
  }

  /* Show/hide UI blocks based on user state */
  function applyUserState() {
    const foundingBlock = $('foundingBlock');
    const foundingNote  = $('foundingNote');
    const plansSection  = $('plansSection');
    const activeProCard = $('activeProCard');
    const statusNotice  = $('statusNotice');

    // ── FOUNDER ──────────────────────────────────────────────
    if (S.isFounder) {
      foundingBlock?.removeAttribute('hidden');
      foundingNote?.setAttribute('hidden', '');
      plansSection?.setAttribute('hidden', '');
      activeProCard?.setAttribute('hidden', '');
      return;
    }

    // ── ACTIVE PRO ────────────────────────────────────────────
    if (S.isPro && S.proStatus === 'active') {
      plansSection?.setAttribute('hidden', '');
      activeProCard?.removeAttribute('hidden');
      buildActiveProCard();

      // Wire up Manage button
      $('managePROBtn')?.addEventListener('click', () => {
        buildManagePanel();
        showPanel(panelManage);
      });
      return;
    }

    // ── PENDING ───────────────────────────────────────────────
    if (S.proStatus === 'pending') {
      plansSection?.setAttribute('hidden', '');
      if (statusNotice) {
        statusNotice.innerHTML = buildNotice(
          'clock', 'var(--gold)',
          'PRO Payment Pending',
          'Your payment proof is awaiting admin verification.',
          'View Status'
        );
        statusNotice.querySelector('.notice-btn')?.addEventListener('click', openStatusPanel);
      }
      return;
    }

    // ── REJECTED ──────────────────────────────────────────────
    if (S.proStatus === 'rejected') {
      plansSection?.setAttribute('hidden', '');
      if (statusNotice) {
        statusNotice.innerHTML = buildNotice(
          'circle-xmark', 'var(--red)',
          'PRO Request Rejected',
          'Your payment was rejected. View the reason and resubmit.',
          'View Status'
        );
        statusNotice.querySelector('.notice-btn')?.addEventListener('click', openStatusPanel);
      }
      return;
    }

    // ── DEFAULT ───────────────────────────────────────────────
    foundingNote?.removeAttribute('hidden');
    plansSection?.removeAttribute('hidden');
    activeProCard?.setAttribute('hidden', '');
  }

  function buildNotice(iconName, iconColor, title, sub, btnLabel) {
    return `
      <div style="
        background:var(--surface);border:1px solid rgba(245,158,11,.25);
        border-radius:20px;padding:1.25rem;margin-bottom:2rem;
        display:flex;align-items:flex-start;gap:1rem;
      ">
        <i class="fa-solid fa-${iconName}"
           style="font-size:1.5rem;color:${iconColor};flex-shrink:0;margin-top:2px"
           aria-hidden="true"></i>
        <div style="flex:1">
          <p style="font-family:var(--sans);font-weight:700;font-size:.9375rem;color:var(--text);margin-bottom:4px">
            ${esc(title)}
          </p>
          <p style="font-size:.8125rem;color:var(--text-2);line-height:1.55;margin-bottom:.75rem">
            ${esc(sub)}
          </p>
          <button class="notice-btn" style="
            font-family:var(--sans);font-size:.8125rem;font-weight:600;
            color:var(--gold);background:none;border:none;cursor:pointer;
            padding:0;display:flex;align-items:center;gap:.375rem;
          ">
            ${esc(btnLabel)} <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    `;
  }

  function buildActiveProCard() {
    const sub   = S.proSub || { plan_name:'Monthly', starts_at: new Date().toISOString(), expires_at: new Date(Date.now() + 30 * 86400000).toISOString() };
    const label = $('activeProPlanLabel');
    if (label) label.textContent = sub.plan_name + ' Plan';

    const details = $('activeProDetails');
    if (!details) return;
    details.innerHTML = '';

    [
      { k:'Plan',     v: sub.plan_name || 'Monthly' },
      { k:'Status',   v:'Active', green:true },
      { k:'Activated',v: fmtDate(sub.starts_at) },
      { k:'Renewal',  v: fmtDate(sub.expires_at) },
    ].forEach(row => {
      const el = document.createElement('div');
      el.className = 'active-pro-card__row';
      el.innerHTML = `
        <span class="active-pro-card__key">${esc(row.k)}</span>
        <span class="active-pro-card__val${row.green ? '" style="color:var(--green)' : ''}">${esc(row.v)}</span>
      `;
      details.appendChild(el);
    });
  }


  /* ==========================================================
     7. PLAN SELECTION → PAYMENT PANEL
  ========================================================== */

  function openPaymentPanel(plan) {
    S.selectedPlan = plan;

    const lbl = $('paymentPlanLabel');
    const amt = $('bankAmount');
    const ap  = $('amountPaid');

    if (lbl) lbl.textContent = `${plan.period} — ${plan.display}`;
    if (amt) amt.textContent  = plan.display;
    if (ap)  ap.value         = plan.amount;

    hideAlert();
    resetForm();
    showPanel(panelPayment);
  }

  function resetForm() {
    const txRef = $('txRef');
    if (txRef) txRef.value = '';
    S.screenshotFile = null;
    const ui = $('uploadInner');
    if (ui) {
      ui.innerHTML = `
        <i class="fa-solid fa-cloud-arrow-up upload-area__icon" aria-hidden="true"></i>
        <p class="upload-area__text">Tap to upload screenshot</p>
        <p class="upload-area__hint">JPG, PNG — max 5 MB</p>
      `;
    }
    $('uploadArea')?.classList.remove('has-file');
  }


  /* ==========================================================
     8. COPY ACCOUNT NUMBER
  ========================================================== */

  $('copyAccBtn')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(ACCOUNT.number);
      const btn = $('copyAccBtn');
      btn.classList.add('is-copied');
      btn.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i>';
      setTimeout(() => {
        btn.classList.remove('is-copied');
        btn.innerHTML = '<i class="fa-regular fa-copy" aria-hidden="true"></i>';
      }, 2200);
    } catch {
      showToast('Copy failed — number: ' + ACCOUNT.number);
    }
  });


  /* ==========================================================
     9. SCREENSHOT UPLOAD
  ========================================================== */

  $('screenshot')?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showAlert('Screenshot is too large. Maximum size is 5 MB.');
      e.target.value = '';
      return;
    }

    S.screenshotFile = file;
    $('uploadArea')?.classList.add('has-file');

    const reader = new FileReader();
    reader.onload = ev => {
      const ui = $('uploadInner');
      if (ui) ui.innerHTML = `
        <img class="upload-area__preview" src="${ev.target.result}" alt="Payment screenshot preview" />
        <p class="upload-area__hint" style="margin-top:.5rem">Tap to change</p>
      `;
    };
    reader.readAsDataURL(file);
  });


  /* ==========================================================
     10. PAYMENT SUBMISSION
  ========================================================== */

  $('submitPayBtn')?.addEventListener('click', async () => {
    hideAlert();

    const ref    = $('txRef')?.value.trim()            || '';
    const amount = parseFloat($('amountPaid')?.value   || '0');

    if (!ref || ref.length < 5) {
      showAlert('Please enter your transaction reference. Find it in OPay under Transaction Details.');
      $('txRef')?.focus();
      return;
    }

    if (!amount || amount <= 0) {
      showAlert('Please enter the exact amount you transferred.');
      $('amountPaid')?.focus();
      return;
    }

    if (!S.screenshotFile) {
      showAlert('Please upload your payment screenshot as proof of payment.');
      return;
    }

    if (!S.userId) {
      showAlert('Please log in before submitting your payment.');
      return;
    }

    setLoading(true);

    try {
      /*
       FUTURE: Upload screenshot to Supabase Storage bucket 'payment-proofs':

         const ext      = S.screenshotFile.name.split('.').pop();
         const path     = `pro/${S.userId}/${Date.now()}.${ext}`;
         const { error: uploadErr } = await window._supabase.storage
           .from('payment-proofs').upload(path, S.screenshotFile);
         if (uploadErr) throw new Error(uploadErr.message);

         const { data: { publicUrl } } = window._supabase.storage
           .from('payment-proofs').getPublicUrl(path);

       FUTURE: Insert pending PRO request to premium_subscriptions table:

         const expiryDays = S.selectedPlan.key === 'yearly' ? 365 : 30;
         const { error: dbErr } = await window._supabase
           .from('premium_subscriptions')
           .insert({
             user_id:         S.userId,
             plan_name:       S.selectedPlan.period,
             amount_paid:     amount,
             currency:        'NGN',
             payment_ref:     ref,
             screenshot_url:  publicUrl,
             payment_gateway: 'manual_opay',
             status:          'pending',
             starts_at:       new Date().toISOString(),
             expires_at:      new Date(Date.now() + expiryDays * 86400000).toISOString(),
           });
         if (dbErr) throw new Error(dbErr.message);

       FUTURE: Flag profile as having a pending PRO request:

         await window._supabase.from('profiles')
           .update({ has_pending_pro: true })
           .eq('id', S.userId);

       ─────────────────────────────────────────────────────────
       ADMIN DASHBOARD CONNECTION
       The inserted record above will then appear in:
         Admin → JARA PRO → Pending Requests
       Displaying:
         Business ID   → user_id
         Business Name → from profiles join
         Plan          → plan_name
         Amount        → amount_paid
         Reference     → payment_ref
         Screenshot    → screenshot_url
       Admin can then Approve or Reject from the dashboard.
       ─────────────────────────────────────────────────────────
      */

      // Simulate network delay for placeholder behaviour
      await new Promise(r => setTimeout(r, 1400));

      S.submittedRef = ref;
      const sr = $('submittedRef');
      if (sr) sr.textContent = ref;

      setLoading(false);
      showPanel(panelSubmitted);

    } catch (err) {
      console.error('JARA PRO submit:', err);
      showAlert('Something went wrong. Please try again.');
      setLoading(false);
    }
  });

  function setLoading(on) {
    const btn = $('submitPayBtn');
    if (!btn) return;
    btn.disabled = on;
    btn.setAttribute('aria-busy', String(on));
    btn.classList.toggle('is-loading', on);
  }

  function showAlert(msg) {
    const el = $('payAlert');
    const tx = $('payAlertText');
    if (!el || !tx) return;
    tx.textContent = msg;
    el.removeAttribute('hidden');
    el.scrollIntoView({ behavior:'smooth', block:'nearest' });
  }

  function hideAlert() {
    $('payAlert')?.setAttribute('hidden', '');
  }

  $('txRef')?.addEventListener('input', hideAlert);
  $('amountPaid')?.addEventListener('input', hideAlert);


  /* ==========================================================
     11. STATUS PANEL
  ========================================================== */

  function openStatusPanel() {
    buildStatusPanel();
    showPanel(panelStatus);
  }

  function buildStatusPanel() {
    /*
     FUTURE: SELECT * FROM premium_subscriptions
             WHERE user_id = auth.uid()
             ORDER BY created_at DESC LIMIT 1
    */
    const sub = S.proSub || {
      status:           'pending',
      plan_name:        'Monthly',
      amount_paid:      2500,
      payment_ref:      S.submittedRef || 'OPY240128xxxxx',
      created_at:       new Date().toISOString(),
      rejection_reason: null,
    };

    const card  = $('statusCard');
    const icon  = $('statusIcon');
    const label = $('statusLabel');
    const date  = $('statusDate');
    const rows  = $('statusRows');
    const rej   = $('rejectionBlock');
    const rr    = $('rejectionReason');

    if (card) card.className = `status-card status-card--${sub.status}`;

    const icons  = { pending:'fa-clock', approved:'fa-circle-check', rejected:'fa-circle-xmark' };
    const labels = { pending:'Pending Verification', approved:'PRO Activated', rejected:'Payment Rejected' };

    if (icon)  icon.innerHTML   = `<i class="fa-solid ${icons[sub.status] || 'fa-clock'}" aria-hidden="true"></i>`;
    if (label) label.textContent = labels[sub.status] || sub.status;
    if (date)  date.textContent  = 'Submitted ' + fmtDate(sub.created_at);

    if (rows) {
      rows.innerHTML = '';
      [
        { k:'Plan',       v: sub.plan_name },
        { k:'Amount',     v: sub.amount_paid ? `₦${Number(sub.amount_paid).toLocaleString('en-NG')}` : '—' },
        { k:'Reference',  v: sub.payment_ref || '—' },
        { k:'Status',     v: labels[sub.status] || sub.status },
      ].forEach(f => {
        const el = document.createElement('div');
        el.className = 'status-card__field';
        el.innerHTML = `
          <span class="status-card__key">${esc(f.k)}</span>
          <span class="status-card__val">${esc(f.v)}</span>
        `;
        rows.appendChild(el);
      });
    }

    if (rej && rr) {
      if (sub.status === 'rejected') {
        rr.textContent = sub.rejection_reason || 'No reason provided.';
        rej.removeAttribute('hidden');
      } else {
        rej.setAttribute('hidden', '');
      }
    }
  }

  $('checkStatusBtn')?.addEventListener('click', openStatusPanel);
  $('backFromStatus')?.addEventListener('click', () => showPanel(panelLanding));
  $('resubmitBtn')?.addEventListener('click', () => {
    if (S.selectedPlan) {
      openPaymentPanel(S.selectedPlan);
    } else {
      showPanel(panelLanding);
    }
  });


  /* ==========================================================
     12. MANAGE PRO PANEL
  ========================================================== */

  function buildManagePanel() {
    /*
     FUTURE: SELECT * FROM premium_subscriptions
             WHERE user_id = auth.uid() AND status = 'active'
             LIMIT 1
    */
    const sub = S.proSub || {
      plan_name:   'Monthly',
      status:      'active',
      starts_at:   new Date().toISOString(),
      expires_at:  new Date(Date.now() + 30 * 86400000).toISOString(),
      amount_paid: 2500,
    };

    const card = $('manageCard');
    if (!card) return;
    card.innerHTML = '';

    [
      { k:'Current Plan', v: sub.plan_name,   gold: false, green: false },
      { k:'Status',       v: 'Active',         gold: false, green: true  },
      { k:'Activated',    v: fmtDate(sub.starts_at) },
      { k:'Renewal Date', v: fmtDate(sub.expires_at) },
      { k:'Amount Paid',  v: sub.amount_paid ? `₦${Number(sub.amount_paid).toLocaleString('en-NG')}` : '—', gold: true },
    ].forEach(row => {
      const el = document.createElement('div');
      el.className = 'manage-row';
      el.innerHTML = `
        <span class="manage-row__key">${esc(row.k)}</span>
        <span class="manage-row__val${row.green ? ' manage-row__val--green' : row.gold ? ' manage-row__val--gold' : ''}">
          ${esc(row.v)}
        </span>
      `;
      card.appendChild(el);
    });
  }

  $('backFromManage')?.addEventListener('click', () => showPanel(panelLanding));


  /* ==========================================================
     13. NAVIGATION HELPERS
  ========================================================== */

  $('backBtn')?.addEventListener('click', () => {
    if (history.length > 1) history.back();
    else window.location.href = '../explore/index.html';
  });

  $('backToPlans')?.addEventListener('click', () => showPanel(panelLanding));


  /* ==========================================================
     14. UTILITIES
  ========================================================== */

  function esc(str) {
    if (!str && str !== 0) return '';
    const d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
  }

  function fmtDate(iso) {
    try {
      return new Date(iso).toLocaleDateString('en-NG', {
        day:'numeric', month:'short', year:'numeric',
      });
    } catch { return '—'; }
  }

  function showToast(msg) {
    const ex = document.getElementById('proToast');
    if (ex) ex.remove();
    const t = document.createElement('div');
    t.id = 'proToast';
    t.textContent = msg;
    Object.assign(t.style, {
      position:'fixed', bottom:'24px', left:'50%',
      transform:'translateX(-50%) translateY(8px)',
      background:'var(--surface-2)', border:'1px solid var(--border)',
      borderRadius:'var(--r-full)', padding:'10px 20px',
      fontFamily:'var(--sans)', fontSize:'.875rem', fontWeight:'600',
      color:'var(--text)', zIndex:'200',
      boxShadow:'0 8px 32px rgba(0,0,0,.4)',
      transition:'opacity 300ms ease, transform 300ms ease',
      opacity:'0', whiteSpace:'nowrap',
    });
    document.body.appendChild(t);
    requestAnimationFrame(() => {
      t.style.opacity   = '1';
      t.style.transform = 'translateX(-50%) translateY(0)';
    });
    setTimeout(() => {
      t.style.opacity   = '0';
      t.style.transform = 'translateX(-50%) translateY(8px)';
      setTimeout(() => t.remove(), 320);
    }, 2500);
  }


  /* ==========================================================
     15. INIT
  ========================================================== */

  async function init() {
    await loadUser();
    renderLanding();
    showPanel(panelLanding);
  }

  init();

});
