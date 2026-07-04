/* ============================================================
   JARA ∆ — Reset Password Page Logic
   js/reset-password.js

   Depends on:
     - window._supabase  (js/supabase-client.js)
     - DOM in auth/reset-password.html

   HOW THE SUPABASE RESET FLOW WORKS:
   ─────────────────────────────────────────────────────────────
   1. User clicks the reset link in their email.
   2. The link is in this format:
        https://yoursite.com/auth/reset-password.html
        #access_token=...&type=recovery
   3. Supabase automatically detects the hash fragment and
      establishes a temporary session.
   4. We listen for onAuthStateChange with event === 'PASSWORD_RECOVERY'
      to detect this session and show the form.
   5. User submits new password → we call supabase.auth.updateUser().
   6. On success, show success screen and auto-redirect to login.
   ─────────────────────────────────────────────────────────────

   TABLE OF CONTENTS
   1.  DOM references
   2.  Alert banner helpers
   3.  Field error helpers
   4.  Loading state helper
   5.  Password strength meter
   6.  Password visibility toggles
   7.  Real-time confirm password matching
   8.  Form validation
   9.  Show success screen + countdown redirect
   10. Supabase auth state listener (detects recovery session)
   11. Form submit — supabase.auth.updateUser()
   12. Init
============================================================ */

document.addEventListener('DOMContentLoaded', () => {


  /* ==========================================================
     1. DOM REFERENCES
  ========================================================== */
  const resetCard         = document.getElementById('resetCard');
  const errorCard         = document.getElementById('errorCard');
  const successCard       = document.getElementById('successCard');
  const resetForm         = document.getElementById('resetForm');
  const newPasswordInput  = document.getElementById('newPassword');
  const confirmInput      = document.getElementById('confirmPassword');
  const submitBtn         = document.getElementById('submitBtn');
  const authAlert         = document.getElementById('authAlert');
  const alertIcon         = document.getElementById('alertIcon');
  const alertMessage      = document.getElementById('alertMessage');
  const passwordError     = document.getElementById('passwordError');
  const passwordErrorText = document.getElementById('passwordErrorText');
  const confirmError      = document.getElementById('confirmError');
  const confirmErrorText  = document.getElementById('confirmErrorText');
  const togglePasswordBtn = document.getElementById('togglePassword');
  const togglePasswordIcon= document.getElementById('togglePasswordIcon');
  const toggleConfirmBtn  = document.getElementById('toggleConfirm');
  const toggleConfirmIcon = document.getElementById('toggleConfirmIcon');
  const strengthMeter     = document.getElementById('strengthMeter');
  const strengthLabel     = document.getElementById('passwordStrengthLabel');
  const countdownEl       = document.getElementById('countdown');

  // Track whether we have a valid recovery session
  let hasRecoverySession = false;


  /* ==========================================================
     2. ALERT BANNER HELPERS
  ========================================================== */

  function showAlert(type, message) {
    authAlert.className = `auth-alert${type === 'success' ? ' auth-alert--success' : ''}`;
    alertIcon.className = type === 'success'
      ? 'auth-alert__icon fa-solid fa-circle-check'
      : 'auth-alert__icon fa-solid fa-circle-exclamation';
    alertMessage.textContent = message;
    authAlert.removeAttribute('hidden');
    authAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideAlert() {
    authAlert.setAttribute('hidden', '');
  }


  /* ==========================================================
     3. FIELD ERROR HELPERS
  ========================================================== */

  function showFieldError(errEl, textEl, inputEl, message) {
    textEl.textContent = message;
    errEl.removeAttribute('hidden');
    inputEl.classList.add('is-error');
    inputEl.classList.remove('is-valid');
    inputEl.setAttribute('aria-invalid', 'true');
  }

  function clearFieldError(errEl, inputEl) {
    errEl.setAttribute('hidden', '');
    inputEl.classList.remove('is-error');
    inputEl.removeAttribute('aria-invalid');
  }

  function markValid(inputEl) {
    inputEl.classList.remove('is-error');
    inputEl.classList.add('is-valid');
  }


  /* ==========================================================
     4. LOADING STATE HELPER
  ========================================================== */

  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    submitBtn.setAttribute('aria-busy', isLoading ? 'true' : 'false');
    submitBtn.classList.toggle('is-loading', isLoading);
  }


  /* ==========================================================
     5. PASSWORD STRENGTH METER
     Scoring: 1 = Weak, 2 = Fair, 3 = Good, 4 = Strong
     Each rule passed adds 1 point:
       • Length ≥ 8
       • Contains a digit
       • Contains a special character
       • Contains mixed case (upper + lower)
  ========================================================== */

  const STRENGTH_LABELS = { 1: 'Weak', 2: 'Fair', 3: 'Good', 4: 'Strong' };

  function scorePassword(pw) {
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 8)             score++;
    if (/\d/.test(pw))              score++;
    if (/[^a-zA-Z0-9]/.test(pw))   score++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    return Math.max(score, 1);
  }

  newPasswordInput.addEventListener('input', () => {
    const val = newPasswordInput.value;

    // Clear password error as user types
    clearFieldError(passwordError, newPasswordInput);
    hideAlert();

    if (!val) {
      strengthMeter.setAttribute('hidden', '');
      strengthMeter.removeAttribute('data-strength');
      strengthLabel.textContent = '';
      return;
    }

    const score = scorePassword(val);
    strengthMeter.removeAttribute('hidden');
    strengthMeter.setAttribute('data-strength', score);
    strengthLabel.textContent = STRENGTH_LABELS[score] || '';
  });


  /* ==========================================================
     6. PASSWORD VISIBILITY TOGGLES
  ========================================================== */

  function setupToggle(btn, icon, input) {
    btn.addEventListener('click', () => {
      const isHidden = input.type === 'password';
      input.type     = isHidden ? 'text' : 'password';
      icon.className = isHidden ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
      btn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
      btn.setAttribute('aria-pressed', isHidden ? 'true' : 'false');
    });
  }

  setupToggle(togglePasswordBtn, togglePasswordIcon, newPasswordInput);
  setupToggle(toggleConfirmBtn,  toggleConfirmIcon,  confirmInput);


  /* ==========================================================
     7. REAL-TIME CONFIRM PASSWORD MATCHING
  ========================================================== */

  confirmInput.addEventListener('input', () => {
    const matches = confirmInput.value === newPasswordInput.value;

    if (confirmInput.value && !matches) {
      showFieldError(confirmError, confirmErrorText, confirmInput, 'Passwords do not match.');
    } else {
      clearFieldError(confirmError, confirmInput);
      if (matches && confirmInput.value) markValid(confirmInput);
    }

    hideAlert();
  });

  confirmInput.addEventListener('input', () => {
    clearFieldError(confirmError, confirmInput);
    hideAlert();
  });


  /* ==========================================================
     8. FORM VALIDATION
  ========================================================== */

  function validate() {
    let isValid = true;

    clearFieldError(passwordError, newPasswordInput);
    clearFieldError(confirmError, confirmInput);

    const pw      = newPasswordInput.value;
    const confirm = confirmInput.value;

    if (!pw) {
      showFieldError(passwordError, passwordErrorText, newPasswordInput, 'Please enter a new password.');
      isValid = false;
    } else if (pw.length < 8) {
      showFieldError(passwordError, passwordErrorText, newPasswordInput, 'Password must be at least 8 characters.');
      isValid = false;
    } else if (scorePassword(pw) < 2) {
      showFieldError(passwordError, passwordErrorText, newPasswordInput, 'Password is too weak. Add numbers or symbols.');
      isValid = false;
    }

    if (!confirm) {
      showFieldError(confirmError, confirmErrorText, confirmInput, 'Please confirm your new password.');
      isValid = false;
    } else if (confirm !== pw) {
      showFieldError(confirmError, confirmErrorText, confirmInput, 'Passwords do not match.');
      isValid = false;
    }

    return isValid;
  }


  /* ==========================================================
     9. SHOW SUCCESS SCREEN + COUNTDOWN REDIRECT
  ========================================================== */

  function showSuccess() {
    resetCard.setAttribute('hidden', '');
    successCard.removeAttribute('hidden');
    successCard.style.animation = 'card-appear 350ms cubic-bezier(0.2,0,0,1) both';
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Auto-redirect to login after 5 seconds
    let seconds = 5;

    const timer = setInterval(() => {
      seconds--;
      if (countdownEl) countdownEl.textContent = seconds;

      if (seconds <= 0) {
        clearInterval(timer);
        window.location.href = 'login.html';
      }
    }, 1000);
  }


  /* ==========================================================
     10. SUPABASE AUTH STATE LISTENER
     Supabase fires onAuthStateChange with event = 'PASSWORD_RECOVERY'
     when the user arrives via the reset link. We use this to:
       a) Confirm the link is valid → show the reset form.
       b) If no recovery event arrives → show the error card.

     We set a timeout: if Supabase hasn't fired within 3 seconds,
     we show the error card (link likely expired or invalid).
  ========================================================== */

  let recoveryTimeout = setTimeout(() => {
    // No recovery session detected after 3 seconds
    if (!hasRecoverySession) {
      errorCard.removeAttribute('hidden');
    }
  }, 3000);

  window._supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      // Valid recovery session — clear timeout and show form
      clearTimeout(recoveryTimeout);
      hasRecoverySession = true;
      resetCard.removeAttribute('hidden');
      errorCard.setAttribute('hidden', '');
    }

    if (event === 'SIGNED_IN' && !hasRecoverySession) {
      // User is already signed in without a recovery flow
      // This happens if they click the link while already logged in
      clearTimeout(recoveryTimeout);
      hasRecoverySession = true;
      resetCard.removeAttribute('hidden');
      errorCard.setAttribute('hidden', '');
    }
  });


  /* ==========================================================
     11. FORM SUBMIT — supabase.auth.updateUser()
  ========================================================== */

  resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    if (!validate()) {
      const firstErr = resetForm.querySelector('.field__input.is-error');
      if (firstErr) firstErr.focus();
      return;
    }

    if (!hasRecoverySession) {
      showAlert('error', 'Your reset session has expired. Please request a new reset link.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await window._supabase.auth.updateUser({
        password: newPasswordInput.value,
      });

      if (error) {
        let friendly = 'Something went wrong updating your password. Please try again.';

        if (
          error.message.includes('same password') ||
          error.message.includes('different from the old password')
        ) {
          friendly = 'Your new password must be different from your current password.';
        } else if (error.message.includes('weak')) {
          friendly = 'This password is too weak. Please choose a stronger one.';
        } else if (
          error.message.includes('expired') ||
          error.message.includes('invalid')
        ) {
          friendly = 'Your reset session has expired. Please request a new reset link.';
        }

        showAlert('error', friendly);
        setLoading(false);
        return;
      }

      // Password updated successfully
      showSuccess();

    } catch (err) {
      showAlert('error', 'A network error occurred. Please check your connection and try again.');
      console.error('JARA reset-password error:', err);
      setLoading(false);
    }
  });


  /* ==========================================================
     12. CLEAR ERRORS ON INPUT
  ========================================================== */

  newPasswordInput.addEventListener('input', () => hideAlert());
  confirmInput.addEventListener('input', () => hideAlert());


/* ============================================================
   End of DOMContentLoaded
============================================================ */
});
