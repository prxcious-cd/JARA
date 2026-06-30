/* ============================================================
   JARA ∆ — Onboarding Logic
   js/onboarding.js

   Depends on:
     - window._supabase  (js/supabase-client.js)
     - DOM in onboarding/index.html

   TABLE OF CONTENTS
   1.  State
   2.  Constants — interests list, Nigerian states
   3.  DOM helpers
   4.  Auth guard — redirect if not logged in
   5.  Step navigation
   6.  Progress bar
   7.  Step 0 — Welcome
   8.  Step 1 — Account type selection
   9.  Step 2 — Profile forms
        9a. Load schools + categories from Supabase
        9b. Avatar upload preview
        9c. Bio character counters
        9d. Validation per account type
   10. Step 3 — Interests
   11. Step 4 — Finish + save to Supabase
        11a. Upload avatar to Storage
        11b. Save profile data
   12. Init
============================================================ */

document.addEventListener('DOMContentLoaded', () => {


  /* ==========================================================
     1. STATE
     Single source of truth for everything collected.
  ========================================================== */
  const state = {
    currentStep:  0,
    accountType:  null,   // 'student' | 'business' | 'professional'
    interests:    [],     // Array of selected interest slugs
    avatarFile:   null,   // File object selected by user
    avatarUrl:    null,   // URL after Supabase Storage upload
    userId:       null,   // Set after auth guard check
    userEmail:    null,
  };


  /* ==========================================================
     2. CONSTANTS
  ========================================================== */

  // All 36 Nigerian states + FCT
  const NIGERIAN_STATES = [
    'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue',
    'Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT',
    'Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi',
    'Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo',
    'Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara'
  ];

  // Interest chips shown on step 3.
  // Add new entries here — they appear automatically.
  const INTERESTS = [
    { emoji: '📚', label: 'Books',       slug: 'books' },
    { emoji: '🍔', label: 'Food',        slug: 'food' },
    { emoji: '🧁', label: 'Cakes',       slug: 'cakes' },
    { emoji: '💻', label: 'Tech',        slug: 'tech' },
    { emoji: '🎨', label: 'Design',      slug: 'design' },
    { emoji: '📷', label: 'Photography', slug: 'photography' },
    { emoji: '🧺', label: 'Laundry',     slug: 'laundry' },
    { emoji: '🏠', label: 'Hostel',      slug: 'hostel' },
    { emoji: '🛒', label: 'Shopping',    slug: 'shopping' },
    { emoji: '🚗', label: 'Transport',   slug: 'transport' },
    { emoji: '⚡', label: 'Generator',   slug: 'generator' },
    { emoji: '🖨️', label: 'Printing',   slug: 'printing' },
    { emoji: '💄', label: 'Beauty',      slug: 'beauty' },
    { emoji: '👕', label: 'Fashion',     slug: 'fashion' },
    { emoji: '🎓', label: 'Tutors',      slug: 'tutors' },
    { emoji: '🍗', label: 'Restaurants', slug: 'restaurants' },
    { emoji: '✂️', label: 'Haircut',     slug: 'haircut' },
    { emoji: '🛠️', label: 'Repairs',    slug: 'repairs' },
    { emoji: '💊', label: 'Health',      slug: 'health' },
    { emoji: '📦', label: 'Delivery',    slug: 'delivery' },
  ];


  /* ==========================================================
     3. DOM HELPERS
  ========================================================== */

  const obNav       = document.getElementById('obNav');
  const progressFill  = document.getElementById('progressFill');
  const progressLabel = document.getElementById('progressLabel');
  const progressBar   = obNav.querySelector('.ob-nav__progress');

  /** Show a step by ID, hide all others. Adds entry animation. */
  function showStep(stepId, direction = 'forward') {
    const allSteps = document.querySelectorAll('.ob-step');
    const target   = document.getElementById(stepId);

    allSteps.forEach(s => {
      s.style.display = 'none';
      s.classList.remove(
        'ob-step--active',
        'ob-step--entering',
        'ob-step--entering-back',
        'ob-step--leaving'
      );
    });

    if (!target) return;

    target.style.display = 'flex';
    target.classList.add('ob-step--active');
    target.classList.add(
      direction === 'back' ? 'ob-step--entering-back' : 'ob-step--entering'
    );

    // Remove animation class after it completes
    target.addEventListener('animationend', () => {
      target.classList.remove('ob-step--entering', 'ob-step--entering-back');
    }, { once: true });

    // Scroll to top on each step change
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Show or hide the nav bar */
  function setNavVisible(visible) {
    if (visible) {
      obNav.removeAttribute('hidden');
    } else {
      obNav.setAttribute('hidden', '');
    }
  }

  /** Show an inline step-level alert */
  function showStepAlert(alertId, textId, message) {
    const alert = document.getElementById(alertId);
    const text  = document.getElementById(textId);
    if (!alert || !text) return;
    text.textContent = message;
    alert.removeAttribute('hidden');
  }

  function hideStepAlert(alertId) {
    const alert = document.getElementById(alertId);
    if (alert) alert.setAttribute('hidden', '');
  }

  /** Show / clear a field-level error */
  function showFieldErr(errorElId, message) {
    const el = document.getElementById(errorElId);
    if (!el) return;
    el.querySelector('span').textContent = message;
    el.removeAttribute('hidden');
    el.previousElementSibling?.querySelector('.field__input')
      ?.classList.add('is-error');
  }

  function clearFieldErr(errorElId) {
    const el = document.getElementById(errorElId);
    if (!el) return;
    el.setAttribute('hidden', '');
    el.querySelector('span').textContent = '';
  }

  /** Phone number validator — accepts Nigerian formats */
  function isValidPhone(value) {
    return /^(\+?234|0)[789][01]\d{8}$/.test(value.replace(/\s/g, ''));
  }


  /* ==========================================================
     4. AUTH GUARD
     If no active session, send the user to login.
     Sets state.userId for use throughout.
  ========================================================== */

  async function authGuard() {
    const { data: { session }, error } = await window._supabase.auth.getSession();

    if (error || !session) {
      window.location.href = '../auth/login.html';
      return false;
    }

    state.userId    = session.user.id;
    state.userEmail = session.user.email;

    // If the user already completed onboarding, send to dashboard
    const { data: profile } = await window._supabase
      .from('profiles')
      .select('onboarding_complete')
      .eq('id', state.userId)
      .single();

    if (profile && profile.onboarding_complete) {
      window.location.href = '../dashboard/index.html';
      return false;
    }

    return true;
  }


  /* ==========================================================
     5. STEP NAVIGATION
  ========================================================== */

  /** Map step index to step element IDs */
  const STEP_IDS = ['step0', 'step1', 'step2', 'step3', 'step4'];

  /** Total progress steps (excluding welcome and finish) */
  const PROGRESS_STEPS = 4;

  function goToStep(index, direction = 'forward') {
    state.currentStep = index;
    showStep(STEP_IDS[index], direction);
    updateProgress(index);

    // Show / hide nav
    const showNav = index > 0 && index < STEP_IDS.length - 1;
    setNavVisible(showNav);
  }

  function nextStep() {
    goToStep(state.currentStep + 1, 'forward');
  }

  function prevStep() {
    goToStep(state.currentStep - 1, 'back');
  }


  /* ==========================================================
     6. PROGRESS BAR
  ========================================================== */

  function updateProgress(stepIndex) {
    // Steps 1–4 are the meaningful ones (0 = welcome, 4 = finish)
    const activeStep = Math.max(stepIndex, 1);
    const pct = ((activeStep - 1) / (PROGRESS_STEPS - 1)) * 100;
    progressFill.style.width = `${Math.min(pct, 100)}%`;
    progressLabel.textContent = stepIndex >= 1 && stepIndex <= PROGRESS_STEPS
      ? `Step ${stepIndex} of ${PROGRESS_STEPS}`
      : '';
    progressBar.setAttribute('aria-valuenow', stepIndex);
  }


  /* ==========================================================
     7. STEP 0 — WELCOME
  ========================================================== */

  document.getElementById('welcomeBtn').addEventListener('click', () => {
    goToStep(1);
  });


  /* ==========================================================
     8. STEP 1 — ACCOUNT TYPE
  ========================================================== */

  const typeCards = document.querySelectorAll('.type-card');

  typeCards.forEach(card => {
    card.addEventListener('click', () => {
      // Deselect all
      typeCards.forEach(c => {
        c.setAttribute('aria-checked', 'false');
      });

      // Select this one
      card.setAttribute('aria-checked', 'true');
      state.accountType = card.dataset.type;

      // Clear any error
      document.getElementById('typeError').setAttribute('hidden', '');
    });
  });

  document.getElementById('step1Next').addEventListener('click', () => {
    if (!state.accountType) {
      document.getElementById('typeError').removeAttribute('hidden');
      return;
    }
    // Configure step 2 based on selection
    configureStep2();
    goToStep(2);
  });


  /* ==========================================================
     9. STEP 2 — PROFILE FORMS
  ========================================================== */

  /** Show the correct form for the chosen account type */
  function configureStep2() {
    // Hide all three forms
    document.getElementById('formStudent').setAttribute('hidden', '');
    document.getElementById('formBusiness').setAttribute('hidden', '');
    document.getElementById('formProfessional').setAttribute('hidden', '');

    const titleEl    = document.getElementById('step2Title');
    const subtitleEl = document.getElementById('step2Subtitle');

    if (state.accountType === 'student') {
      document.getElementById('formStudent').removeAttribute('hidden');
      titleEl.textContent    = 'Tell us about yourself';
      subtitleEl.textContent = 'This is what people see on your profile.';

    } else if (state.accountType === 'business') {
      document.getElementById('formBusiness').removeAttribute('hidden');
      titleEl.textContent    = 'Tell us about your business';
      subtitleEl.textContent = 'Help customers find and trust you.';

    } else if (state.accountType === 'professional') {
      document.getElementById('formProfessional').removeAttribute('hidden');
      titleEl.textContent    = 'Tell us about yourself';
      subtitleEl.textContent = 'Show people what you do and how to reach you.';
    }
  }

  /* ---- 9a. Load schools + categories from Supabase ---- */

  async function loadSelectOptions() {
    // Load schools
    const { data: schools } = await window._supabase
      .from('schools')
      .select('id, name')
      .eq('is_active', true)
      .order('name');

    if (schools) {
      const schoolSelects = [document.getElementById('studentSchool')];
      schoolSelects.forEach(sel => {
        if (!sel) return;
        schools.forEach(s => {
          const opt = document.createElement('option');
          opt.value       = s.id;
          opt.textContent = s.name;
          sel.appendChild(opt);
        });
      });
    }

    // Load categories
    const { data: categories } = await window._supabase
      .from('categories')
      .select('id, name')
      .eq('is_active', true)
      .order('sort_order');

    if (categories) {
      const catSelects = [
        document.getElementById('businessCategory'),
        document.getElementById('proCategory'),
      ];
      catSelects.forEach(sel => {
        if (!sel) return;
        categories.forEach(c => {
          const opt = document.createElement('option');
          opt.value       = c.id;
          opt.textContent = c.name;
          sel.appendChild(opt);
        });
      });
    }

    // Populate state selects
    const stateSelects = [
      document.getElementById('businessState'),
      document.getElementById('proState'),
    ];
    stateSelects.forEach(sel => {
      if (!sel) return;
      NIGERIAN_STATES.forEach(st => {
        const opt = document.createElement('option');
        opt.value       = st;
        opt.textContent = st;
        sel.appendChild(opt);
      });
    });
  }

  /* ---- 9b. Avatar upload preview ---- */

  function setupAvatarUpload(triggerId, fileInputId, previewId) {
    const trigger   = document.getElementById(triggerId);
    const fileInput = document.getElementById(fileInputId);
    const preview   = document.getElementById(previewId);

    if (!trigger || !fileInput || !preview) return;

    trigger.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (!file) return;

      // Validate size (5 MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be under 5 MB.');
        fileInput.value = '';
        return;
      }

      // Store selected file
      state.avatarFile = file;

      // Show preview using object URL
      const url = URL.createObjectURL(file);
      preview.style.backgroundImage    = `url(${url})`;
      preview.style.backgroundSize     = 'cover';
      preview.style.backgroundPosition = 'center';
      preview.classList.add('has-image');
    });
  }

  setupAvatarUpload('avatarTriggerStudent',  'avatarFileStudent',  'avatarPreviewStudent');
  setupAvatarUpload('avatarTriggerBusiness', 'avatarFileBusiness', 'avatarPreviewBusiness');
  setupAvatarUpload('avatarTriggerPro',      'avatarFilePro',      'avatarPreviewPro');

  /* ---- 9c. Bio character counters ---- */

  function setupCharCounter(textareaId, counterId) {
    const textarea = document.getElementById(textareaId);
    const counter  = document.getElementById(counterId);
    if (!textarea || !counter) return;
    textarea.addEventListener('input', () => {
      counter.textContent = textarea.value.length;
    });
  }

  setupCharCounter('studentBio',  'studentBioCount');
  setupCharCounter('businessBio', 'businessBioCount');
  setupCharCounter('proBio',      'proBioCount');

  /* ---- 9d. Step 2 navigation ---- */

  document.getElementById('step2Back').addEventListener('click', () => {
    goToStep(1, 'back');
  });

  document.getElementById('step2Next').addEventListener('click', () => {
    hideStepAlert('step2Alert');
    if (!validateStep2()) return;
    goToStep(3);
  });

  /* ---- 9e. Form validation per account type ---- */

  function validateStep2() {
    let valid = true;

    if (state.accountType === 'student') {
      valid = validateStudentForm();
    } else if (state.accountType === 'business') {
      valid = validateBusinessForm();
    } else if (state.accountType === 'professional') {
      valid = validateProfessionalForm();
    }

    if (!valid) {
      // Scroll to first visible error
      const firstErr = document.querySelector('.field__error:not([hidden])');
      if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return valid;
  }

  function validateStudentForm() {
    let ok = true;

    clearFieldErr('studentFullNameError');
    clearFieldErr('studentSchoolError');
    clearFieldErr('studentPhoneError');
    clearFieldErr('studentWhatsappError');

    const name     = document.getElementById('studentFullName').value.trim();
    const school   = document.getElementById('studentSchool').value;
    const phone    = document.getElementById('studentPhone').value.trim();
    const whatsapp = document.getElementById('studentWhatsapp').value.trim();

    if (!name || name.length < 2) {
      showFieldErr('studentFullNameError', 'Please enter your full name.');
      ok = false;
    }
    if (!school) {
      showFieldErr('studentSchoolError', 'Please select your school.');
      ok = false;
    }
    if (!phone || !isValidPhone(phone)) {
      showFieldErr('studentPhoneError', 'Please enter a valid Nigerian phone number.');
      ok = false;
    }
    if (!whatsapp || !isValidPhone(whatsapp)) {
      showFieldErr('studentWhatsappError', 'Please enter a valid WhatsApp number.');
      ok = false;
    }

    return ok;
  }

  function validateBusinessForm() {
    let ok = true;

    clearFieldErr('businessNameError');
    clearFieldErr('businessOwnerNameError');
    clearFieldErr('businessCategoryError');
    clearFieldErr('businessCityError');
    clearFieldErr('businessStateError');
    clearFieldErr('businessPhoneError');
    clearFieldErr('businessWhatsappError');

    const bName    = document.getElementById('businessName').value.trim();
    const oName    = document.getElementById('businessOwnerName').value.trim();
    const cat      = document.getElementById('businessCategory').value;
    const city     = document.getElementById('businessCity').value.trim();
    const state_   = document.getElementById('businessState').value;
    const phone    = document.getElementById('businessPhone').value.trim();
    const whatsapp = document.getElementById('businessWhatsapp').value.trim();

    if (!bName)                          { showFieldErr('businessNameError',      'Please enter your business name.');         ok = false; }
    if (!oName || oName.length < 2)      { showFieldErr('businessOwnerNameError', 'Please enter the owner\'s name.');          ok = false; }
    if (!cat)                            { showFieldErr('businessCategoryError',  'Please select a category.');                ok = false; }
    if (!city)                           { showFieldErr('businessCityError',      'Please enter your city.');                  ok = false; }
    if (!state_)                         { showFieldErr('businessStateError',     'Please select your state.');                ok = false; }
    if (!phone    || !isValidPhone(phone))    { showFieldErr('businessPhoneError',    'Please enter a valid phone number.');   ok = false; }
    if (!whatsapp || !isValidPhone(whatsapp)) { showFieldErr('businessWhatsappError', 'Please enter a valid WhatsApp number.'); ok = false; }

    return ok;
  }

  function validateProfessionalForm() {
    let ok = true;

    clearFieldErr('proFullNameError');
    clearFieldErr('proOccupationError');
    clearFieldErr('proCategoryError');
    clearFieldErr('proCityError');
    clearFieldErr('proStateError');
    clearFieldErr('proPhoneError');
    clearFieldErr('proWhatsappError');

    const name       = document.getElementById('proFullName').value.trim();
    const occupation = document.getElementById('proOccupation').value.trim();
    const cat        = document.getElementById('proCategory').value;
    const city       = document.getElementById('proCity').value.trim();
    const state_     = document.getElementById('proState').value;
    const phone      = document.getElementById('proPhone').value.trim();
    const whatsapp   = document.getElementById('proWhatsapp').value.trim();

    if (!name || name.length < 2)            { showFieldErr('proFullNameError',   'Please enter your full name.');            ok = false; }
    if (!occupation)                         { showFieldErr('proOccupationError', 'Please enter your occupation or title.');  ok = false; }
    if (!cat)                                { showFieldErr('proCategoryError',   'Please select a service category.');       ok = false; }
    if (!city)                               { showFieldErr('proCityError',       'Please enter your city.');                 ok = false; }
    if (!state_)                             { showFieldErr('proStateError',      'Please select your city.');                  ok = false; }
    if (!state_)                         { showFieldErr('businessStateError',     'Please select your state.');                ok = false; }
    if (!phone    || !isValidPhone(phone))    { showFieldErr('businessPhoneError',    'Please enter a valid phone number.');   ok = false; }
    if (!whatsapp || !isValidPhone(whatsapp)) { showFieldErr('businessWhatsappError', 'Please enter a valid WhatsApp number.'); ok = false; }

    return ok;
  }

  function validateProfessionalForm() {
    let ok = true;

    clearFieldErr('proFullNameError');
    clearFieldErr('proOccupationError');
    clearFieldErr('proCategoryError');
    clearFieldErr('proCityError');
    clearFieldErr('proStateError');
    clearFieldErr('proPhoneError');
    clearFieldErr('proWhatsappError');

    const name       = document.getElementById('proFullName').value.trim();
    const occupation = document.getElementById('proOccupation').value.trim();
    const cat        = document.getElementById('proCategory').value;
    const city       = document.getElementById('proCity').value.trim();
    const state_     = document.getElementById('proState').value;
    const phone      = document.getElementById('proPhone').value.trim();
    const whatsapp   = document.getElementById('proWhatsapp').value.trim();

    if (!name || name.length < 2)            { showFieldErr('proFullNameError',   'Please enter your full name.');            ok = false; }
    if (!occupation)                         { showFieldErr('proOccupationError', 'Please enter your occupation or title.');  ok = false; }
    if (!cat)                                { showFieldErr('proCategoryError',   'Please select a service category.');       ok = false; }
    if (!city)                               { showFieldErr('proCityError',       'Please enter your city.');                 ok = false; }
    if (!state_)                             { showFieldErr('proStateError',      'Please select your state.');               ok = false; }
    if (!phone    || !isValidPhone(phone))    { showFieldErr('proPhoneError',     'Please enter a valid phone number.');      ok = false; }
    if (!whatsapp || !isValidPhone(whatsapp)) { showFieldErr('proWhatsappError',  'Please enter a valid WhatsApp number.');   ok = false; }

    return ok;
  }


  /* ==========================================================
     10. STEP 3 — INTERESTS
  ========================================================== */

  function buildInterestsGrid() {
    const grid = document.getElementById('interestsGrid');
    if (!grid) return;

    INTERESTS.forEach(interest => {
      const chip = document.createElement('button');
      chip.type          = 'button';
      chip.className     = 'interest-chip';
      chip.dataset.slug  = interest.slug;
      chip.setAttribute('aria-pressed', 'false');
      chip.setAttribute('aria-label', interest.label);

      chip.innerHTML = `
        <span class="interest-chip__emoji" aria-hidden="true">${interest.emoji}</span>
        <span>${interest.label}</span>
      `;

      chip.addEventListener('click', () => {
        const isSelected = chip.getAttribute('aria-pressed') === 'true';

        if (isSelected) {
          chip.setAttribute('aria-pressed', 'false');
          state.interests = state.interests.filter(s => s !== interest.slug);
        } else {
          chip.setAttribute('aria-pressed', 'true');
          state.interests.push(interest.slug);
        }

        // Hide error if at least one is selected
        if (state.interests.length > 0) {
          document.getElementById('interestsError').setAttribute('hidden', '');
        }
      });

      grid.appendChild(chip);
    });
  }

  document.getElementById('step3Back').addEventListener('click', () => {
    goToStep(2, 'back');
  });

  document.getElementById('step3Next').addEventListener('click', () => {
    if (state.interests.length === 0) {
      document.getElementById('interestsError').removeAttribute('hidden');
      return;
    }
    goToStep(4);
    updateFinishSubtitle();
  });

  function updateFinishSubtitle() {
    const subtitleEl = document.getElementById('finishSubtitle');
    if (!subtitleEl) return;
    if (state.accountType === 'business') {
      subtitleEl.textContent = 'Your business profile is live. Start getting discovered on JARA.';
    } else if (state.accountType === 'professional') {
      subtitleEl.textContent = 'Your professional profile is live. Clients can now find you on JARA.';
    } else {
      subtitleEl.textContent = 'Welcome to JARA ∆. Your profile is live and ready.';
    }
  }


  /* ==========================================================
     11. STEP 4 — FINISH + SAVE TO SUPABASE
  ========================================================== */

  document.getElementById('finishBtn').addEventListener('click', async () => {
    await saveAndFinish();
  });

  async function saveAndFinish() {
    const btn       = document.getElementById('finishBtn');
    const errorEl   = document.getElementById('finishError');
    const errorText = document.getElementById('finishErrorText');

    // Loading state
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    btn.classList.add('is-loading');
    errorEl.setAttribute('hidden', '');

    try {

      /* ---- 11a. Upload avatar if one was selected ---- */
      if (state.avatarFile) {
        state.avatarUrl = await uploadAvatar(state.avatarFile, state.userId);
      }

      /* ---- 11b. Build the profile data object ---- */
      const profileData = buildProfileData();

      /* ---- 11c. Save to Supabase profiles table ---- */
      const { error: upsertError } = await window._supabase
        .from('profiles')
        .upsert({
          id: state.userId,
          ...profileData,
          interests:           state.interests,
          account_type:        state.accountType,
          onboarding_complete: true,
          updated_at:          new Date().toISOString(),
        });

      if (upsertError) {
        throw new Error(upsertError.message);
      }

      /* ---- 11d. Redirect to dashboard ---- */
      window.location.href = '../dashboard/index.html';

    } catch (err) {
      console.error('JARA onboarding save error:', err);
      btn.disabled = false;
      btn.setAttribute('aria-busy', 'false');
      btn.classList.remove('is-loading');
      errorText.textContent =
        'Something went wrong saving your profile. Please check your connection and try again.';
      errorEl.removeAttribute('hidden');
    }
  }

  /* ---- 11a. Upload avatar to Supabase Storage ---- */

  async function uploadAvatar(file, userId) {
    const ext      = file.name.split('.').pop();
    const filePath = `${userId}/avatar.${ext}`;

    const { error } = await window._supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        upsert:      true,
        contentType: file.type,
      });

    if (error) {
      console.warn('JARA avatar upload error:', error.message);
      return null;
    }

    // Get the public URL
    const { data } = window._supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return data.publicUrl || null;
  }

  /* ---- 11b. Build profile data from the active form ---- */

  function buildProfileData() {
    const base = {
      avatar_url: state.avatarUrl,
    };

    if (state.accountType === 'student') {
      return {
        ...base,
        full_name:      document.getElementById('studentFullName').value.trim(),
        school_id:      document.getElementById('studentSchool').value || null,
        bio:            document.getElementById('studentBio').value.trim() || null,
        phone_number:   document.getElementById('studentPhone').value.trim(),
        whatsapp_number:document.getElementById('studentWhatsapp').value.trim(),
        // Extra student fields stored in metadata column (add to DB if needed)
        metadata: {
          faculty:    document.getElementById('studentFaculty').value.trim()    || null,
          department: document.getElementById('studentDepartment').value.trim() || null,
          level:      document.getElementById('studentLevel').value             || null,
        },
      };
    }

    if (state.accountType === 'business') {
      return {
        ...base,
        full_name:      document.getElementById('businessOwnerName').value.trim(),
        business_name:  document.getElementById('businessName').value.trim(),
        bio:            document.getElementById('businessBio').value.trim() || null,
        phone_number:   document.getElementById('businessPhone').value.trim(),
        whatsapp_number:document.getElementById('businessWhatsapp').value.trim(),
        metadata: {
          category_id: document.getElementById('businessCategory').value || null,
          address:     document.getElementById('businessAddress').value.trim() || null,
          city:        document.getElementById('businessCity').value.trim(),
          state:       document.getElementById('businessState').value,
        },
      };
    }

    if (state.accountType === 'professional') {
      return {
        ...base,
        full_name:      document.getElementById('proFullName').value.trim(),
        bio:            document.getElementById('proBio').value.trim() || null,
        phone_number:   document.getElementById('proPhone').value.trim(),
        whatsapp_number:document.getElementById('proWhatsapp').value.trim(),
        metadata: {
          occupation:  document.getElementById('proOccupation').value.trim(),
          category_id: document.getElementById('proCategory').value || null,
          city:        document.getElementById('proCity').value.trim(),
          state:       document.getElementById('proState').value,
          portfolio:   document.getElementById('proPortfolio').value.trim() || null,
        },
      };
    }

    return base;
  }


  /* ==========================================================
     12. INIT
     Run everything in order.
  ========================================================== */

  async function init() {
    // Auth guard — stops if not logged in
    const authed = await authGuard();
    if (!authed) return;

    // Build interest chips before showing step 3
    buildInterestsGrid();

    // Load school and category options from Supabase
    await loadSelectOptions();

    // Show the welcome step
    showStep('step0');
    setNavVisible(false);
  }

  init();


/* ============================================================
   End of DOMContentLoaded
============================================================ */
});
