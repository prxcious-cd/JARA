/* ============================================================
   JARA ∆ — Store Page  (listings-integrated)
   js/store.js

   Depends on:
     - window._supabase    (supabase-client.js — loaded in <head>)
     - window.JARAAuth     (auth-guard.js)
     - window.JARAProfile  (jara-profile.js)
     - window.JARAListings (jara-listings.js)
     - HTML IDs in store/index.html

   All getElementById calls verified against store/index.html.

   URL params:
     ?id=USER_ID  — view a specific seller's store
     (no param)   — view own store
============================================================ */

document.addEventListener('DOMContentLoaded', async () => {

  /* ==========================================================
     STATE
  ========================================================== */

  const S = {
    ownerId:    null,
    profile:    null,
    isOwner:    false,
    activeTab:  'products',
  };

  /* ==========================================================
     DOM REFS — every ID verified against store/index.html
  ========================================================== */

  // Logo / identity
  const storeLogoSkeleton  = document.getElementById('storeLogoSkeleton');
  const storeLogoEl        = document.getElementById('storeLogoEl');
  const verifiedRing       = document.getElementById('verifiedRing');
  const storeSkeleton1     = document.getElementById('storeSkeleton1');
  const storeSkeleton2     = document.getElementById('storeSkeleton2');
  const storeName          = document.getElementById('storeName');
  const storeVerifiedMark  = document.getElementById('storeVerifiedMark');
  const storeCategory      = document.getElementById('storeCategory');
  const storeBadges        = document.getElementById('storeBadges');
  const storeTagline       = document.getElementById('storeTagline');

  // Meta
  const storeMeta          = document.getElementById('storeMeta');
  const storeLocation      = document.getElementById('storeLocation');
  const storeJoined        = document.getElementById('storeJoined');
  const storeFeatures      = document.getElementById('storeFeatures');

  // Action buttons
  const contactBtn         = document.getElementById('contactBtn');
  const followBtn          = document.getElementById('followBtn');
  const followIcon         = document.getElementById('followIcon');
  const followLabel        = document.getElementById('followLabel');
  const shareBtn           = document.getElementById('shareBtn');
  const topbarShareBtn     = document.getElementById('topbarShareBtn');
  const topbarFollowBtn    = document.getElementById('topbarFollowBtn');

  // Stats
  const statProducts       = document.getElementById('statProducts');
  const statServices       = document.getElementById('statServices');
  const statCompleted      = document.getElementById('statCompleted');
  const statFollowers      = document.getElementById('statFollowers');
  const statViews          = document.getElementById('statViews');

  // About section
  const aboutDescription   = document.getElementById('aboutDescription');
  const aboutPhone         = document.getElementById('aboutPhone');
  const aboutPhoneRow      = document.getElementById('aboutPhoneRow');
  const aboutWhatsapp      = document.getElementById('aboutWhatsapp');
  const aboutWhatsappRow   = document.getElementById('aboutWhatsappRow');
  const aboutEmail         = document.getElementById('aboutEmail');
  const aboutEmailRow      = document.getElementById('aboutEmailRow');
  const aboutWebsite       = document.getElementById('aboutWebsite');
  const aboutWebsiteRow    = document.getElementById('aboutWebsiteRow');
  const aboutLocation      = document.getElementById('aboutLocation');
  const aboutHours         = document.getElementById('aboutHours');

  // Tabs
  const tabProducts        = document.getElementById('tabProducts');
  const tabServices        = document.getElementById('tabServices');
  const tabRequests        = document.getElementById('tabRequests');
  const tabProductsCount   = document.getElementById('tabProductsCount');
  const tabServicesCount   = document.getElementById('tabServicesCount');
  const tabRequestsCount   = document.getElementById('tabRequestsCount');
  const panelProducts      = document.getElementById('panelProducts');
  const panelServices      = document.getElementById('panelServices');
  const panelRequests      = document.getElementById('panelRequests');
  const productsGrid       = document.getElementById('productsGrid');
  const servicesGrid       = document.getElementById('servicesGrid');
  const requestsList       = document.getElementById('requestsList');

  // Contact section
  const contactWhatsapp    = document.getElementById('contactWhatsapp');
  const contactPhone       = document.getElementById('contactPhone');

  // Similar strip
  const similarStrip       = document.getElementById('similarStrip');


  /* ==========================================================
     URL PARAM — whose store is this?
  ========================================================== */

  const params      = new URLSearchParams(window.location.search);
  const storeUserId = params.get('id') || null;


  /* ==========================================================
     SKELETON HELPERS
  ========================================================== */

  function hideSkeletons() {
    if (storeLogoSkeleton) storeLogoSkeleton.style.display = 'none';
    if (storeSkeleton1)    storeSkeleton1.style.display    = 'none';
    if (storeSkeleton2)    storeSkeleton2.style.display    = 'none';

    if (storeLogoEl)  storeLogoEl.classList.remove('store-logo--hidden');
    if (storeName)    storeName.classList.remove('store-name--hidden');
    if (storeCategory) storeCategory.classList.remove('store-category--hidden');
  }


  /* ==========================================================
     LOAD STORE OWNER PROFILE
  ========================================================== */

  async function loadOwnerProfile(userId) {
    const sb = window._supabase;
    if (!sb || !userId) return null;

    const { data, error } = await sb
      .from('profiles')
      .select(`
        id,
        jara_id,
        full_name,
        username,
        avatar_url,
        account_type,
        bio,
        school,
        location,
        business_name,
        business_category,
        business_description,
        phone,
        whatsapp,
        website,
        is_verified,
        is_founding_member,
        is_premium,
        pro_status,
        created_at
      `)
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Store: loadOwnerProfile error:', error.message);
      return null;
    }
    return data;
  }


  /* ==========================================================
     RENDER STORE HEADER
  ========================================================== */

  function renderStoreHeader(profile) {
    const displayName = JARAProfile.getDisplayName(profile) || 'JARA Business';
    const avatarUrl   = JARAProfile.getAvatarUrl(profile);
    const initials    = JARAProfile.getInitials(profile);

    /* ---- Logo ---- */
    if (storeLogoEl) {
      if (avatarUrl) {
        storeLogoEl.innerHTML = `
          <img
            src="${esc(avatarUrl)}"
            alt="${esc(displayName)}"
            style="width:100%;height:100%;object-fit:cover;border-radius:50%"
          />`;
      } else {
        storeLogoEl.textContent = initials;
      }
    }

    /* ---- Verified ring ---- */
    if (verifiedRing) {
      verifiedRing.hidden = !profile.is_verified;
    }

    /* ---- Name ---- */
    if (storeName) {
      storeName.textContent = displayName;
    }

    /* ---- Verified mark ---- */
    if (storeVerifiedMark) {
      storeVerifiedMark.hidden = !profile.is_verified;
    }

    /* ---- Category ---- */
    if (storeCategory) {
      storeCategory.textContent = profile.business_category || profile.account_type || '';
    }

    /* ---- Badges ---- */
    if (storeBadges) {
      const badges = [];
      if (JARAProfile.isFounder(profile)) {
        badges.push(`<span class="store-badge store-badge--founding">🏆 Founding Member</span>`);
      }
      if (JARAProfile.isPro(profile)) {
        badges.push(`<span class="store-badge store-badge--pro">
          <i class="fa-solid fa-crown" aria-hidden="true"></i> PRO
        </span>`);
      }
      if (profile.is_verified) {
        badges.push(`<span class="store-badge store-badge--verified">
          <i class="fa-solid fa-circle-check" aria-hidden="true"></i> Verified
        </span>`);
      }
      if (badges.length > 0) {
        storeBadges.innerHTML = badges.join('');
        storeBadges.removeAttribute('hidden');
      }
    }

    /* ---- Tagline / bio ---- */
    if (storeTagline) {
      const tagline = profile.business_description || profile.bio || '';
      storeTagline.textContent = tagline;
      storeTagline.hidden = !tagline;
    }

    /* ---- Meta: location + joined ---- */
    if (storeLocation) {
      const locSpan = storeLocation.querySelector('span');
      if (locSpan) locSpan.textContent = profile.location || '';
      storeLocation.style.display = profile.location ? '' : 'none';
    }

    if (storeJoined) {
      const joinSpan = storeJoined.querySelector('span');
      if (joinSpan && profile.created_at) {
        joinSpan.textContent = 'Joined ' + fmtDate(profile.created_at);
      }
    }

    if (storeMeta) storeMeta.removeAttribute('hidden');

    /* ---- About section ---- */
    if (aboutDescription) {
      aboutDescription.textContent =
        profile.business_description || profile.bio || 'No description provided yet.';
    }

    /* ---- Phone ---- */
    if (aboutPhone && aboutPhoneRow) {
      if (profile.phone) {
        aboutPhone.textContent = profile.phone;
        aboutPhone.href = `tel:${profile.phone}`;
        aboutPhoneRow.style.display = '';
      } else {
        aboutPhoneRow.style.display = 'none';
      }
    }

    /* ---- WhatsApp ---- */
    if (aboutWhatsapp && aboutWhatsappRow) {
      const wa = profile.whatsapp || profile.phone;
      if (wa) {
        const num = wa.replace(/\D/g, '');
        aboutWhatsapp.textContent = wa;
        aboutWhatsapp.href = `https://wa.me/${num}`;
        aboutWhatsappRow.style.display = '';
      } else {
        aboutWhatsappRow.style.display = 'none';
      }
    }

    /* ---- Website ---- */
    if (aboutWebsite && aboutWebsiteRow) {
      if (profile.website) {
        aboutWebsite.textContent = profile.website;
        aboutWebsite.href = profile.website;
        aboutWebsiteRow.removeAttribute('hidden');
      }
    }

    /* ---- Location in about ---- */
    if (aboutLocation) {
      aboutLocation.textContent = profile.location || 'Redeemer\'s University, Ede';
    }

    /* ---- Contact section buttons ---- */
    if (contactWhatsapp) {
      const wa = profile.whatsapp || profile.phone;
      if (wa) {
        const num = wa.replace(/\D/g, '');
        contactWhatsapp.href =
          `https://wa.me/${num}?text=${encodeURIComponent(
            'Hi, I found your store on JARA ∆.'
          )}`;
      } else {
        contactWhatsapp.style.display = 'none';
      }
    }

    if (contactPhone) {
      if (profile.phone) {
        contactPhone.href = `tel:${profile.phone}`;
      } else {
        contactPhone.style.display = 'none';
      }
    }

    /* ---- Main contact button ---- */
    if (contactBtn) {
      const wa = profile.whatsapp || profile.phone;
      if (wa) {
        const num = wa.replace(/\D/g, '');
        contactBtn.href =
          `https://wa.me/${num}?text=${encodeURIComponent(
            'Hi, I found your store on JARA ∆.'
          )}`;
      } else {
        contactBtn.style.display = 'none';
      }
    }

    /* ---- Page title ---- */
    document.title = `${displayName} — JARA ∆`;
  }


  /* ==========================================================
     LOAD LISTINGS INTO TABS
  ========================================================== */

  async function loadStoreListings(ownerId) {
    if (!ownerId) return;

    try {
      const { data, error } = await JARAListings.fetch({
        ownerId,
        status:    S.isOwner ? null : 'active',
        limit:     50,
        offset:    0,
        orderBy:   'created_at',
        ascending: false,
      });

      if (error || !data) {
        showGridEmpty(productsGrid, 'products');
        showGridEmpty(servicesGrid, 'services');
        showGridEmpty(requestsList, 'requests');
        return;
      }

      const products = data.filter(l => l.listing_type === 'product');
      const services = data.filter(l => l.listing_type === 'service');
      const requests = data.filter(l => l.listing_type === 'request');

      // Update tab counts
      if (tabProductsCount) tabProductsCount.textContent = products.length;
      if (tabServicesCount)  tabServicesCount.textContent  = services.length;
      if (tabRequestsCount)  tabRequestsCount.textContent  = requests.length;

      // Update stats
      if (statProducts) { statProducts.textContent = products.length; statProducts.classList.remove('skeleton-pulse'); }
      if (statServices) { statServices.textContent = services.length; statServices.classList.remove('skeleton-pulse'); }
      if (statCompleted){ statCompleted.textContent = '0'; statCompleted.classList.remove('skeleton-pulse'); }
      if (statFollowers){ statFollowers.textContent = '0'; statFollowers.classList.remove('skeleton-pulse'); }
      if (statViews)    { statViews.textContent = '0';    statViews.classList.remove('skeleton-pulse'); }

      // Render grids
      renderListingGrid(productsGrid, products, 'products');
      renderListingGrid(servicesGrid, services, 'services');
      renderListingGrid(requestsList, requests, 'requests');

    } catch (err) {
      console.error('Store: loadStoreListings error:', err.message);
    }
  }

  function renderListingGrid(container, listings, type) {
    if (!container) return;
    container.innerHTML = '';

    if (listings.length === 0) {
      showGridEmpty(container, type);
      return;
    }

    listings.forEach(listing => {
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
        ${S.isOwner
          ? `<a class="store-card__edit"
                href="../sell/index.html?edit=${esc(listing.id)}"
                aria-label="Edit listing"
                onclick="event.stopPropagation()">
               <i class="fa-solid fa-pen" aria-hidden="true"></i>
             </a>`
          : ''
        }
      `;

      container.appendChild(card);
    });
  }

  function showGridEmpty(container, type) {
    if (!container || !window.jaraEmpty) return;
    const configs = {
      products: {
        icon:     'fa-solid fa-box-open',
        title:    'No products yet',
        body:     S.isOwner ? 'Add your first product to start selling.' : 'This store has no products yet.',
        btnLabel: S.isOwner ? 'Add Product' : null,
        btnHref:  S.isOwner ? '../sell/index.html' : null,
      },
      services: {
        icon:     'fa-solid fa-screwdriver-wrench',
        title:    'No services yet',
        body:     S.isOwner ? 'Add your first service to start getting clients.' : 'This store has no services yet.',
        btnLabel: S.isOwner ? 'Add Service' : null,
        btnHref:  S.isOwner ? '../sell/index.html' : null,
      },
      requests: {
        icon:     'fa-solid fa-bullhorn',
        title:    'No requests yet',
        body:     'No active requests from this seller.',
      },
    };
    window.jaraEmpty(container, configs[type] || configs.products);
  }


  /* ==========================================================
     TAB SWITCHING
  ========================================================== */

  const tabEls   = [tabProducts,   tabServices,   tabRequests];
  const panelEls = [panelProducts, panelServices, panelRequests];

  function activateTab(index) {
    tabEls.forEach((tab, i) => {
      if (!tab) return;
      tab.classList.toggle('content-tab--active', i === index);
      tab.setAttribute('aria-selected', String(i === index));
    });
    panelEls.forEach((panel, i) => {
      if (!panel) return;
      panel.classList.toggle('content-panel--active', i === index);
      panel.hidden = i !== index;
    });
  }

  tabProducts?.addEventListener('click', () => activateTab(0));
  tabServices?.addEventListener('click', () => activateTab(1));
  tabRequests?.addEventListener('click', () => activateTab(2));


  /* ==========================================================
     FOLLOW BUTTON
  ========================================================== */

  followBtn?.addEventListener('click', () => {
    /*
     FUTURE: INSERT INTO followers (follower_id, following_id)
             VALUES (auth.uid(), S.ownerId)
             ON CONFLICT DO NOTHING
    */
    window.jaraToast?.('Follow feature coming soon.');
  });

  topbarFollowBtn?.addEventListener('click', () => {
    window.jaraToast?.('Follow feature coming soon.');
  });


  /* ==========================================================
     SHARE STORE
  ========================================================== */

  function handleShare() {
    const name = JARAProfile.getDisplayName(S.profile) || 'JARA Store';
    const url  = window.location.href;

    if (navigator.share) {
      navigator.share({
        title: name + ' on JARA ∆',
        text:  'Check out ' + name + ' on JARA — the campus marketplace.',
        url,
      }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        window.jaraToast?.('Store link copied!');
      });
    }
  }

  shareBtn?.addEventListener('click', handleShare);
  topbarShareBtn?.addEventListener('click', handleShare);


  /* ==========================================================
     OWNER UI
  ========================================================== */

  async function applyOwnerUI(profileId) {
    const current = await JARAAuth.getCurrentUser();
    if (!current) return;
    S.isOwner = current.user.id === profileId;
  }


  /* ==========================================================
     ERROR STATE
  ========================================================== */

  function showError() {
    hideSkeletons();
    if (storeName) {
      storeName.textContent = "Couldn't load this store";
      storeName.classList.remove('store-name--hidden');
    }
    if (aboutDescription) {
      aboutDescription.textContent = 'Please check your connection and try again.';
    }
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

  function fmtDate(iso) {
    try {
      return new Date(iso).toLocaleDateString('en-NG', {
        month: 'long', year: 'numeric',
      });
    } catch { return ''; }
  }


  /* ==========================================================
     INIT
  ========================================================== */

  async function init() {
    try {
      let profile;

      if (storeUserId) {
        // Viewing someone else's store
        S.ownerId = storeUserId;
        profile   = await loadOwnerProfile(storeUserId);
      } else {
        // Viewing own store
        profile   = await JARAProfile.load();
        S.ownerId = profile?.id || null;
      }

      if (!profile) {
        showError();
        return;
      }

      S.profile = profile;

      await applyOwnerUI(profile.id);

      hideSkeletons();
      renderStoreHeader(profile);
      await loadStoreListings(profile.id);

    } catch (err) {
      console.error('Store init error:', err.message);
      showError();
    }
  }

  init();

});
