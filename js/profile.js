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
    try {
      const sb = window._supabase;
      if (!sb) return;

      // Run all counts in parallel
      const [listingsRes, requestsRes, savedRes] = await Promise.all([
        sb.from('listings')
          .select('id', { count: 'exact', head: true })
          .eq('owner_id', userId)
          .eq('status', 'active'),

        sb.from('listings')
          .select('id', { count: 'exact', head: true })
          .eq('owner_id', userId)
          .eq('listing_type', 'request')
          .eq('status', 'active'),

        sb.from('favorites')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
      ]);

      const listingCount = listingsRes.count || 0;
      const requestCount = requestsRes.count || 0;
      const savedCount   = savedRes.count   || 0;

      if (statListings) {
        statListings.textContent = listingCount;
        statListings.classList.remove('skeleton-pulse');
      }
      if (statRequests) {
        statRequests.textContent = requestCount;
        statRequests.classList.remove('skeleton-pulse');
      }
      if (statReplies) {
        statReplies.textContent = 0;
        statReplies.classList.remove('skeleton-pulse');
      }
      if (statSaved) {
        statSaved.textContent = savedCount;
        statSaved.classList.remove('skeleton-pulse');
      }
      if (statViews) {
        statViews.textContent = 0;
        statViews.classList.remove('skeleton-pulse');
      }

    } catch (err) {
      console.error('Profile: loadStats error:', err.message);
      [statListings, statRequests, statReplies, statSaved, statViews]
        .forEach(el => { if (el) { el.textContent = '0'; el.classList.remove('skeleton-pulse'); } });
    }
     }
  /* ==========================================================
     LOAD CONTENT TABS
  ========================================================== */
async function loadListingsTab(userId) {
    if (!listingsGrid) return;

    try {
      const { data, error } = await JARAListings.fetch({
        ownerId:   userId,
        status:    'active',
        orderBy:   'created_at',
        ascending: false,
        limit:     20,
        offset:    0,
      });

      listingsGrid.innerHTML = '';

      if (error || !data || data.length === 0) {
        if (window.jaraEmpty) {
          window.jaraEmpty(listingsGrid, {
            icon:     'fa-solid fa-box-open',
            title:    'No listings yet',
            body:     'Create your first listing and start selling on campus.',
            btnLabel: 'Create Listing',
            btnHref:  '../sell/index.html',
          });
        }
        return;
      }

      // Inject grid CSS if not already present
      if (!document.getElementById('profile-listings-grid-style')) {
        const style = document.createElement('style');
        style.id = 'profile-listings-grid-style';
        style.textContent = `
          .profile-listings-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.875rem;
            padding: 0.5rem 0;
          }
        `;
        document.head.appendChild(style);
      }

      const grid = document.createElement('div');
      grid.className = 'profile-listings-grid';

      data.forEach(listing => {
        const cover = JARAListings.getCoverImage(listing);
        const price = JARAListings.formatPrice(listing);

        const card = document.createElement('a');
        card.className = 'store-card j-card';
        card.href      = `../listing/index.html?id=${esc(listing.id)}`;
        card.setAttribute('role', 'listitem');
        card.setAttribute('aria-label', listing.title);

        card.innerHTML = `
          <div class="store-card__image">
            ${cover
              ? `<img src="${esc(cover)}" alt="${esc(listing.title)}" loading="lazy" />`
              : `<i class="fa-solid fa-image" aria-hidden="true"></i>`
            }
            <span class="store-card__dot store-card__dot--active"></span>
          </div>
          <div class="store-card__body">
            <p class="store-card__title">${esc(listing.title)}</p>
            <p class="store-card__price">${esc(price)}</p>
            <p class="store-card__views">
              <i class="fa-solid fa-eye" aria-hidden="true"></i>
              ${listing.view_count || 0}
            </p>
          </div>
          <a class="store-card__edit"
             href="../sell/index.html?edit=${esc(listing.id)}"
             aria-label="Edit listing"
             onclick="event.stopPropagation()">
            <i class="fa-solid fa-pen" aria-hidden="true"></i>
          </a>
        `;

        grid.appendChild(card);
      });

      listingsGrid.appendChild(grid);

    } catch (err) {
      console.error('Profile: loadListingsTab error:', err.message);
      if (window.jaraEmpty) {
        window.jaraEmpty(listingsGrid, {
          icon:  'fa-solid fa-box-open',
          title: 'Could not load listings',
          body:  'Please check your connection and try again.',
        });
      }
    }
   function loadRequestsTab(userId) {
    if (!requestsList) return;
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
    if (window.jaraEmpty) {
      window.jaraEmpty(repliesList, {
        icon:  'fa-solid fa-reply',
        title: 'No replies yet',
        body:  'Your replies to campus requests will appear here.',
      });
    }
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
     EDIT PROFILE SHEET
  ========================================================== */

  const editSheet        = document.getElementById('editSheet');
  const editSheetBackdrop= document.getElementById('editSheetBackdrop');
  const editSheetClose   = document.getElementById('editSheetClose');
  const editSheetAlert   = document.getElementById('editSheetAlert');
  const editSheetAlertText = document.getElementById('editSheetAlertText');
  const editSheetSuccess = document.getElementById('editSheetSuccess');
  const editProfileForm  = document.getElementById('editProfileForm');
  const editSheetSave    = document.getElementById('editSheetSave');
  const editAvatarPreview= document.getElementById('editAvatarPreview');
  const editAvatarFile   = document.getElementById('editAvatarFile');
  const editFullName     = document.getElementById('editFullName');
  const editBio          = document.getElementById('editBio');
  const editBioCount     = document.getElementById('editBioCount');
  const editPhone        = document.getElementById('editPhone');
  const editWhatsapp     = document.getElementById('editWhatsapp');
  const editBusinessName = document.getElementById('editBusinessName');
  const editBusinessNameField = document.getElementById('editBusinessNameField');
  const editBusinessDesc = document.getElementById('editBusinessDesc');
  const editBusinessDescField = document.getElementById('editBusinessDescField');
  const editLocation     = document.getElementById('editLocation');

  let editAvatarNewFile  = null;

  function openEditSheet() {
    const profile = JARAProfile.get();
    if (!profile) return;

    // Pre-fill all fields with current values
    if (editFullName)     editFullName.value     = profile.full_name            || '';
    if (editBio)          editBio.value          = profile.bio                  || '';
    if (editBioCount)     editBioCount.textContent = (profile.bio || '').length;
    if (editPhone)        editPhone.value        = profile.phone                || '';
    if (editWhatsapp)     editWhatsapp.value     = profile.whatsapp             || '';
    if (editBusinessName) editBusinessName.value = profile.business_name        || '';
    if (editBusinessDesc) editBusinessDesc.value = profile.business_description || '';
    if (editLocation)     editLocation.value     = profile.location             || '';

    // Show business fields only for sellers
    const isSeller = profile.account_type === 'business';
    if (editBusinessNameField) editBusinessNameField.hidden = !isSeller;
    if (editBusinessDescField) editBusinessDescField.hidden = !isSeller;

    // Render current avatar in sheet
    if (editAvatarPreview) {
      const url = JARAProfile.getAvatarUrl(profile);
      if (url) {
        editAvatarPreview.innerHTML =
          `<img src="${url}" alt="Current profile photo" />`;
      } else {
        editAvatarPreview.textContent = JARAProfile.getInitials(profile);
      }
    }

    // Reset state
    editAvatarNewFile = null;
    if (editSheetAlert)   editSheetAlert.hidden   = true;
    if (editSheetSuccess) editSheetSuccess.hidden = true;

    // Open sheet
    editSheet.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    editFullName?.focus();
  }

  function closeEditSheet() {
    editSheet?.setAttribute('hidden', '');
    document.body.style.overflow = '';
  }

  // Open triggers — use querySelector to avoid duplicate const declarations
  document.getElementById('editProfileBtn')
    ?.addEventListener('click',  e => { e.preventDefault(); openEditSheet(); });
  document.getElementById('editProfileItem')
    ?.addEventListener('click', e => { e.preventDefault(); openEditSheet(); });
  document.getElementById('editAvatarBtn')
    ?.addEventListener('click', e => { e.preventDefault(); openEditSheet(); });

  // Close triggers
  editSheetClose?.addEventListener('click',    closeEditSheet);
  editSheetBackdrop?.addEventListener('click', closeEditSheet);

  // Bio char counter
  editBio?.addEventListener('input', () => {
    if (editBioCount) editBioCount.textContent = editBio.value.length;
  });

  // Avatar file preview
  editAvatarFile?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showEditAlert('Photo is too large. Maximum 5 MB.');
      return;
    }
    editAvatarNewFile = file;
    const reader = new FileReader();
    reader.onload = ev => {
      if (editAvatarPreview) {
        editAvatarPreview.innerHTML =
          `<img src="${ev.target.result}" alt="New profile photo" />`;
      }
    };
    reader.readAsDataURL(file);
  });

  function showEditAlert(msg) {
    if (!editSheetAlert || !editSheetAlertText) return;
    editSheetAlertText.textContent = msg;
    editSheetAlert.hidden   = false;
    editSheetSuccess.hidden = true;
  }

  function setEditLoading(on) {
    if (!editSheetSave) return;
    editSheetSave.disabled = on;
    const label   = editSheetSave.querySelector('.edit-sheet__save-label');
    const spinner = editSheetSave.querySelector('.edit-sheet__save-spinner');
    if (label)   label.hidden   = on;
    if (spinner) spinner.hidden = !on;
  }

  // Form submit
  editProfileForm?.addEventListener('submit', async e => {
    e.preventDefault();
    if (editSheetAlert)   editSheetAlert.hidden   = true;
    if (editSheetSuccess) editSheetSuccess.hidden = true;

    const name = editFullName?.value.trim() || '';
    if (!name) {
      showEditAlert('Please enter your full name.');
      editFullName?.focus();
      return;
    }

    setEditLoading(true);

    try {
      // Upload new avatar if selected
      if (editAvatarNewFile) {
        const { error: avatarError } = await JARAProfile.uploadAvatar(editAvatarNewFile);
        if (avatarError) {
          showEditAlert('Photo upload failed: ' + avatarError.message);
          setEditLoading(false);
          return;
        }
      }

      // Build update payload
      const payload = {
        full_name:            editFullName?.value.trim()       || null,
        bio:                  editBio?.value.trim()            || null,
        phone:                editPhone?.value.trim()          || null,
        whatsapp:             editWhatsapp?.value.trim()       || null,
        location:             editLocation?.value.trim()       || null,
        business_name:        editBusinessName?.value.trim()   || null,
        business_description: editBusinessDesc?.value.trim()   || null,
      };

      const { data: updated, error } = await JARAProfile.update(payload);

      if (error) {
        showEditAlert('Failed to save: ' + error.message);
        setEditLoading(false);
        return;
      }

      // Re-render profile with updated data
      renderProfile(updated);

      // Show success
      if (editSheetSuccess) editSheetSuccess.hidden = false;
      setEditLoading(false);

      // Auto-close after 1.5 seconds
      setTimeout(closeEditSheet, 1500);

    } catch (err) {
      console.error('Edit profile error:', err.message);
      showEditAlert('An unexpected error occurred. Please try again.');
      setEditLoading(false);
    }
  });
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
