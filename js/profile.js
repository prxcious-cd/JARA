/* ============================================================
   JARA ∆ — Profile Page  (profile-integrated)
   js/profile.js

   Depends on:
     - window._supabase    (supabase-client.js — loaded in <head>)
     - window.JARAAuth     (auth-guard.js)
     - window.JARAProfile  (jara-profile.js)
     - HTML IDs in profile/index.html

   All getElementById calls verified against profile/index.html.
============================================================ */

document.addEventListener('DOMContentLoaded', async () => {

  /* ==========================================================
     DOM REFS — every ID verified against profile/index.html
  ========================================================== */

  // Avatar
  const avatarSkeleton  = document.getElementById('profileAvatarSkeleton');
  const avatarEl        = document.getElementById('profileAvatarEl');
  const proRing         = document.getElementById('proRing');

  // Name / identity
  const nameSkeleton    = document.getElementById('nameSkeleton');
  const subSkeleton     = document.getElementById('subSkeleton');
  const profileName     = document.getElementById('profileName');
  const profileSub      = document.getElementById('profileSub');
  const verifiedMark    = document.getElementById('verifiedMark');
  const profileBadges   = document.getElementById('profileBadges');

  // Context + bio
  const profileContext  = document.getElementById('profileContext');
  const profileSchool   = document.getElementById('profileSchool');
  const profileJoined   = document.getElementById('profileJoined');
  const profileBio      = document.getElementById('profileBio');

  // Action buttons
  const editProfileBtn  = document.getElementById('editProfileBtn');
  const upgradeBtn      = document.getElementById('upgradeBtn');

  // Stats
  const statListings    = document.getElementById('statListings');
  const statRequests    = document.getElementById('statRequests');
  const statReplies     = document.getElementById('statReplies');
  const statSaved       = document.getElementById('statSaved');
  const statViews       = document.getElementById('statViews');

  // Tabs
  const tabListings     = document.getElementById('tabListings');
  const tabRequests     = document.getElementById('tabRequests');
  const tabReplies      = document.getElementById('tabReplies');
  const panelListings   = document.getElementById('panelListings');
  const panelRequests   = document.getElementById('panelRequests');
  const panelReplies    = document.getElementById('panelReplies');

  // Content grids
  const listingsGrid    = document.getElementById('listingsGrid');
  const requestsList    = document.getElementById('requestsList');
  const repliesList     = document.getElementById('repliesList');

  // Settings
  const verificationSub = document.getElementById('verificationSub');
  const logoutBtn       = document.getElementById('logoutBtn');


  /* ==========================================================
     SKELETON HELPERS
  ========================================================== */

  function showSkeletons() {
    avatarSkeleton?.classList.remove('skeleton-pulse--hidden');
    nameSkeleton?.classList.remove('profile-skeleton--hidden');
    subSkeleton?.classList.remove('profile-skeleton--hidden');
  }

  function hideSkeletons() {
    // Hide skeleton elements
    if (avatarSkeleton) avatarSkeleton.style.display = 'none';
    if (nameSkeleton)   nameSkeleton.style.display   = 'none';
    if (subSkeleton)    subSkeleton.style.display     = 'none';

    // Show real content
    if (avatarEl)    avatarEl.classList.remove('profile-avatar--hidden');
    if (profileName) profileName.classList.remove('profile-name--hidden');
    if (profileSub)  profileSub.classList.remove('profile-sub--hidden');
  }


  /* ==========================================================
     RENDER PROFILE
     Maps every profile field to the correct HTML element.
  ========================================================== */

  function renderProfile(profile) {
    /* ---- Avatar ---- */
    const avatarUrl  = JARAProfile.getAvatarUrl(profile);
    const initials   = JARAProfile.getInitials(profile);
    const displayName = JARAProfile.getDisplayName(profile);

    if (avatarEl) {
      if (avatarUrl) {
        avatarEl.innerHTML = `
          <img
            src="${esc(avatarUrl)}"
            alt="${esc(displayName)}"
            style="width:100%;height:100%;object-fit:cover;border-radius:50%"
          />`;
      } else {
        avatarEl.textContent = initials;
      }
    }

    /* ---- PRO ring ---- */
    if (proRing) {
      proRing.hidden = !JARAProfile.isPro(profile);
    }

    /* ---- Name ---- */
    if (profileName) {
      profileName.textContent = displayName || 'JARA Member';
    }

    /* ---- Sub (username + account type) ---- */
    if (profileSub) {
      const parts = [];
      if (profile.username)     parts.push('@' + profile.username);
      if (profile.account_type) parts.push(cap(profile.account_type));
      profileSub.textContent = parts.join(' · ');
    }

    /* ---- Verified mark ---- */
    if (verifiedMark) {
      verifiedMark.hidden = !profile.is_verified;
    }

    /* ---- Badges ---- */
    if (profileBadges) {
      profileBadges.innerHTML = '';
      const badges = [];

      if (JARAProfile.isFounder(profile)) {
        badges.push(`
          <span class="profile-badge profile-badge--founding"
                id="foundingBadgeBtn"
                role="button"
                tabindex="0"
                aria-label="Founding Member — tap to learn more">
            🏆 Founding Member '26
          </span>
        `);
      }

      if (JARAProfile.isPro(profile)) {
        badges.push(`
          <span class="profile-badge profile-badge--pro">
            <i class="fa-solid fa-crown" aria-hidden="true"></i> PRO
          </span>
        `);
      }

      if (badges.length > 0) {
        profileBadges.innerHTML = badges.join('');
        profileBadges.removeAttribute('hidden');

        // Wire founding badge modal via jara-polish.js
        window.__JARA_IS_FOUNDER = JARAProfile.isFounder(profile);
        window.__JARA_IS_PRO     = JARAProfile.isPro(profile);

        // Founding badge tap → open modal
        const foundingBtn = document.getElementById('foundingBadgeBtn');
        foundingBtn?.addEventListener('click', () => {
          window.openFoundingModal?.();
        });
        foundingBtn?.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') window.openFoundingModal?.();
        });
      }
    }

    /* ---- School + Joined ---- */
    if (profileSchool) {
      const schoolSpan = profileSchool.querySelector('span');
      if (schoolSpan) schoolSpan.textContent = profile.school || '';
      profileSchool.style.display = profile.school ? '' : 'none';
    }

    if (profileJoined) {
      const joinedSpan = profileJoined.querySelector('span');
      if (joinedSpan && profile.created_at) {
        joinedSpan.textContent = 'Joined ' + fmtDate(profile.created_at);
      }
    }

    if (profileContext) {
      profileContext.removeAttribute('hidden');
    }

    /* ---- Bio ---- */
    if (profileBio) {
      if (profile.bio) {
        profileBio.textContent = profile.bio;
        profileBio.removeAttribute('hidden');
      } else {
        profileBio.setAttribute('hidden', '');
      }
    }

    /* ---- Verification status in settings ---- */
    if (verificationSub) {
      verificationSub.textContent = profile.is_verified
        ? 'Verified ✓'
        : 'Not yet verified';
    }

    /* ---- Upgrade button — hide if already PRO or founder ---- */
    if (upgradeBtn) {
      upgradeBtn.hidden = JARAProfile.isPro(profile) || JARAProfile.isFounder(profile);
      upgradeBtn.href   = '../premium/index.html';
    }

    /* ---- Edit profile button ---- */
    if (editProfileBtn) {
      editProfileBtn.href = '#edit-profile';
    }
  }


  /* ==========================================================
     LOAD STATS
     Counts listings, requests, replies from Supabase.
  ========================================================== */

  async function loadStats(userId) {
    /*
     FUTURE: Run these counts in parallel:

       const [listingsRes, requestsRes, repliesRes, savedRes] =
         await Promise.all([
           window._supabase.from('listings')
             .select('id', { count: 'exact', head: true })
             .eq('owner_id', userId)
             .eq('status', 'active'),

           window._supabase.from('requests')
             .select('id', { count: 'exact', head: true })
             .eq('owner_id', userId),

           window._supabase.from('replies')       -- if table exists
             .select('id', { count: 'exact', head: true })
             .eq('responder_id', userId),

           window._supabase.from('favorites')
             .select('id', { count: 'exact', head: true })
             .eq('user_id', userId),
         ]);

       if (statListings) statListings.textContent = listingsRes.count ?? 0;
       if (statRequests) statRequests.textContent = requestsRes.count ?? 0;
       if (statReplies)  statReplies.textContent  = repliesRes.count  ?? 0;
       if (statSaved)    statSaved.textContent    = savedRes.count    ?? 0;
    */

    // Placeholder counts until listings integration is confirmed
    if (statListings) statListings.textContent = '0';
    if (statRequests) statRequests.textContent = '0';
    if (statReplies)  statReplies.textContent  = '0';
    if (statSaved)    statSaved.textContent    = '0';
    if (statViews)    statViews.textContent    = '0';

    // Remove skeleton pulse from stat values
    [statListings, statRequests, statReplies, statSaved, statViews]
      .forEach(el => el?.classList.remove('skeleton-pulse'));
  }


  /* ==========================================================
     LOAD CONTENT TABS
  ========================================================== */

  function loadListingsTab(userId) {
    if (!listingsGrid) return;

    /*
     FUTURE: SELECT * FROM listings
             WHERE owner_id = userId
             ORDER BY created_at DESC
    */

    if (window.jaraEmpty) {
      window.jaraEmpty(listingsGrid, {
        icon:     'fa-solid fa-box-open',
        title:    'No listings yet',
        body:     'Create your first listing and start selling on campus.',
        btnLabel: 'Create Listing',
        btnHref:  '../sell/index.html',
      });
    }
  }

  function loadRequestsTab(userId) {
    if (!requestsList) return;

    /*
     FUTURE: SELECT * FROM requests
             WHERE owner_id = userId
             ORDER BY created_at DESC
    */

    if (window.jaraEmpty) {
      window.jaraEmpty(requestsList, {
        icon:  'fa-solid fa-bullhorn',
        title: 'No requests yet',
        body:  'Post a request when you need something on campus.',
      });
    }
  }

  function loadRepliesTab(userId) {
    if (!repliesList) return;

    /*
     FUTURE: SELECT r.*, req.title AS request_title
             FROM replies r
             JOIN requests req ON req.id = r.request_id
             WHERE r.responder_id = userId
             ORDER BY r.created_at DESC
    */

    if (window.jaraEmpty) {
      window.jaraEmpty(repliesList, {
        icon:  'fa-solid fa-reply',
        title: 'No replies yet',
        body:  'Your replies to campus requests will appear here.',
      });
    }
  }


  /* ==========================================================
     TAB SWITCHING
  ========================================================== */

  const tabs   = [tabListings,  tabRequests,  tabReplies];
  const panels = [panelListings, panelRequests, panelReplies];

  function activateTab(index) {
    tabs.forEach((tab, i) => {
      if (!tab) return;
      const isActive = i === index;
      tab.classList.toggle('content-tab--active', isActive);
      tab.setAttribute('aria-selected', String(isActive));
    });
    panels.forEach((panel, i) => {
      if (!panel) return;
      panel.classList.toggle('content-panel--active', i === index);
      panel.hidden = i !== index;
    });
  }

  tabListings?.addEventListener('click', () => activateTab(0));
  tabRequests?.addEventListener('click', () => activateTab(1));
  tabReplies?.addEventListener('click',  () => activateTab(2));

  // Stat cards also switch tabs
  document.querySelectorAll('.stat-card[data-tab]').forEach(card => {
    card.addEventListener('click', () => {
      const tab = card.dataset.tab;
      if (tab === 'listings') activateTab(0);
      if (tab === 'requests') activateTab(1);
      if (tab === 'replies')  activateTab(2);
    });
  });


  /* ==========================================================
     SHARE PROFILE
  ========================================================== */

  const shareProfileBtn = document.getElementById('shareProfileBtn');
  const shareBtn        = document.getElementById('shareBtn');

  function handleShare() {
    const profile = JARAProfile.get();
    const name    = JARAProfile.getDisplayName(profile) || 'JARA Member';
    const url     = window.location.href;

    if (navigator.share) {
      navigator.share({
        title: name + ' on JARA ∆',
        text:  'Check out ' + name + ' on JARA — the campus marketplace.',
        url,
      }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        window.jaraToast?.('Profile link copied!');
      });
    }
  }

  shareProfileBtn?.addEventListener('click', handleShare);
  shareBtn?.addEventListener('click', handleShare);


  /* ==========================================================
     LOGOUT
  ========================================================== */

  logoutBtn?.addEventListener('click', async () => {
    logoutBtn.disabled    = true;
    logoutBtn.textContent = 'Logging out…';
    await JARAAuth.signOut();
  });


  /* ==========================================================
     ERROR STATE
  ========================================================== */

  function showError() {
    hideSkeletons();
    if (profileName) profileName.textContent = 'Could not load profile';
    if (profileSub)  profileSub.textContent  = 'Please check your connection and try again.';
    if (profileName) profileName.classList.remove('profile-name--hidden');
    if (profileSub)  profileSub.classList.remove('profile-sub--hidden');
  }


  /* ==========================================================
     UTILITIES
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

  function fmtDate(iso) {
    try {
      return new Date(iso).toLocaleDateString('en-NG', {
        month: 'long',
        year:  'numeric',
      });
    } catch { return ''; }
  }


  /* ==========================================================
     INIT
  ========================================================== */

  async function init() {
    try {
      /*
       JARAProfile.load() uses the cached profile from auth-guard
       if available, otherwise fetches from Supabase.
       This avoids the double-fetch identified in audit item C6.
      */
      const profile = await JARAProfile.load();

      if (!profile) {
        showError();
        return;
      }

      hideSkeletons();
      renderProfile(profile);

      // Get userId for stats + content tabs
      const userId = profile.id;
      loadStats(userId);
      loadListingsTab(userId);
      loadRequestsTab(userId);
      loadRepliesTab(userId);

    } catch (err) {
      console.error('Profile page error:', err.message);
      showError();
    }
  }

  init();

});
