/* ============================================================
   JARA ∆ — Profile Page  (profile-integrated)
   js/profile.js

   Loads real profile data from Supabase and renders it.
   Handles avatar upload, edit mode, and sign-out.

   Depends on:
     - window._supabase   (supabase-client.js)
     - window.JARAAuth    (auth-guard.js)
     - window.JARAProfile (jara-profile.js)

   TABLE OF CONTENTS
   1.  DOM refs
   2.  Skeleton helpers
   3.  Render profile
   4.  Edit mode
   5.  Avatar upload
   6.  Save changes
   7.  Sign out
   8.  Error state
   9.  Init
============================================================ */

document.addEventListener('DOMContentLoaded', async () => {

  /* ==========================================================
     1. DOM REFS
  ========================================================== */

  // Display elements
  const avatarImg          = document.getElementById('profileAvatarImg');
  const avatarInitials     = document.getElementById('profileAvatarInitials');
  const displayName        = document.getElementById('profileDisplayName');
  const jaraId             = document.getElementById('profileJaraId');
  const accountTypePill    = document.getElementById('profileAccountType');
  const bioEl              = document.getElementById('profileBio');
  const schoolEl           = document.getElementById('profileSchool');
  const locationEl         = document.getElementById('profileLocation');
  const categoryEl         = document.getElementById('profileCategory');
  const verifiedBadge      = document.getElementById('profileVerifiedBadge');
  const proBadgeEl         = document.getElementById('profileProBadge');
  const foundingBadgeEl    = document.getElementById('profileFoundingBadge');
  const profileBadges      = document.getElementById('profileBadges');
  const memberSinceEl      = document.getElementById('profileMemberSince');

  // Edit form elements
  const editBtn            = document.getElementById('editProfileBtn');
  const editPanel          = document.getElementById('editProfilePanel');
  const editCancelBtn      = document.getElementById('editCancelBtn');
  const editSaveBtn        = document.getElementById('editSaveBtn');
  const editFullName       = document.getElementById('editFullName');
  const editBio            = document.getElementById('editBio');
  const editPhone          = document.getElementById('editPhone');
  const editWhatsapp       = document.getElementById('editWhatsapp');
  const editLocation       = document.getElementById('editLocation');
  const editBusinessName   = document.getElementById('editBusinessName');
  const editBusinessDesc   = document.getElementById('editBusinessDesc');

  // Avatar upload
  const avatarUploadInput  = document.getElementById('avatarUploadInput');
  const avatarUploadBtn    = document.getElementById('avatarUploadBtn');

  // Alert
  const profileAlert       = document.getElementById('profileAlert');
  const profileAlertText   = document.getElementById('profileAlertText');

  // Sign out
  const signOutBtn         = document.getElementById('signOutBtn');


  /* ==========================================================
     2. SKELETON HELPERS
  ========================================================== */

  const skelEls = [
    avatarImg, displayName, jaraId, bioEl, schoolEl,
  ].filter(Boolean);

  function showSkeletons() {
    skelEls.forEach(el => el.classList.add('j-skel'));
  }

  function hideSkeletons() {
    skelEls.forEach(el => el.classList.remove('j-skel'));
  }

  function showAlert(msg, type = 'error') {
    if (!profileAlert || !profileAlertText) return;
    profileAlert.className = `profile-alert${type === 'success' ? ' profile-alert--success' : ''}`;
    profileAlertText.textContent = msg;
    profileAlert.removeAttribute('hidden');
    profileAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    setTimeout(() => profileAlert.setAttribute('hidden', ''), 4000);
  }


  /* ==========================================================
     3. RENDER PROFILE
  ========================================================== */

  function renderProfile(profile) {
    /* ---- Avatar ---- */
    const url = JARAProfile.getAvatarUrl(profile);
    if (url && avatarImg) {
      avatarImg.src = url;
      avatarImg.alt = JARAProfile.getDisplayName(profile);
      avatarImg.removeAttribute('hidden');
      if (avatarInitials) avatarInitials.setAttribute('hidden', '');
    } else if (avatarInitials) {
      avatarInitials.textContent = JARAProfile.getInitials(profile);
      avatarInitials.removeAttribute('hidden');
      if (avatarImg) avatarImg.setAttribute('hidden', '');
    }

    /* ---- Name ---- */
    if (displayName) {
      displayName.textContent = JARAProfile.getDisplayName(profile) || 'JARA Member';
    }

    /* ---- JARA ID ---- */
    if (jaraId) {
      jaraId.textContent = profile.jara_id ? `@${profile.jara_id}` : '';
    }

    /* ---- Account type pill ---- */
    if (accountTypePill) {
      accountTypePill.textContent = profile.account_type
        ? profile.account_type.charAt(0).toUpperCase() + profile.account_type.slice(1)
        : '';
    }

    /* ---- Bio ---- */
    if (bioEl) {
      bioEl.textContent = profile.bio || '';
      bioEl.hidden      = !profile.bio;
    }

    /* ---- School ---- */
    if (schoolEl) {
      schoolEl.textContent = profile.school || '';
      schoolEl.hidden      = !profile.school;
    }

    /* ---- Location ---- */
    if (locationEl) {
      locationEl.textContent = profile.location || '';
      locationEl.hidden      = !profile.location;
    }

    /* ---- Category (business) ---- */
    if (categoryEl) {
      categoryEl.textContent = profile.business_category || '';
      categoryEl.hidden      = !profile.business_category;
    }

    /* ---- Member since ---- */
    if (memberSinceEl && profile.created_at) {
      memberSinceEl.textContent = 'Member since ' + new Date(profile.created_at)
        .toLocaleDateString('en-NG', { month: 'long', year: 'numeric' });
    }

    /* ---- Verified badge ---- */
    if (verifiedBadge) verifiedBadge.hidden = !profile.is_verified;

    /* ---- PRO badge ---- */
    if (proBadgeEl) proBadgeEl.hidden = !JARAProfile.isPro(profile);

    /* ---- Founding Member badge ---- */
    if (foundingBadgeEl) foundingBadgeEl.hidden = !JARAProfile.isFounder(profile);

    /*
     Tell jara-polish.js the real founding state so it can
     inject the founding badge + modal correctly.
    */
    window.__JARA_IS_FOUNDER = JARAProfile.isFounder(profile);
    window.__JARA_IS_PRO     = JARAProfile.isPro(profile);
  }


  /* ==========================================================
     4. EDIT MODE
  ========================================================== */

  function openEditPanel(profile) {
    if (!editPanel) return;

    // Pre-fill form with current values
    if (editFullName)     editFullName.value     = profile.full_name     || '';
    if (editBio)          editBio.value          = profile.bio           || '';
    if (editPhone)        editPhone.value        = profile.phone         || '';
    if (editWhatsapp)     editWhatsapp.value     = profile.whatsapp      || '';
    if (editLocation)     editLocation.value     = profile.location      || '';
    if (editBusinessName) editBusinessName.value = profile.business_name || '';
    if (editBusinessDesc) editBusinessDesc.value = profile.business_description || '';

    editPanel.removeAttribute('hidden');
    editPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function closeEditPanel() {
    editPanel?.setAttribute('hidden', '');
  }

  editBtn?.addEventListener('click', () => {
    const profile = JARAProfile.get();
    if (profile) openEditPanel(profile);
  });

  editCancelBtn?.addEventListener('click', closeEditPanel);


  /* ==========================================================
     5. AVATAR UPLOAD
  ========================================================== */

  avatarUploadBtn?.addEventListener('click', () => avatarUploadInput?.click());

  avatarUploadInput?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Show optimistic preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (avatarImg) {
        avatarImg.src = ev.target.result;
        avatarImg.removeAttribute('hidden');
      }
      if (avatarInitials) avatarInitials.setAttribute('hidden', '');
    };
    reader.readAsDataURL(file);

    // Upload to Supabase Storage
    showAlert('Uploading photo…', 'success');

    const { url, error } = await JARAProfile.uploadAvatar(file);

    if (error) {
      showAlert('Photo upload failed: ' + error.message);
      return;
    }

    // Update img src with real URL (removes cache-busting preview)
    if (avatarImg && url) avatarImg.src = url;
    showAlert('Profile photo updated.', 'success');
  });


  /* ==========================================================
     6. SAVE CHANGES
  ========================================================== */

  editSaveBtn?.addEventListener('click', async () => {
    editSaveBtn.disabled = true;
    editSaveBtn.textContent = 'Saving…';

    const fields = {};

    if (editFullName)     fields.full_name            = editFullName.value.trim();
    if (editBio)          fields.bio                  = editBio.value.trim()     || null;
    if (editPhone)        fields.phone                = editPhone.value.trim()   || null;
    if (editWhatsapp)     fields.whatsapp             = editWhatsapp.value.trim()|| null;
    if (editLocation)     fields.location             = editLocation.value.trim()|| null;
    if (editBusinessName) fields.business_name        = editBusinessName.value.trim() || null;
    if (editBusinessDesc) fields.business_description = editBusinessDesc.value.trim() || null;

    const { data: updated, error } = await JARAProfile.update(fields);

    editSaveBtn.disabled = false;
    editSaveBtn.textContent = 'Save Changes';

    if (error) {
      showAlert('Failed to save changes. Please try again.');
      return;
    }

    closeEditPanel();
    renderProfile(updated);
    showAlert('Profile updated.', 'success');
  });


  /* ==========================================================
     7. SIGN OUT
  ========================================================== */

  signOutBtn?.addEventListener('click', async () => {
    signOutBtn.disabled = true;
    await JARAAuth.signOut();
  });


  /* ==========================================================
     8. ERROR STATE
  ========================================================== */

  function showError() {
    const container = document.getElementById('profileContent');
    if (!container) return;
    if (window.jaraError) {
      window.jaraError(container, {
        title:   "Couldn't load your profile",
        body:    'Please check your connection and try again.',
        onRetry: () => window.location.reload(),
      });
    }
  }


  /* ==========================================================
     9. INIT
  ========================================================== */

  async function init() {
    showSkeletons();

    try {
      const profile = await JARAProfile.load();

      if (!profile) {
        hideSkeletons();
        showError();
        return;
      }

      hideSkeletons();
      renderProfile(profile);

    } catch (err) {
      console.error('Profile page init error:', err.message);
      hideSkeletons();
      showError();
    }
  }

  init();

});
