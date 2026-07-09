/* ============================================================
   JARA ∆ — Launch Polish  (global JS additions)
   js/jara-polish.js

   Load on EVERY page after all other scripts:
   <script src="../js/jara-polish.js"></script>

   TABLE OF CONTENTS
   1.  Founding Member badge + modal          (profile page)
   2.  Founding Member section injection      (landing page)
   3.  Universal empty state helper
   4.  Universal error state helper
   5.  Universal skeleton helpers
   6.  Shared toast
   7.  Micro-animation init
   8.  Auto-init
============================================================ */

(function () {
  'use strict';


  /* ==========================================================
     UTILITIES
  ========================================================== */

  function esc(str) {
    if (!str && str !== 0) return '';
    const d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
  }


  /* ==========================================================
     1. FOUNDING MEMBER BADGE + MODAL
     Injected into .profile-badges (profile page)
     and .seller-badges / .store-badges if present.

     Uses the same placeholder flag as premium.js:
       window.__JARA_IS_FOUNDER = true | false
     Set this from supabase-client.js or profile.js once
     the real session loads.

     FUTURE: Read from profiles.is_founding_member
  ========================================================== */

  function initFoundingBadge() {
    /*
     FUTURE: Replace window.__JARA_IS_FOUNDER with a real check:
       const { data } = await window._supabase
         .from('profiles')
         .select('is_founding_member')
         .eq('id', session.user.id)
         .single();
       isFounder = data?.is_founding_member ?? false;
    */
    const isFounder = window.__JARA_IS_FOUNDER === true;
    if (!isFounder) return;

    // Find containers where the badge should appear
    const targets = [
      document.getElementById('profileBadges'),
      document.getElementById('sellerBadges'),
      document.getElementById('storeBadges'),
    ].filter(Boolean);

    targets.forEach(container => {
      // Don't add twice
      if (container.querySelector('.founding-badge')) return;

      container.removeAttribute('hidden');

      const badge = document.createElement('button');
      badge.type      = 'button';
      badge.className = 'founding-badge';
      badge.setAttribute('aria-label', 'Founding Member — tap to learn more');
      badge.innerHTML = `
        <i class="fa-solid fa-trophy" aria-hidden="true"
           style="font-size:.625rem;color:#F59E0B"></i>
        Founding Member '26
      `;

      badge.addEventListener('click', openFoundingModal);
      container.prepend(badge);
    });
  }

  function openFoundingModal() {
    let modal = document.getElementById('jaraFoundingModal');

    if (!modal) {
      modal = document.createElement('div');
      modal.id        = 'jaraFoundingModal';
      modal.className = 'founding-modal';
      modal.setAttribute('role',       'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-label', 'Founding Member details');
      modal.innerHTML = `
        <div class="founding-modal__backdrop" id="foundingModalBackdrop"></div>
        <div class="founding-modal__panel">
          <div class="founding-modal__handle" aria-hidden="true"></div>
          <div class="founding-modal__trophy" aria-hidden="true">🏆</div>
          <h2 class="founding-modal__title">Founding Member</h2>
          <p class="founding-modal__body">
            You were among the <strong>first 100 verified members</strong>
            to join JARA.<br /><br />
            Your account permanently includes
            <strong>Lifetime JARA PRO</strong> and every future
            JARA PRO feature — at no additional cost.
          </p>
          <div class="founding-modal__pill">
            <i class="fa-solid fa-crown" aria-hidden="true"></i>
            Lifetime JARA PRO
          </div>
          <button class="founding-modal__close" id="foundingModalClose" type="button">
            Close
          </button>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById('foundingModalBackdrop')?.addEventListener('click', closeFoundingModal);
      document.getElementById('foundingModalClose')?.addEventListener('click', closeFoundingModal);

      document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeFoundingModal();
      });
    }

    modal.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeFoundingModal() {
    const modal = document.getElementById('jaraFoundingModal');
    if (modal) {
      modal.setAttribute('hidden', '');
      document.body.style.overflow = '';
    }
  }


  /* ==========================================================
     2. FOUNDING MEMBER SECTION — LANDING PAGE
     Auto-injected into index.html before the CTA / footer.

     FUTURE: Replace foundingCount with a real Supabase query:
       const { count } = await window._supabase
         .from('profiles')
         .select('id', { count: 'exact', head: true })
         .eq('is_founding_member', true);
  ========================================================== */

  function injectFoundingSection() {
    // Only runs on the main landing page
    const path = window.location.pathname;
    const isLanding =
      (path === '/' ||
       path.endsWith('/index.html') ||
       path.endsWith('/jara/') ||
       path.endsWith('/jara/index.html')) &&
      !path.includes('/admin') &&
      !path.includes('/premium') &&
      !path.includes('/auth') &&
      !path.includes('/onboarding') &&
      !path.includes('/pages');

    if (!isLanding) return;

    // Don't inject twice
    if (document.getElementById('jaraFoundingSection')) return;

    // Find anchor — insert before the final CTA or footer
    const anchor =
      document.querySelector('.cta-section') ||
      document.querySelector('footer') ||
      document.querySelector('.landing-footer') ||
      document.body.lastElementChild;

    if (!anchor) return;

    const FOUNDING_USED  = 3;   // FUTURE: real count from Supabase
    const FOUNDING_TOTAL = 100;
    const pct            = Math.round((FOUNDING_USED / FOUNDING_TOTAL) * 100);
    const remaining      = FOUNDING_TOTAL - FOUNDING_USED;

    const section = document.createElement('section');
    section.id        = 'jaraFoundingSection';
    section.className = 'founding-lp-section';
    section.setAttribute('aria-labelledby', 'foundingLpTitle');

    section.innerHTML = `
      <div class="founding-lp-card">

        <div class="founding-lp-card__trophy" aria-hidden="true">🏆</div>

        <p class="founding-lp-card__tag">Limited Programme</p>

        <h2 class="founding-lp-card__title" id="foundingLpTitle">
          Become a<br /><span>Founding Member</span>
        </h2>

        <p class="founding-lp-card__desc">
          The first <strong style="color:#FCD34D">100 verified JARA members</strong>
          will permanently receive <strong style="color:#FCD34D">Lifetime JARA PRO</strong>
          — every current and future PRO feature at no additional cost.
        </p>

        <!-- Slot counter -->
        <div class="founding-lp-card__counter"
             aria-label="${FOUNDING_USED} of ${FOUNDING_TOTAL} slots claimed">
          <div class="founding-lp-card__counter-nums">
            <span class="founding-lp-card__counter-current">${FOUNDING_USED}</span>
            <span class="founding-lp-card__counter-sep">/</span>
            <span class="founding-lp-card__counter-total">${FOUNDING_TOTAL}</span>
          </div>
          <span class="founding-lp-card__counter-label">Founding Members</span>
        </div>

        <!-- Progress bar -->
        <div class="founding-lp-card__bar"
             role="progressbar"
             aria-valuenow="${FOUNDING_USED}"
             aria-valuemin="0"
             aria-valuemax="${FOUNDING_TOTAL}"
             aria-label="${pct}% of founding slots claimed">
          <div class="founding-lp-card__bar-track">
            <div class="founding-lp-card__bar-fill"
                 id="foundingLpFill"
                 style="width:0%"></div>
          </div>
          <div class="founding-lp-card__bar-label">
            <span>${FOUNDING_USED} claimed</span>
            <span>${remaining} remaining</span>
          </div>
        </div>

        <!-- CTA button — JS wires up the correct destination -->
        <button class="founding-lp-card__btn" id="foundingClaimBtn" type="button">
          <i class="fa-solid fa-crown" aria-hidden="true"></i>
          Claim Your Spot
        </button>

        <p class="founding-lp-card__fine">
          Create a free JARA account and complete verification
          to qualify for Founding Member status.
        </p>

      </div>
    `;

    anchor.parentNode?.insertBefore(section, anchor);

    // Animate progress bar fill after paint
    requestAnimationFrame(() => {
      setTimeout(() => {
        const fill = document.getElementById('foundingLpFill');
        if (fill) fill.style.width = pct + '%';
      }, 300);
    });

    // ── Wire up the Claim Your Spot button ─────────────────────
    // If logged in  → onboarding / verification flow
    // If logged out → sign up page
    // Never leads to a 404.
    const claimBtn = document.getElementById('foundingClaimBtn');
    if (claimBtn) {
      claimBtn.addEventListener('click', async () => {
        try {
          // Determine correct base path (root vs /jara/ subdirectory)
          const base = getBasePath();

          if (window._supabase) {
            const { data: { session } } = await window._supabase.auth.getSession();
            if (session) {
              // Already logged in — send to onboarding / verification
              window.location.href = base + 'onboarding/index.html';
            } else {
              // Not logged in — send to sign up
              window.location.href = base + 'auth/signup.html';
            }
          } else {
            // Supabase not available — default to sign up
            window.location.href = base + 'auth/signup.html';
          }
        } catch {
          // Any error — safe fallback to sign up
          window.location.href = getBasePath() + 'auth/signup.html';
        }
      });
    }
  }

  /**
   * Works out the correct root path whether the site is hosted at:
   *   /              (e.g. custom domain)
   *   /jara/         (e.g. GitHub Pages with repo name)
   */
  function getBasePath() {
    const path = window.location.pathname;

    // GitHub Pages with repo subfolder, e.g. /jara/index.html
    const match = path.match(/^(\/[^/]+\/)/);
    if (match && match[1] !== '/') {
      // Check if the first segment looks like a repo name (not a page folder)
      const segment = match[1].replace(/\//g, '');
      const pageFolders = ['auth','admin','premium','explore','search','sell',
                           'activity','profile','store','listing','onboarding','pages'];
      if (!pageFolders.includes(segment)) {
        return match[1]; // e.g. /jara/
      }
    }

    return '/'; // root deployment
  }


  /* ==========================================================
     3. UNIVERSAL EMPTY STATE HELPER
     window.jaraEmpty(container, config)

     config = {
       icon:      'fa-solid fa-box-open',
       title:     'No listings yet',
       body:      'Create your first listing and get discovered.',
       btnLabel:  'Create Listing',     // optional
       btnHref:   '/sell/index.html',   // optional
       btnAction: fn,                   // optional — overrides href
     }
  ========================================================== */

  window.jaraEmpty = function (container, config) {
    if (!container) return;

    const c = config || {};
    const hasBtn = c.btnLabel && (c.btnHref || c.btnAction);

    container.innerHTML = `
      <div class="j-empty" role="status">
        <div class="j-empty__icon" aria-hidden="true">
          <i class="${esc(c.icon || 'fa-solid fa-box-open')}"></i>
        </div>
        <p class="j-empty__title">${esc(c.title || 'Nothing here yet')}</p>
        <p class="j-empty__body">${esc(c.body  || '')}</p>
        ${hasBtn
          ? c.btnHref
            ? `<a href="${esc(c.btnHref)}" class="j-empty__btn">
                 <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
                 ${esc(c.btnLabel)}
               </a>`
            : `<button class="j-empty__btn j-empty-action-btn" type="button">
                 <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
                 ${esc(c.btnLabel)}
               </button>`
          : ''
        }
      </div>
    `;

    if (c.btnAction) {
      const btn = container.querySelector('.j-empty-action-btn');
      btn?.addEventListener('click', c.btnAction);
    }
  };


  /* ==========================================================
     4. UNIVERSAL ERROR STATE HELPER
     window.jaraError(container, config)

     config = {
       title:   "Couldn't load this",
       body:    'Please check your connection and try again.',
       onRetry: fn,   // optional
     }
  ========================================================== */

  window.jaraError = function (container, config) {
    if (!container) return;

    const c = config || {};

    container.innerHTML = `
      <div class="j-error" role="alert">
        <div class="j-error__icon" aria-hidden="true">
          <i class="fa-solid fa-triangle-exclamation"></i>
        </div>
        <p class="j-error__title">${esc(c.title || "We couldn't load this right now")}</p>
        <p class="j-error__body">${esc(c.body  || 'Please check your connection and try again.')}</p>
        ${c.onRetry
          ? `<button class="j-error__btn j-error-retry-btn" type="button">
               <i class="fa-solid fa-rotate-right" aria-hidden="true"></i>
               Try Again
             </button>`
          : ''
        }
      </div>
    `;

    if (c.onRetry) {
      const btn = container.querySelector('.j-error-retry-btn');
      btn?.addEventListener('click', c.onRetry);
    }
  };


  /* ==========================================================
     5. UNIVERSAL SKELETON HELPERS
     window.jaraSkel(el)    — add shimmer
     window.jaraUnskel(el)  — remove shimmer
  ========================================================== */

  window.jaraSkel = function (el) {
    if (el) el.classList.add('j-skel');
  };

  window.jaraUnskel = function (el) {
    if (el) el.classList.remove('j-skel');
  };


  /* ==========================================================
     6. SHARED TOAST
     window.jaraToast(message, duration?)
  ========================================================== */

  window.jaraToast = function (message, duration) {
    const existing = document.getElementById('jaraToast');
    if (existing) existing.remove();

    const ms = duration || 2500;

    const toast = document.createElement('div');
    toast.id          = 'jaraToast';
    toast.textContent = message;
    Object.assign(toast.style, {
      opacity:   '0',
      transform: 'translateX(-50%) translateY(8px)',
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
    }, ms);
  };


  /* ==========================================================
     7. MICRO-ANIMATION INIT
     Attaches .j-btn press and .j-card hover lift classes
     to matching elements without overriding existing transitions.
  ========================================================== */

  function initMicroAnimations() {
    // Button press feedback
    const btnSelectors = [
      '.btn-submit-pay',
      '.plan-card__btn',
      '.btn-explore',
      '.btn-go-explore',
      '.founding-lp-card__btn',
      '.store-action-btn--primary',
      '.sticky-cta__btn',
      '.contact-btn--whatsapp',
      '.a-btn--primary',
      '.btn-submit',
      '.j-empty__btn',
    ];

    document.querySelectorAll(btnSelectors.join(',')).forEach(btn => {
      btn.classList.add('j-btn');
    });

    // Card hover lift
    const cardSelectors = [
      '.listing-mini',
      '.similar-card',
      '.compact-card',
      '.store-card',
      '.plan-card',
      '.benefit-card',
      '.kpi-card',
      '.stat-card',
      '.health-item',
    ];

    document.querySelectorAll(cardSelectors.join(',')).forEach(card => {
      card.classList.add('j-card');
    });

    // Tab and chip animation
    document.querySelectorAll(
      '.content-tab, .ac-tab, .tab, .filter-chip, .notif-filter, .chip'
    ).forEach(tab => {
      tab.classList.add('j-tab-btn');
      tab.classList.add('j-chip');
    });

    // Search input glow
    document.querySelectorAll(
      '.field__input-wrap, .a-search-wrap, .admin-search'
    ).forEach(wrap => {
      wrap.classList.add('j-search-wrap');
    });

    document.querySelectorAll(
      '.field__input, .a-search, .admin-search__input'
    ).forEach(input => {
      input.classList.add('j-search-input');
    });
  }


  /* ==========================================================
     8. AUTO-INIT
  ========================================================== */

  function init() {
    initFoundingBadge();
    injectFoundingSection();
    initMicroAnimations();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-apply when new content is dynamically injected
  const observer = new MutationObserver(() => {
    initMicroAnimations();
    initFoundingBadge();
  });

  observer.observe(document.body, { childList: true, subtree: true });

})();
