/* ============================================================
   JARA ∆ — Create / Edit Listing  (listings-integrated)
   js/sell.js

   Handles the create and edit listing flow.
   Saves everything to Supabase via JARAListings.

   Depends on:
     - window._supabase    (supabase-client.js)
     - window.JARAAuth     (auth-guard.js)
     - window.JARAProfile  (jara-profile.js)
     - window.JARAListings (jara-listings.js)

   URL params:
     ?edit=LISTING_ID  — load and edit existing listing
     (no params)       — create new listing

   TABLE OF CONTENTS
   1.  State
   2.  DOM refs
   3.  Mode detection (create vs edit)
   4.  Form field collection
   5.  Image management
   6.  Validation
   7.  Load existing listing (edit mode)
   8.  Form submit
   9.  Delete listing
   10. Init
============================================================ */

document.addEventListener('DOMContentLoaded', async () => {

  /* ==========================================================
     1. STATE
  ========================================================== */

  const S = {
    mode:             'create',    // 'create' | 'edit'
    listingId:        null,
    existingListing:  null,
    existingImages:   [],          // URLs already in Supabase
    newImageFiles:    [],          // File objects to upload
    removedImageUrls: [],          // existing URLs to delete
    profile:          null,
  };


  /* ==========================================================
     2. DOM REFS
  ========================================================== */

  const form          = document.getElementById('sellForm') ||
                        document.getElementById('listingForm');
  const titleInput    = document.getElementById('listingTitle');
  const descInput     = document.getElementById('listingDesc');
  const categoryInput = document.getElementById('listingCategory');
  const typeInput     = document.getElementById('listingType');
  const priceInput    = document.getElementById('listingPrice');
  const negCheckbox   = document.getElementById('listingNegotiable');
  const conditionInput= document.getElementById('listingCondition');
  const locationInput = document.getElementById('listingLocation');
  const imageInput    = document.getElementById('listingImages');
  const imagePreview  = document.getElementById('imagePreviewGrid');
  const submitBtn     = document.getElementById('submitListingBtn');
  const deleteBtn     = document.getElementById('deleteListingBtn');
  const pageTitle     = document.getElementById('sellPageTitle');
  const alertEl       = document.getElementById('sellAlert');
  const alertText     = document.getElementById('sellAlertText');


  /* ==========================================================
     3. MODE DETECTION
  ========================================================== */

  const params = new URLSearchParams(window.location.search);
  const editId = params.get('edit');

  if (editId) {
    S.mode      = 'edit';
    S.listingId = editId;
    if (pageTitle) pageTitle.textContent = 'Edit Listing';
    if (submitBtn) submitBtn.textContent = 'Save Changes';
    if (deleteBtn) deleteBtn.removeAttribute('hidden');
  }


  /* ==========================================================
     4. FORM FIELD COLLECTION
  ========================================================== */

  function collectFields() {
    return {
      title:        titleInput?.value.trim()     || '',
      description:  descInput?.value.trim()      || '',
      category:     categoryInput?.value         || '',
      listing_type: typeInput?.value             || 'product',
      price:        priceInput?.value            || null,
      negotiable:   negCheckbox?.checked         || false,
      condition:    conditionInput?.value        || null,
      location:     locationInput?.value.trim()  || '',
      _existingImages: S.existingImages,
    };
  }


  /* ==========================================================
     5. IMAGE MANAGEMENT
  ========================================================== */

  function renderImagePreviews() {
    if (!imagePreview) return;
    imagePreview.innerHTML = '';

    // Existing images
    S.existingImages.forEach((url, i) => {
      const wrap = document.createElement('div');
      wrap.className = 'img-preview-wrap';
      wrap.innerHTML = `
        <img src="${esc(url)}" alt="Listing image ${i + 1}" loading="lazy"
             class="img-preview" />
        <button type="button" class="img-preview__remove"
                data-existing="${esc(url)}" aria-label="Remove image">
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      `;
      wrap.querySelector('.img-preview__remove').addEventListener('click', () => {
        S.existingImages    = S.existingImages.filter(u => u !== url);
        S.removedImageUrls  = [...S.removedImageUrls, url];
        renderImagePreviews();
      });
      imagePreview.appendChild(wrap);
    });

    // New files queued for upload
    S.newImageFiles.forEach((file, i) => {
      const url  = URL.createObjectURL(file);
      const wrap = document.createElement('div');
      wrap.className = 'img-preview-wrap';
      wrap.innerHTML = `
        <img src="${url}" alt="New image ${i + 1}" class="img-preview" />
        <button type="button" class="img-preview__remove"
                data-new="${i}" aria-label="Remove image">
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      `;
      wrap.querySelector('.img-preview__remove').addEventListener('click', () => {
        S.newImageFiles.splice(i, 1);
        renderImagePreviews();
      });
      imagePreview.appendChild(wrap);
    });
  }

  imageInput?.addEventListener('change', (e) => {
    const files  = Array.from(e.target.files || []);
    const total  = S.existingImages.length + S.newImageFiles.length + files.length;
    const allowed = 8 - S.existingImages.length - S.newImageFiles.length;

    const valid = files.slice(0, allowed).filter(f => f.size <= 5 * 1024 * 1024);
    if (valid.length < files.length) {
      showAlert('Some images were skipped (max 5 MB each, max 8 total).');
    }

    S.newImageFiles = [...S.newImageFiles, ...valid];
    renderImagePreviews();
    e.target.value = ''; // allow re-selecting same file
  });


  /* ==========================================================
     6. VALIDATION
  ========================================================== */

  function validate(fields) {
    if (!fields.title) {
      showAlert('Please add a title for your listing.');
      titleInput?.focus();
      return false;
    }
    if (fields.title.length < 3) {
      showAlert('Title must be at least 3 characters.');
      titleInput?.focus();
      return false;
    }
    if (!fields.listing_type) {
      showAlert('Please select a listing type.');
      return false;
    }
    if (!fields.category) {
      showAlert('Please select a category.');
      return false;
    }
    return true;
  }


  /* ==========================================================
     7. LOAD EXISTING LISTING (edit mode)
  ========================================================== */

  async function loadExistingListing() {
    if (!S.listingId) return;

    const { data: listing, error } = await JARAListings.fetchOne(S.listingId);

    if (error || !listing) {
      showAlert('Could not load this listing. Please try again.');
      return;
    }

    // Security check — only owner can edit
    const owned = await JARAListings.isOwner(listing);
    if (!owned) {
      window.location.replace('../explore/index.html');
      return;
    }

    S.existingListing = listing;
    S.existingImages  = listing.images || [];

    // Fill form
    if (titleInput)     titleInput.value     = listing.title        || '';
    if (descInput)      descInput.value      = listing.description  || '';
    if (categoryInput)  categoryInput.value  = listing.category     || '';
    if (typeInput)      typeInput.value      = listing.listing_type || 'product';
    if (priceInput)     priceInput.value     = listing.price        || '';
    if (negCheckbox)    negCheckbox.checked  = listing.negotiable   || false;
    if (conditionInput) conditionInput.value = listing.condition    || '';
    if (locationInput)  locationInput.value  = listing.location     || '';

    renderImagePreviews();
  }


  /* ==========================================================
     8. FORM SUBMIT
  ========================================================== */

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const fields = collectFields();
    if (!validate(fields)) return;

    setLoading(true);

    try {
      let result;

      if (S.mode === 'create') {
        result = await JARAListings.create(fields, S.newImageFiles);
      } else {
        result = await JARAListings.update(
          S.listingId,
          fields,
          S.newImageFiles,
          S.removedImageUrls
        );
      }

      if (result.error) {
        showAlert('Failed to save listing: ' + result.error.message);
        setLoading(false);
        return;
      }

      // Success — redirect to the new/updated listing
      const listingId = result.data?.id || S.listingId;
      window.location.replace(`../listing/index.html?id=${listingId}`);

    } catch (err) {
      console.error('sell.js submit error:', err.message);
      showAlert('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  });


  /* ==========================================================
     9. DELETE LISTING
  ========================================================== */

  deleteBtn?.addEventListener('click', async () => {
    if (!S.listingId) return;

    const confirmed = window.confirm(
      'Are you sure you want to delete this listing? This cannot be undone.'
    );
    if (!confirmed) return;

    deleteBtn.disabled    = true;
    deleteBtn.textContent = 'Deleting…';

    const { error } = await JARAListings.remove(S.listingId);

    if (error) {
      showAlert('Failed to delete listing: ' + error.message);
      deleteBtn.disabled    = false;
      deleteBtn.textContent = 'Delete Listing';
      return;
    }

    // Redirect to own store after deletion
    window.location.replace('../store/index.html');
  });


  /* ==========================================================
     10. HELPERS + INIT
  ========================================================== */

  function showAlert(msg) {
    if (!alertEl || !alertText) return;
    alertText.textContent = msg;
    alertEl.removeAttribute('hidden');
    alertEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideAlert() {
    alertEl?.setAttribute('hidden', '');
  }

  function setLoading(on) {
    if (!submitBtn) return;
    submitBtn.disabled = on;
    submitBtn.setAttribute('aria-busy', String(on));
    submitBtn.classList.toggle('is-loading', on);
  }

  function esc(str) {
    if (!str && str !== 0) return '';
    const d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
  }

  async function init() {
    S.profile = await JARAProfile.load();

    if (S.mode === 'edit') {
      await loadExistingListing();
    }
  }

  init();

});
