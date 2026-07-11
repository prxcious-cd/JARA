/* ============================================================
   JARA ∆ — Onboarding Logic  (profile-integrated)
   js/onboarding.js

   Saves every onboarding field to the profiles table in
   Supabase and sets onboarding_complete = true when done.

   Depends on:
     - window._supabase     (supabase-client.js)
     - window.JARAAuth      (auth-guard.js)
     - window.JARAProfile   (jara-profile.js)

   TABLE OF CONTENTS
   1.  State
   2.  DOM helpers
   3.  Step navigation
   4.  Field collection
   5.  Avatar upload (step)
   6.  Submit — save to Supabase
   7.  Init
============================================================ */

document.addEventListener('DOMContentLoaded', async () => {

  /* ==========================================================
     1. STATE
  ========================================================== */

  const S = {
    step:         1,
    totalSteps:   0,
    userId:       null,
    avatarFile:   null,
    data:         {},
  };


  /* ==========================================================
     2. DOM HELPERS
  ========================================================== */

  const steps     = document.querySelectorAll('.onboarding-step, [data-step]');
  const nextBtns  = document.querySelectorAll('[data-next]');
  const backBtns  = document.querySelectorAll('[data-back]');
  const submitBtn = document.getElementById('finishOnboarding');
  const progress  = document.getElementById('onboardingProgress');
  const alertEl   = document.getElementById('onboardingAlert');
  const alertText = document.getElementById('onboardingAlertText');

  S.totalSteps = steps.length;

  function showStep(n) {
    steps.forEach((el, i) => {
      el.hidden = (i + 1) !== n;
    });
    if (progress) {
      progress.style.width = `${((n - 1) / S.totalSteps) * 100}%`;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showAlert(msg) {
    if (!alertEl || !alertText) return;
    alertText.textContent = msg;
    alertEl.removeAttribute('hidden');
    alertEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideAlert() {
    alertEl?.setAttribute('hidden', '');
  }

  function setSubmitLoading(on) {
    if (!submitBtn) return;
    submitBtn.disabled = on;
    submitBtn.setAttribute('aria-busy', String(on));
    submitBtn.classList.toggle('is-loading', on);
  }


  /* ==========================================================
     3. STEP NAVIGATION
  ========================================================== */

  nextBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      hideAlert();
      collectCurrentStep();
      if (S.step < S.totalSteps) {
        S.step++;
        showStep(S.step);
      }
    });
  });

  backBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (S.step > 1) {
        S.step--;
        showStep(S.step);
      }
    });
  });


  /* ==========================================================
     4. FIELD COLLECTION
     Reads the current step's form fields into S.data
     so nothing is lost when the user navigates between steps.
  ========================================================== */

  function collectCurrentStep() {
    const currentStep = steps[S.step - 1];
    if (!currentStep) return;

    const inputs = currentStep.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      if (!input.name) return;

      if (input.type === 'radio') {
        if (input.checked) S.data[input.name] = input.value;
      } else if (input.type === 'checkbox') {
        S.data[input.name] = input.checked;
      } else {
        S.data[input.name] = input.value.trim();
      }
    });
  }

  function collectAllSteps() {
    steps.forEach((_, i) => {
      S.step = i + 1;
      collectCurrentStep();
    });
  }


  /* ==========================================================
     5. AVATAR UPLOAD (onboarding step)
  ========================================================== */

  const avatarInput = document.getElementById('avatarInput');
  const avatarPreview = document.getElementById('avatarPreview');
  const avatarInitials = document.getElementById('avatarInitials');

  avatarInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showAlert('Image is too large. Maximum size is 5 MB.');
      avatarInput.value = '';
      return;
    }

    S.avatarFile = file;

    const reader = new FileReader();
    reader.onload = (ev) => {
      if (avatarPreview) {
        avatarPreview.src = ev.target.result;
        avatarPreview.removeAttribute('hidden');
      }
      if (avatarInitials) avatarInitials.setAttribute('hidden', '');
    };
    reader.readAsDataURL(file);
  });


  /* ==========================================================
     6. SUBMIT — SAVE TO SUPABASE
  ========================================================== */

  submitBtn?.addEventListener('click', async () => {
    hideAlert();
    collectAllSteps();
    setSubmitLoading(true);

    try {
      /* ---- Upload avatar first (if provided) ---- */
      let avatarUrl = null;

      if (S.avatarFile) {
        const { url, error: avatarError } = await JARAProfile.uploadAvatar(S.avatarFile);
        if (avatarError) {
          showAlert('Photo upload failed: ' + avatarError.message + ' — you can add it later from your profile.');
          // Non-fatal — continue with onboarding
        } else {
          avatarUrl = url;
        }
      }

      /* ---- Build profile payload ---- */
      /*
       Map onboarding field names to profiles table columns.
       Add new fields here as the onboarding form grows.

       FUTURE: Add school_id (foreign key) once schools table exists.
       FUTURE: Add latitude/longitude for location-aware search.
      */
      const payload = {
        // Personal
        full_name:            S.data.full_name            || null,
        username:             S.data.username             || null,
        account_type:         S.data.account_type         || 'student',
        bio:                  S.data.bio                  || null,
        phone:                S.data.phone                || null,
        whatsapp:             S.data.whatsapp             || null,
        location:             S.data.location             || null,

        // Academic
        school:               S.data.school               || null,
        faculty:              S.data.faculty              || null,
        department:           S.data.department           || null,

        // Business (only relevant if account_type === 'business')
        business_name:        S.data.business_name        || null,
        business_category:    S.data.business_category    || null,
        business_description: S.data.business_description || null,

        // Mark onboarding done
        onboarding_complete:  true,
      };

      if (avatarUrl) {
        payload.avatar_url = avatarUrl;
      }

      /* ---- Save to Supabase profiles table ---- */
      /*
       FUTURE: If the handle_new_user() trigger already created a
       profile row on signup, this will UPDATE it.
       If for any reason it doesn't exist, use upsert instead:
         .upsert({ id: S.userId, ...payload })
      */
      const { error: saveError } = await JARAProfile.update(payload);

      if (saveError) {
        console.error('Onboarding save error:', saveError.message);
        showAlert('Something went wrong saving your profile. Please try again.');
        setSubmitLoading(false);
        return;
      }

      /* ---- Redirect to explore ---- */
      window.location.replace(JARAAuth.ROUTES.explore);

    } catch (err) {
      console.error('Onboarding unexpected error:', err.message);
      showAlert('An unexpected error occurred. Please try again.');
      setSubmitLoading(false);
    }
  });


  /* ==========================================================
     7. INIT
  ========================================================== */

  async function init() {
    // Auth is already confirmed by auth-guard on the HTML page.
    // We just need the userId for reference.
    const result = await JARAAuth.getCurrentUser();
    if (!result) return;

    S.userId = result.user.id;

    /*
     If the user already completed onboarding, send them to explore.
     FUTURE: Uncomment once onboarding_complete column exists:

       const profile = await JARAProfile.load();
       if (profile?.onboarding_complete) {
         window.location.replace(JARAAuth.ROUTES.explore);
         return;
       }
    */

    // Pre-fill name from auth metadata if available
    const authName = result.user.user_metadata?.full_name;
    const nameInput = document.getElementById('full_name') ||
                      document.querySelector('[name="full_name"]');
    if (authName && nameInput && !nameInput.value) {
      nameInput.value = authName;
    }

    showStep(1);
  }

  init();

});
