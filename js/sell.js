/* ============================================================
   JARA ∆ — Create / Edit Listing
   js/sell.js

   Handles both CREATE and EDIT modes for listings.

   CREATE MODE (default):
     4-step wizard: Type → Details → Preview → Publish

   EDIT MODE (?edit=LISTING_ID in URL):
     Skips Step 1, pre-fills Step 2 with existing data,
     publishes as an UPDATE not an INSERT.

   All IDs verified against sell/index.html.

   Depends on:
     - window._supabase    (supabase-client.js)
     - window.JARAAuth     (auth-guard.js)
     - window.JARAProfile  (jara-profile.js)
     - window.JARAListings (jara-listings.js)
============================================================ */

document.addEventListener('DOMContentLoaded', async () => {

  /* ==========================================================
     MODE DETECTION
     ?edit=ID → edit mode
     (no param) → create mode
  ========================================================== */

  const urlParams  = new URLSearchParams(window.location.search);
  const EDIT_ID    = urlParams.get('edit') || null;
  const IS_EDIT    = !!EDIT_ID;

  /* ==========================================================
     STATE
  ========================================================== */

  const S = {
    // Wizard
    step:            IS_EDIT ? 2 : 1,
    listingType:     null,
    title:           '',
    category:        '',
    description:     '',
    tags:            [],
    newImageFiles:   [],      // File objects to upload
    existingImages:  [],      // URLs already in Storage (edit mode)
    removedImageUrls:[],      // existing URLs the user removed
    location:        '',
    priceType:       null,
    priceAmount:     null,
    availability:    'available',
    profile:         null,
    isLoading:       false,
    publishedId:     null,    // set after successful create/update
  };

  const TOTAL_STEPS = 4;
  const MAX_PHOTOS  = 5;

  /* ==========================================================
     CATEGORIES
  ========================================================== */

  const CATEGORIES = [
    'Books & Stationery', 'Food & Drinks', 'Tech & Repairs',
    'Personal Care', 'Creative Services', 'Laundry & Errands',
    'Tutoring', 'Hostel & Home', 'Power & Generator',
    'Fashion & Clothing', 'Health & Wellness', 'Transport', 'Other',
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
  const step2Subtitle   = document.getElementById('step2Subtitle');
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
  const priceChips      = document.querySelectorAll('.price-chip');
  const statusChips     = document.querySelectorAll('.status-chip');
  const deleteListingBtn= document.getElementById('deleteListingBtn');
  const step2Back       = document.getElementById('step2Back');
  const step2Next       = document.getElementById('step2Next');

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
  const viewListingBtn  = document.getElementById('viewListingBtn');
  const createAnotherBtn= document.getElementById('createAnotherBtn');
  const publishError    = document.getElementById('publishError');
  const publishErrorText= document.getElementById('publishErrorText');


  /* ==========================================================
     STEP NAVIGATION
  ========================================================== */

  const ALL_STEPS = [step1, step2, step3, step4];
  const PROGRESS_PCT = { 1: 0, 2: 33, 3: 66, 4: 100 };
  const STEP_TITLES  = { 1: 'Create', 2: IS_EDIT ? 'Edit' : 'Details', 3: 'Preview', 4: IS_EDIT ? 'Saving…' : 'Publishing' };

  function goToStep(n) {
    S.step = n;

    ALL_STEPS.forEach((el, i) => {
      if (!el) return;
      el.hidden = (i + 1) !== n;
      el.classList.toggle('sell-step--active', (i + 1) === n);
    });

    // Back button — hidden on step 1, also hidden on step 4
    if (topbarBack) topbarBack.hidden = (n <= 1 || n === 4);

    // Title
    if (topbarTitle) topbarTitle.textContent = STEP_TITLES[n] || 'Create';

    // Step badge — hidden on step 1
    if (topbarStepBadge && topbarStepText) {
      topbarStepBadge.hidden = n <= 1;
      topbarStepText.textContent = `Step ${n} of ${TOTAL_STEPS}`;
    }

    // Progress bar
    if (sellProgress && progressFill) {
      sellProgress.hidden = n <= 1;
      progressFill.style.width = (PROGRESS_PCT[n] || 0) + '%';
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Topbar back
  topbarBack?.addEventListener('click', () => {
    if (S.step > 1 && S.step < 4) goToStep(S.step - 1);
  });


  /* ==========================================================
     STEP 1 — TYPE SELECTION (create mode only)
  ========================================================== */

  typeCards.forEach(card => {
    card.addEventListener('click', () => {
      typeCards.forEach(c => {
        c.classList.remove('type-card--selected');
        c.setAttribute('aria-checked', 'false');
      });
      card.classList.add('type-card--selected');
      card.setAttribute('aria-checked', 'true');
      S.listingType = card.dataset.type;
      if (typeError) typeError.hidden = true;
    });
  });

  step1Next?.addEventListener('click', () => {
    if (!S.listingType) {
      if (typeError) typeError.hidden = false;
      return;
    }
    updateStep2Heading();
    goToStep(2);
  });

  function updateStep2Heading() {
    const eyebrows = {
      product: 'Product details',
      service: 'Service details',
      request: 'Request details',
    };
    if (step2Eyebrow) step2Eyebrow.textContent = eyebrows[S.listingType] || 'Details';
  }


  /* ==========================================================
     STEP 2 — DETAILS
  ========================================================== */

  /* ---- Categories ---- */
  function buildCategories() {
    if (!postCategory) return;
    postCategory.innerHTML = '<option value="" disabled selected>Select a category</option>';
    CATEGORIES.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      postCategory.appendChild(opt);
    });
  }

  /* ---- Char counters ---- */
  postTitle?.addEventListener('input', () => {
    if (titleCharCount) titleCharCount.textContent = `${postTitle.value.length} / 120`;
    hideStep2Alert();
  });

  postDescription?.addEventListener('input', () => {
    if (descCharCount) descCharCount.textContent = `${postDescription.value.length} / 2000`;
    hideStep2Alert();
  });

  /* ---- Tags ---- */
  function addTag(raw) {
    const tag = raw.trim().replace(/,+$/, '').trim();
    if (!tag || S.tags.includes(tag) || S.tags.length >= 10) return;
    S.tags.push(tag);
    renderTags();
  }

  function renderTags() {
    if (!tagsDisplay) return;
    tagsDisplay.innerHTML = '';
    S.tags.forEach((tag, i) => {
      const chip = document.createElement('span');
      chip.className = 'tag-chip';
      chip.innerHTML = `${esc(tag)}<button type="button" aria-label="Remove ${esc(tag)}"><i class="fa-solid fa-xmark"></i></button>`;
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
    if (tagInput.value.trim()) { addTag(tagInput.value); tagInput.value = ''; }
  });

  /* ---- Photo grid ---- */
  function buildPhotoGrid() {
    if (!photoGrid) return;
    photoGrid.innerHTML = '';

    // Existing images (edit mode)
    S.existingImages.forEach((url, i) => {
      const slot = document.createElement('div');
      slot.className = 'photo-slot photo-slot--filled';
      slot.innerHTML = `
        <img src="${esc(url)}" alt="Photo ${i + 1}" class="photo-slot__img" />
        <button type="button" class="photo-slot__remove" aria-label="Remove photo ${i + 1}">
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      `;
      slot.querySelector('.photo-slot__remove').addEventListener('click', () => {
        S.existingImages    = S.existingImages.filter(u => u !== url);
        S.removedImageUrls  = [...S.removedImageUrls, url];
        buildPhotoGrid();
      });
      photoGrid.appendChild(slot);
    });

    // New file slots
    S.newImageFiles.forEach((file, i) => {
      const url  = URL.createObjectURL(file);
      const slot = document.createElement('div');
      slot.className = 'photo-slot photo-slot--filled';
      slot.innerHTML = `
        <img src="${esc(url)}" alt="New photo ${i + 1}" class="photo-slot__img" />
        <button type="button" class="photo-slot__remove" aria-label="Remove photo">
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      `;
      slot.querySelector('.photo-slot__remove').addEventListener('click', () => {
        S.newImageFiles.splice(i, 1);
        buildPhotoGrid();
      });
      photoGrid.appendChild(slot);
    });

    // Add slot (if under limit)
    const total = S.existingImages.length + S.newImageFiles.length;
    if (total < MAX_PHOTOS) {
      const addSlot = document.createElement('label');
      addSlot.className = 'photo-slot photo-slot--add';
      addSlot.setAttribute('aria-label', 'Add photo');
      addSlot.innerHTML = `
        <i class="fa-solid fa-plus" aria-hidden="true"></i>
        <span>Add photo</span>
        <input type="file" accept="image/jpeg,image/png,image/webp"
               class="photo-slot__input" multiple aria-hidden="true" />
      `;
      addSlot.querySelector('input').addEventListener('change', e => {
        const files   = Array.from(e.target.files || []);
        const allowed = MAX_PHOTOS - S.existingImages.length - S.newImageFiles.length;
        const valid   = files.slice(0, allowed).filter(f => f.size <= 10 * 1024 * 1024);
        S.newImageFiles = [...S.newImageFiles, ...valid];
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

  /* ---- Price chips ---- */
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

  /* ---- Validation ---- */
  function validateStep2() {
    hideStep2Alert();
    const title = postTitle?.value.trim() || '';
    const cat   = postCategory?.value    || '';
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
      showStep2Alert('Please enter the price amount.');
      priceAmount?.focus();
      return false;
    }
    return true;
  }

  /* ---- Step 2 navigation ---- */
  step2Back?.addEventListener('click', () => {
    if (IS_EDIT) {
      // In edit mode, back goes to the listing detail page
      window.location.replace(`../listing/index.html?id=${EDIT_ID}`);
    } else {
      goToStep(1);
    }
  });

  step2Next?.addEventListener('click', () => {
    hideStep2Alert();

    S.title       = postTitle?.value.trim()       || '';
    S.category    = postCategory?.value           || '';
    S.description = postDescription?.value.trim() || '';
    S.location    = locationManual?.value.trim()  || S.location;

    if (!validateStep2()) return;

    buildPreview();
    goToStep(3);
  });


  /* ==========================================================
     DELETE LISTING (edit mode only)
  ========================================================== */

  deleteListingBtn?.addEventListener('click', async () => {
    if (!EDIT_ID) return;

    const confirmed = window.confirm(
      'Delete this listing permanently?\n\n' +
      'This cannot be undone. All photos will also be removed.'
    );
    if (!confirmed) return;

    deleteListingBtn.disabled    = true;
    deleteListingBtn.textContent = 'Deleting…';

    try {
      const { error } = await JARAListings.remove(EDIT_ID);

      if (error) {
        deleteListingBtn.disabled = false;
        deleteListingBtn.innerHTML =
          '<i class="fa-solid fa-trash" aria-hidden="true"></i> Delete Listing';
        showStep2Alert('Delete failed: ' + (error.message || 'Please try again.'));
        return;
      }

      // Success — return to store
      window.location.replace('../store/index.html');

    } catch (err) {
      console.error('Delete listing error:', err.message);
      deleteListingBtn.disabled = false;
      deleteListingBtn.innerHTML =
        '<i class="fa-solid fa-trash" aria-hidden="true"></i> Delete Listing';
      showStep2Alert('An unexpected error occurred. Please try again.');
    }
  });


  /* ==========================================================
     STEP 3 — PREVIEW
  ========================================================== */

  function buildPreview() {
    /* ---- Photos ---- */
    if (previewPhotos) {
      previewPhotos.innerHTML = '';
      const firstNew      = S.newImageFiles[0];
      const firstExisting = S.existingImages[0];

      if (firstNew) {
        const img = document.createElement('img');
        img.src       = URL.createObjectURL(firstNew);
        img.alt       = 'Listing preview';
        img.className = 'preview-card__photo';
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:16px 16px 0 0';
        previewPhotos.appendChild(img);
      } else if (firstExisting) {
        const img = document.createElement('img');
        img.src       = firstExisting;
        img.alt       = 'Listing preview';
        img.className = 'preview-card__photo';
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:16px 16px 0 0';
        previewPhotos.appendChild(img);
      } else {
        previewPhotos.innerHTML = `
          <div class="preview-card__photo-placeholder" aria-hidden="true">
            <i class="fa-solid fa-image"></i>
          </div>`;
      }
    }

    /* ---- Type + status badges ---- */
    const typeLabels   = { product:'Product', service:'Service', request:'Request' };
    const statusLabels = { available:'Available', busy:'Busy', out_of_stock:'Out of Stock', coming_soon:'Coming Soon' };
    if (previewTypeBadge)   previewTypeBadge.textContent   = typeLabels[S.listingType]   || S.listingType;
    if (previewStatusBadge) previewStatusBadge.textContent = statusLabels[S.availability] || S.availability;

    /* ---- Content ---- */
    if (previewTitle)       previewTitle.textContent       = S.title       || 'Your title';
    if (previewDescription) previewDescription.textContent = S.description || 'Your description';
    if (previewLocationText) previewLocationText.textContent = S.location  || 'Location not set';

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

    /* ---- Tags ---- */
    if (previewTags) {
      if (S.tags.length > 0) {
        previewTags.innerHTML = S.tags.map(t => `<span class="preview-tag">#${esc(t)}</span>`).join('');
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
          S.profile.account_type.charAt(0).toUpperCase() + S.profile.account_type.slice(1);
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
    if (IS_EDIT) {
      handleUpdate();
    } else {
      handlePublish();
    }
  });

  /* ---- Share buttons on preview ---- */
  document.querySelectorAll('#shareBtns .share-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const platform = btn.dataset.platform;
      const url      = window.location.href;
      const text     = encodeURIComponent(`Check out this listing on JARA ∆: ${S.title}`);

      if (platform === 'copy' || platform === 'instagram') {
        navigator.clipboard?.writeText(url).then(() => window.jaraToast?.('Link copied!'));
      } else if (platform === 'whatsapp') {
        window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener');
      } else if (platform === 'facebook') {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'noopener');
      }
    });
  });


  /* ==========================================================
     STEP 4 — PUBLISH (create mode)
  ========================================================== */

  async function handlePublish() {
    if (S.isLoading) return;
    S.isLoading = true;

    if (publishingState) publishingState.hidden = false;
    if (successState)    successState.hidden    = true;
    if (publishError)    publishError.hidden    = true;

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

      const { data, error } = await JARAListings.create(fields, S.newImageFiles);

      if (error) {
        showPublishError('Failed to publish: ' + (error.message || 'Please try again.'));
        return;
      }

      S.publishedId = data?.id || null;
      S.isLoading   = false;

      // Wire JARA ID display
      if (jaraIdDisplay && S.profile?.jara_id) {
        jaraIdDisplay.textContent = S.profile.jara_id;
      }

      // Wire "View Your Listing" button
      if (viewListingBtn && S.publishedId) {
        viewListingBtn.href = `../listing/index.html?id=${S.publishedId}`;
      }

      // Copy JARA ID
      copyJaraId?.addEventListener('click', () => {
        const id = jaraIdDisplay?.textContent || '';
        navigator.clipboard?.writeText(id).then(() => window.jaraToast?.('JARA ID copied!'));
      });

      if (publishingState) publishingState.hidden = true;
      if (successState)    successState.hidden    = false;
      if (topbarTitle)     topbarTitle.textContent = 'You\'re Live! 🎉';

    } catch (err) {
      console.error('Publish error:', err.message);
      showPublishError('An unexpected error occurred. Please try again.');
    }
  }

  function showPublishError(msg) {
    S.isLoading = false;
    if (publishingState) publishingState.hidden = true;
    if (successState)    successState.hidden    = false;
    if (publishError)    publishError.hidden    = false;
    if (publishErrorText) publishErrorText.textContent = msg;
    if (topbarBack) {
      topbarBack.hidden = false;
      topbarBack.onclick = () => goToStep(3);
    }
  }


  /* ==========================================================
     STEP 4 — UPDATE (edit mode)
  ========================================================== */

  async function handleUpdate() {
    if (S.isLoading) return;
    S.isLoading = true;

    if (publishingState) publishingState.hidden = false;
    if (successState)    successState.hidden    = true;
    if (publishError)    publishError.hidden    = true;
    if (topbarTitle)     topbarTitle.textContent = 'Saving…';

    try {
      const fields = {
        title:           S.title,
        description:     S.description,
        category:        S.category,
        listing_type:    S.listingType,
        price:           S.priceType === 'fixed' ? S.priceAmount : null,
        negotiable:      S.priceType === 'negotiable',
        location:        S.location || 'Redeemer\'s University, Ede',
        _existingImages: S.existingImages,
      };

      const { data, error } = await JARAListings.update(
        EDIT_ID,
        fields,
        S.newImageFiles,
        S.removedImageUrls
      );

      if (error) {
        showPublishError('Update failed: ' + (error.message || 'Please try again.'));
        return;
      }

      S.isLoading = false;
      // Redirect to the updated listing
      window.location.replace(`../listing/index.html?id=${EDIT_ID}`);

    } catch (err) {
      console.error('Update error:', err.message);
      showPublishError('An unexpected error occurred. Please try again.');
    }
  }


  /* ==========================================================
     LOAD EXISTING LISTING (edit mode)
  ========================================================== */

  async function loadExistingListing() {
    try {
      const { data: listing, error } = await JARAListings.fetchOne(EDIT_ID);

      if (error || !listing) {
        showStep2Alert('Could not load this listing. Please go back and try again.');
        return;
      }

      // Security — only the owner can edit
      const owned = await JARAListings.isOwner(listing);
      if (!owned) {
        window.location.replace('../explore/index.html');
        return;
      }

      // Store state
      S.listingType      = listing.listing_type || 'product';
      S.existingImages   = listing.images        || [];
      S.removedImageUrls = [];

      // Update headings
      const eyebrows = { product:'Edit product', service:'Edit service', request:'Edit request' };
      if (step2Eyebrow)  step2Eyebrow.textContent  = eyebrows[S.listingType] || 'Edit listing';
      if (step2Subtitle) step2Subtitle.textContent = 'Update your listing details.';

      // Pre-fill fields
      if (postTitle)       postTitle.value       = listing.title        || '';
      if (postDescription) postDescription.value = listing.description  || '';
      if (postCategory)    postCategory.value    = listing.category     || '';
      if (locationManual)  locationManual.value  = listing.location     || '';
      S.location = listing.location || '';

      // Update char counters
      if (titleCharCount) titleCharCount.textContent  = `${(listing.title || '').length} / 120`;
      if (descCharCount)  descCharCount.textContent   = `${(listing.description || '').length} / 2000`;

      // Price chips
      if (listing.negotiable) {
        const chip = document.querySelector('.price-chip[data-price="negotiable"]');
        if (chip) {
          priceChips.forEach(c => c.setAttribute('aria-checked', 'false'));
          chip.setAttribute('aria-checked', 'true');
          S.priceType = 'negotiable';
          if (priceAmountWrap) priceAmountWrap.hidden = true;
        }
      } else if (listing.price !== null && listing.price !== undefined) {
        const chip = document.querySelector('.price-chip[data-price="fixed"]');
        if (chip) {
          priceChips.forEach(c => c.setAttribute('aria-checked', 'false'));
          chip.setAttribute('aria-checked', 'true');
          S.priceType   = 'fixed';
          S.priceAmount = listing.price;
          if (priceAmount)     priceAmount.value     = listing.price;
          if (priceAmountWrap) priceAmountWrap.hidden = false;
        }
      } else {
        const chip = document.querySelector('.price-chip[data-price="free"]');
        if (chip) {
          priceChips.forEach(c => c.setAttribute('aria-checked', 'false'));
          chip.setAttribute('aria-checked', 'true');
          S.priceType = 'free';
          if (priceAmountWrap) priceAmountWrap.hidden = true;
        }
      }

      // Show delete button
      if (deleteListingBtn) deleteListingBtn.hidden = false;

      // Render existing image previews
      buildPhotoGrid();

    } catch (err) {
      console.error('loadExistingListing error:', err.message);
      showStep2Alert('An unexpected error occurred loading this listing.');
    }
  }


  /* ==========================================================
     CREATE ANOTHER
  ========================================================== */

  createAnotherBtn?.addEventListener('click', () => {
    // Navigate to a clean create page
    window.location.replace('../sell/index.html');
  });


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
    // Wait for auth session before doing anything
    // This ensures isOwner() has a valid session to check against
    try {
      const result = await JARAAuth.getCurrentUser();
      if (!result) {
        window.location.replace('../auth/login.html');
        return;
      }
      S.profile = result.profile || await JARAProfile.load();
    } catch (err) {
      console.error('Sell init: auth error', err.message);
      window.location.replace('../auth/login.html');
      return;
    }

    buildCategories();

    if (IS_EDIT) {
      if (topbarTitle) topbarTitle.textContent = 'Edit Listing';
      goToStep(2);
      await loadExistingListing();
    } else {
      buildPhotoGrid();
      goToStep(1);
    }
    }

  init();

});
