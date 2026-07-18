/* ============================================================
   JARA ∆ — Create Listing Wizard
   js/sell.js

   4-step wizard matched to sell/index.html exactly.

   Step 1 — Choose type (product / service / request)
   Step 2 — Fill details
   Step 3 — Preview
   Step 4 — Publishing animation + success screen

   All IDs verified against sell/index.html.
============================================================ */

document.addEventListener('DOMContentLoaded', async () => {

  /* ==========================================================
     STATE
  ========================================================== */

  const S = {
    step:         1,
    listingType:  null,
    title:        '',
    category:     '',
    description:  '',
    tags:         [],
    photos:       [],
    location:     '',
    priceType:    null,
    priceAmount:  null,
    availability: 'available',
    profile:      null,
    publishedId:  null,
  };

  /* ==========================================================
     CATEGORIES
  ========================================================== */

  const CATEGORIES = [
    'Books & Stationery',
    'Food & Drinks',
    'Tech & Repairs',
    'Personal Care',
    'Creative Services',
    'Laundry & Errands',
    'Tutoring',
    'Hostel & Home',
    'Power & Generator',
    'Fashion & Clothing',
    'Health & Wellness',
    'Transport',
    'Other',
  ];

  /* ==========================================================
     DOM REFS — every ID verified against sell/index.html
  ========================================================== */

  // Topbar
  const topbarBack      = document.getElementById('topbarBack');
  const topbarTitle     = document.getElementById('topbarTitle');
  const topbarStepBadge = document.getElementById('topbarStepBadge');
  const topbarStepText  = document.getElementById('topbarStepText');

  // Progress
  const sellProgress = document.getElementById('sellProgress');
  const progressFill = document.getElementById('progressFill');

  // Steps
  const step1 = document.getElementById('step1');
  const step2 = document.getElementById('step2');
  const step3 = document.getElementById('step3');
  const step4 = document.getElementById('step4');

  // Step 1
  const typeCards  = document.querySelectorAll('.type-card');
  const step1Next  = document.getElementById('step1Next');
  const typeError  = document.getElementById('typeError');

  // Step 2
  const step2Alert      = document.getElementById('step2Alert');
  const step2AlertText  = document.getElementById('step2AlertText');
  const step2Eyebrow    = document.getElementById('step2Eyebrow');
  const postTitle       = document.getElementById('postTitle');
  const titleCharCount  = document.getElementById('titleCharCount');
  const postCategory    = document.getElementById('postCategory');
  const postDescription = document.getElementById('postDescription');
  const descCharCount   = document.getElementById('descriptionCharCount');
  const tagInput        = document.getElementById('tagInput');
  const tagsDisplay     = document.getElementById('tagsDisplay');
  const photoGrid       = document.getElementById('photoGrid');
  const locationManual  = document.getElementById('locationManual');
  const locationStatus  = document.getElementById('locationStatus');
  const useLocationBtn  = document.getElementById('useLocationBtn');
  const priceAmountWrap = document.getElementById('priceAmountWrap');
  const priceAmount     = document.getElementById('priceAmount');
  const step2Back       = document.getElementById('step2Back');
  const step2Next       = document.getElementById('step2Next');
  const priceChips      = document.querySelectorAll('.price-chip');
  const statusChips     = document.querySelectorAll('.status-chip');

  // Step 3
  const previewPhotos       = document.getElementById('previewPhotos');
  const previewTypeBadge    = document.getElementById('previewTypeBadge');
  const previewStatusBadge  = document.getElementById('previewStatusBadge');
  const previewTitle        = document.getElementById('previewTitle');
  const previewDescription  = document.getElementById('previewDescription');
  const previewPrice        = document.getElementById('previewPrice');
  const previewLocationText = document.getElementById('previewLocationText');
  const previewTags         = document.getElementById('previewTags');
  const previewAvatar       = document.getElementById('previewAvatar');
  const previewSellerName   = document.getElementById('previewSellerName');
  const previewSellerType   = document.getElementById('previewSellerType');
  const previewWhatsapp     = document.getElementById('previewWhatsapp');
  const step3Back           = document.getElementById('step3Back');
  const step3Next           = document.getElementById('step3Next');

  // Step 4
  const publishingState = document.getElementById('publishingState');
  const successState    = document.getElementById('successState');
  const jaraIdDisplay   = document.getElementById('jaraIdDisplay');
  const copyJaraId      = document.getElementById('copyJaraId');
  const createAnotherBtn= document.getElementById('createAnotherBtn');
  const publishError    = document.getElementById('publishError');
  const publishErrorText= document.getElementById('publishErrorText');


  /* ==========================================================
     STEP NAVIGATION
  ========================================================== */

  const ALL_STEPS = [step1, step2, step3, step4];
  const TOTAL     = 4;

  // Progress % per step (step 1 = no bar, steps 2-4 show bar)
  const PROGRESS_PCT = { 1: 0, 2: 33, 3: 66, 4: 100 };

  const STEP_TITLES = {
    1: 'Create',
    2: 'Details',
    3: 'Preview',
    4: 'Publishing',
  };

  function goToStep(n) {
    S.step = n;

    // Show only the active step
    ALL_STEPS.forEach((el, i) => {
      if (!el) return;
      const isActive = (i + 1) === n;
      el.hidden = !isActive;
      el.classList.toggle('sell-step--active', isActive);
    });

    // Back button — hidden on step 1
    if (topbarBack) {
      topbarBack.hidden = n <= 1;
    }

    // Title
    if (topbarTitle) {
      topbarTitle.textContent = STEP_TITLES[n] || 'Create';
    }

    // Step badge — hidden on step 1
    if (topbarStepBadge && topbarStepText) {
      topbarStepBadge.hidden = n <= 1;
      topbarStepText.textContent = `Step ${n} of ${TOTAL}`;
    }

    // Progress bar — hidden on step 1
    if (sellProgress && progressFill) {
      sellProgress.hidden = n <= 1;
      progressFill.style.width = PROGRESS_PCT[n] + '%';
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Topbar back button
  topbarBack?.addEventListener('click', () => {
    if (S.step > 1 && S.step < 4) {
      goToStep(S.step - 1);
    }
    // Disable back on step 4 (publishing in progress)
  });


  /* ==========================================================
     STEP 1 — TYPE SELECTION
  ========================================================== */

  typeCards.forEach(card => {
    card.addEventListener('click', () => {
      // Deselect all
      typeCards.forEach(c => {
        c.classList.remove('type-card--selected');
        c.setAttribute('aria-checked', 'false');
      });

      // Select tapped card
      card.classList.add('type-card--selected');
      card.setAttribute('aria-checked', 'true');
      S.listingType = card.dataset.type;

      // Hide the error as soon as a choice is made
      if (typeError) typeError.hidden = true;
    });
  });

  step1Next?.addEventListener('click', () => {
    if (!S.listingType) {
      if (typeError) typeError.hidden = false;
      return;
    }

    // Update Step 2 heading to match type
    if (step2Eyebrow) {
      const eyebrows = {
        product: 'Product details',
        service: 'Service details',
        request: 'Request details',
      };
      step2Eyebrow.textContent = eyebrows[S.listingType] || 'Details';
    }

    goToStep(2);
  });


  /* ==========================================================
     STEP 2 — DETAILS
  ========================================================== */

  /* ---- Category dropdown ---- */
  function buildCategories() {
    if (!postCategory) return;
    postCategory.innerHTML = '<option value="" disabled selected>Select a category</option>';
    CATEGORIES.forEach(cat => {
      const opt       = document.createElement('option');
      opt.value       = cat;
      opt.textContent = cat;
      postCategory.appendChild(opt);
    });
    /*
     FUTURE: Load from Supabase categories table:
       const { data } = await window._supabase
         .from('categories')
         .select('name')
         .order('name');
    */
  }

  /* ---- Character counters ---- */
  postTitle?.addEventListener('input', () => {
    if (titleCharCount) titleCharCount.textContent = `${postTitle.value.length} / 120`;
    hideStep2Alert();
  });

  postDescription?.addEventListener('input', () => {
    if (descCharCount) descCharCount.textContent = `${postDescription.value.length} / 2000`;
    hideStep2Alert();
  });

  /* ---- Tags ---- */
  const MAX_TAGS = 10;

  function addTag(raw) {
    const tag = raw.trim().replace(/,+$/, '').trim();
    if (!tag || S.tags.includes(tag) || S.tags.length >= MAX_TAGS) return;
    S.tags.push(tag);
    renderTags();
  }

  function renderTags() {
    if (!tagsDisplay) return;
    tagsDisplay.innerHTML = '';
    S.tags.forEach((tag, i) => {
      const chip = document.createElement('span');
      chip.className = 'tag-chip';
      chip.innerHTML = `
        ${esc(tag)}
        <button type="button" aria-label="Remove tag ${esc(tag)}">
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      `;
      chip.querySelector('button').addEventListener('click', () => {
        S.tags.splice(i, 1);
        renderTags();
      });
      tagsDisplay.appendChild(chip);
    });
  }

  tagInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput.value);
      tagInput.value = '';
    }
  });

  tagInput?.addEventListener('blur', () => {
    if (tagInput.value.trim()) {
      addTag(tagInput.value);
      tagInput.value = '';
    }
  });

  /* ---- Photo grid ---- */
  const MAX_PHOTOS = 5;

  function buildPhotoGrid() {
    if (!photoGrid) return;
    photoGrid.innerHTML = '';

    S.photos.forEach((file, i) => {
      const url  = URL.createObjectURL(file);
      const slot = document.createElement('div');
      slot.className = 'photo-slot photo-slot--filled';
      slot.innerHTML = `
        <img src="${url}" alt="Photo ${i + 1}" class="photo-slot__img" />
        <button type="button" class="photo-slot__remove"
                aria-label="Remove photo ${i + 1}">
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      `;
      slot.querySelector('.photo-slot__remove').addEventListener('click', () => {
        S.photos.splice(i, 1);
        buildPhotoGrid();
      });
      photoGrid.appendChild(slot);
    });

    if (S.photos.length < MAX_PHOTOS) {
      const addSlot = document.createElement('label');
      addSlot.className = 'photo-slot photo-slot--add';
      addSlot.setAttribute('aria-label', 'Add photo');
      addSlot.innerHTML = `
        <i class="fa-solid fa-plus" aria-hidden="true"></i>
        <span>Add photo</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          class="photo-slot__input"
          multiple
          aria-hidden="true"
        />
      `;
      addSlot.querySelector('input').addEventListener('change', e => {
        const files   = Array.from(e.target.files || []);
        const allowed = MAX_PHOTOS - S.photos.length;
        const valid   = files.slice(0, allowed)
          .filter(f => f.size <= 10 * 1024 * 1024);
        S.photos = [...S.photos, ...valid];
        buildPhotoGrid();
        e.target.value = '';
      });
      photoGrid.appendChild(addSlot);
    }
  }

  /* ---- Location ---- */
  useLocationBtn?.addEventListener('click', () => {
    if (!navigator.geolocation) {
      showLocationStatus('Location not supported by your browser.');
      return;
    }
    showLocationStatus('Getting your location…');
    navigator.geolocation.getCurrentPosition(
      pos => {
        S.location = `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
        if (locationManual) locationManual.value = 'Current location detected';
        showLocationStatus('✓ Location set');
      },
      () => showLocationStatus('Could not detect location. Enter it manually.')
    );
  });

  function showLocationStatus(msg) {
    if (!locationStatus) return;
    locationStatus.textContent = msg;
    locationStatus.hidden = false;
  }

  locationManual?.addEventListener('input', () => {
    S.location = locationManual.value.trim();
  });

  /* ---- Price type chips ---- */
  priceChips.forEach(chip => {
    chip.addEventListener('click', () => {
      priceChips.forEach(c => c.setAttribute('aria-checked', 'false'));
      chip.setAttribute('aria-checked', 'true');
      S.priceType = chip.dataset.price;
      if (priceAmountWrap) priceAmountWrap.hidden = S.priceType !== 'fixed';
      hideStep2Alert();
    });
  });

  priceAmount?.addEventListener('input', () => {
    S.priceAmount = parseFloat(priceAmount.value) || null;
  });

  /* ---- Availability chips ---- */
  statusChips.forEach(chip => {
    chip.addEventListener('click', () => {
      statusChips.forEach(c => c.setAttribute('aria-checked', 'false'));
      chip.setAttribute('aria-checked', 'true');
      S.availability = chip.dataset.status;
    });
  });

  /* ---- Step 2 alerts ---- */
  function showStep2Alert(msg) {
    if (!step2Alert || !step2AlertText) return;
    step2AlertText.textContent = msg;
    step2Alert.hidden = false;
    step2Alert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideStep2Alert() {
    if (step2Alert) step2Alert.hidden = true;
  }

  /* ---- Step 2 validation ---- */
  function validateStep2() {
    const title = postTitle?.value.trim()       || '';
    const cat   = postCategory?.value           || '';
    const desc  = postDescription?.value.trim() || '';

    if (!title || title.length < 3) {
      showStep2Alert('Please add a title (at least 3 characters).');
      postTitle?.focus();
      return false;
    }
    if (!cat) {
      showStep2Alert('Please select a category.');
      postCategory?.focus();
      return false;
    }
    if (!desc) {
      showStep2Alert('Please add a description.');
      postDescription?.focus();
      return false;
    }
    if (!S.priceType) {
      showStep2Alert('Please select a price type.');
      return false;
    }
    if (S.priceType === 'fixed' && !S.priceAmount) {
      showStep2Alert('Please enter a price amount.');
      priceAmount?.focus();
      return false;
    }
    return true;
  }

  /* ---- Step 2 navigation ---- */
  step2Back?.addEventListener('click', () => goToStep(1));

  step2Next?.addEventListener('click', () => {
    hideStep2Alert();

    // Collect current values
    S.title       = postTitle?.value.trim()       || '';
    S.category    = postCategory?.value           || '';
    S.description = postDescription?.value.trim() || '';
    S.location    = locationManual?.value.trim()  || S.location;

    if (!validateStep2()) return;

    buildPreview();
    goToStep(3);
  });


  /* ==========================================================
     STEP 3 — PREVIEW
  ========================================================== */

  function buildPreview() {
    /* ---- Photos ---- */
    if (previewPhotos) {
      if (S.photos.length > 0) {
        previewPhotos.innerHTML = '';
        const img = document.createElement('img');
        img.src       = URL.createObjectURL(S.photos[0]);
        img.alt       = 'Listing preview photo';
        img.className = 'preview-card__photo';
        img.style.cssText =
          'width:100%;height:100%;object-fit:cover;border-radius:16px 16px 0 0';
        previewPhotos.appendChild(img);
      } else {
        previewPhotos.innerHTML = `
          <div class="preview-card__photo-placeholder" aria-hidden="true">
            <i class="fa-solid fa-image"></i>
          </div>`;
      }
    }

    /* ---- Badges ---- */
    const typeLabels = { product:'Product', service:'Service', request:'Request' };
    const statusLabels = {
      available:'Available', busy:'Busy',
      out_of_stock:'Out of Stock', coming_soon:'Coming Soon',
    };
    if (previewTypeBadge)   previewTypeBadge.textContent   = typeLabels[S.listingType]   || S.listingType;
    if (previewStatusBadge) previewStatusBadge.textContent = statusLabels[S.availability] || S.availability;

    /* ---- Content ---- */
    if (previewTitle)       previewTitle.textContent       = S.title       || 'Your title';
    if (previewDescription) previewDescription.textContent = S.description || 'Your description';

    /* ---- Price ---- */
    if (previewPrice) {
      const priceMap = {
        fixed:      S.priceAmount ? '₦' + Number(S.priceAmount).toLocaleString('en-NG') : '—',
        negotiable: 'Negotiable',
        free:       'Free',
        contact:    'Contact for price',
        quote:      'Request a quote',
      };
      previewPrice.textContent = priceMap[S.priceType] || '—';
    }

    /* ---- Location ---- */
    if (previewLocationText) {
      previewLocationText.textContent = S.location || 'Location not set';
    }

    /* ---- Tags ---- */
    if (previewTags) {
      if (S.tags.length > 0) {
        previewTags.innerHTML = S.tags
          .map(t => `<span class="preview-tag">#${esc(t)}</span>`)
          .join('');
        previewTags.hidden = false;
      } else {
        previewTags.hidden = true;
      }
    }

    /* ---- Seller info ---- */
    if (S.profile) {
      if (previewSellerName) previewSellerName.textContent = JARAProfile.getDisplayName(S.profile) || 'You';
      if (previewAvatar)     previewAvatar.textContent     = JARAProfile.getInitials(S.profile);
      if (previewSellerType && S.profile.account_type) {
        previewSellerType.textContent =
          S.profile.account_type.charAt(0).toUpperCase() +
          S.profile.account_type.slice(1);
      }
      if (previewWhatsapp && S.profile.whatsapp) {
        const num = S.profile.whatsapp.replace(/\D/g, '');
        previewWhatsapp.href = `https://wa.me/${num}`;
      }
    }
  }

  /* ---- Step 3 navigation ---- */
  step3Back?.addEventListener('click', () => goToStep(2));

  step3Next?.addEventListener('click', () => {
    goToStep(4);
    handlePublish();
  });


  /* ==========================================================
     STEP 4 — PUBLISH TO SUPABASE
  ========================================================== */

  async function handlePublish() {
    // Show publishing animation
    if (publishingState) publishingState.hidden = false;
    if (successState)    successState.hidden    = true;

    // Disable topbar back so user can't navigate away mid-publish
    if (topbarBack) topbarBack.hidden = true;

    try {
      const fields = {
        title:           S.title,
        description:     S.description,
        category:        S.category,
        listing_type:    S.listingType,
        price:           S.priceType === 'fixed' ? S.priceAmount : null,
        negotiable:      S.priceType === 'negotiable',
        condition:       null,
        location:        S.location || 'Redeemer\'s University, Ede',
        _existingImages: [],
      };

      const { data, error } = await JARAListings.create(fields, S.photos);

      if (error) {
        showPublishError('Failed to publish: ' + (error.message || 'Please try again.'));
        return;
      }

      // Success
      S.publishedId = data?.id || null;

      // Wire up JARA ID badge
      if (jaraIdDisplay && S.profile?.jara_id) {
  jaraIdDisplay.textContent = S.profile.jara_id;
      }

      copyJaraId?.addEventListener('click', () => {
        const idText = jaraIdDisplay?.textContent || '';
        navigator.clipboard?.writeText(idText).then(() => {
          window.jaraToast?.('JARA ID copied!');
        });
      });

      // Wire success share buttons
      document.querySelectorAll('[data-context="success"]').forEach(btn => {
        btn.addEventListener('click', () => {
          handleSuccessShare(btn.dataset.platform);
        });
      });

      // Fix the "Go to Dashboard" link — point to explore
      const dashLink = successState?.querySelector('a[href*="dashboard"]');
      if (dashLink && S.publishedId) {
        dashLink.href        = `../listing/index.html?id=${S.publishedId}`;
        dashLink.textContent = '';
        dashLink.innerHTML   = `View Your Listing <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>`;
      } else if (dashLink) {
        dashLink.href = '../explore/index.html';
        dashLink.innerHTML = `Go to Explore <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>`;
      }

      // Show success screen
      if (publishingState) publishingState.hidden = true;
      if (successState)    successState.hidden    = false;

      // Update topbar
      if (topbarTitle) topbarTitle.textContent = 'You\'re Live! 🎉';

    } catch (err) {
      console.error('Publish error:', err.message);
      showPublishError('An unexpected error occurred. Please try again.');
    }
  }

  function showPublishError(msg) {
    if (publishingState) publishingState.hidden = true;
    if (successState)    successState.hidden    = false;
    if (publishError)    publishError.hidden    = false;
    if (publishErrorText) publishErrorText.textContent = msg;

    // Re-enable back button so user can try again
    if (topbarBack) {
      topbarBack.hidden = false;
      topbarBack.addEventListener('click', () => goToStep(3), { once: true });
    }
  }

  function handleSuccessShare(platform) {
    const url   = S.publishedId
      ? `${window.location.origin}/JARA/listing/index.html?id=${S.publishedId}`
      : window.location.href;
    const text  = encodeURIComponent(`Check out my listing on JARA ∆: ${S.title}`);
    const encUrl = encodeURIComponent(url);

    const shareUrls = {
      whatsapp:  `https://wa.me/?text=${text}%20${encUrl}`,
      facebook:  `https://www.facebook.com/sharer/sharer.php?u=${encUrl}`,
      instagram: null, // Instagram doesn't support direct share URLs
      copy:      null,
    };

    if (platform === 'copy' || platform === 'instagram') {
      navigator.clipboard?.writeText(url).then(() => {
        window.jaraToast?.('Link copied!');
      });
      return;
    }

    if (shareUrls[platform]) {
      window.open(shareUrls[platform], '_blank', 'noopener');
    }
  }

  /* ---- Create Another ---- */
  createAnotherBtn?.addEventListener('click', () => {
    resetWizard();
    goToStep(1);
  });


  /* ==========================================================
     SHARE BUTTONS ON STEP 3 PREVIEW
  ========================================================== */

  document.querySelectorAll('#shareBtns .share-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const platform = btn.dataset.platform;
      const url      = window.location.href;

      if (platform === 'copy') {
        navigator.clipboard?.writeText(url).then(() => {
          window.jaraToast?.('Link copied!');
        });
        return;
      }

      if (platform === 'whatsapp') {
        const text = encodeURIComponent(`Check out this listing on JARA ∆: ${S.title}`);
        window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener');
        return;
      }

      if (platform === 'facebook') {
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
          '_blank', 'noopener'
        );
        return;
      }

      if (platform === 'instagram') {
        navigator.clipboard?.writeText(url).then(() => {
          window.jaraToast?.('Link copied — paste it on Instagram!');
        });
      }
    });
  });


  /* ==========================================================
     RESET WIZARD
  ========================================================== */

  function resetWizard() {
    S.listingType  = null;
    S.title        = '';
    S.category     = '';
    S.description  = '';
    S.tags         = [];
    S.photos       = [];
    S.location     = '';
    S.priceType    = null;
    S.priceAmount  = null;
    S.availability = 'available';
    S.publishedId  = null;

    // Reset type cards
    typeCards.forEach(c => {
      c.classList.remove('type-card--selected');
      c.setAttribute('aria-checked', 'false');
    });

    // Reset form fields
    if (postTitle)       postTitle.value       = '';
    if (postCategory)    postCategory.value    = '';
    if (postDescription) postDescription.value = '';
    if (locationManual)  locationManual.value  = '';
    if (priceAmount)     priceAmount.value     = '';
    if (priceAmountWrap) priceAmountWrap.hidden = true;
    if (locationStatus)  locationStatus.hidden  = true;
    if (titleCharCount)  titleCharCount.textContent  = '0 / 120';
    if (descCharCount)   descCharCount.textContent   = '0 / 2000';

    // Reset chips
    priceChips.forEach(c  => c.setAttribute('aria-checked', 'false'));
    statusChips.forEach((c, i) => c.setAttribute('aria-checked', i === 0 ? 'true' : 'false'));

    // Reset tags and photos
    S.tags   = [];
    S.photos = [];
    renderTags();
    buildPhotoGrid();

    // Hide errors
    if (typeError) typeError.hidden = true;
    hideStep2Alert();

    // Reset step 4
    if (publishingState) publishingState.hidden = false;
    if (successState)    successState.hidden    = true;
    if (publishError)    publishError.hidden    = true;
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


  /* ==========================================================
     INIT
  ========================================================== */

  async function init() {
    S.profile = await JARAProfile.load();
    buildCategories();
    buildPhotoGrid();
    goToStep(1);
  }

  init();

});
