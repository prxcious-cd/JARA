/* ============================================================
   JARA ∆ — Reset Password Logic  (auth-integrated)
   js/reset-password.js
============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  const resetCard          = document.getElementById('resetCard');
  const errorCard          = document.getElementById('errorCard');
  const successCard        = document.getElementById('successCard');
  const resetForm          = document.getElementById('resetForm');
  const newPasswordInput   = document.getElementById('newPassword');
  const confirmInput       = document.getElementById('confirmPassword');
  const submitBtn          = document.getElementById('submitBtn');
  const authAlert          = document.getElementById('authAlert');
  const alertIcon          = document.getElementById('alertIcon');
  const alertMessage       = document.getElementById('alertMessage');
  const passwordError      = document.getElementById('passwordError');
  const passwordErrorText  = document.getElementById('passwordErrorText');
  const confirmError       = document.getElementById('confirmError');
  const confirmErrorText   = document.getElementById('confirmErrorText');
  const togglePasswordBtn  = document.getElementById('togglePassword');
  const togglePasswordIcon = document.getElementById('togglePasswordIcon');
  const toggleConfirmBtn   = document.getElementById('toggleConfirm');
  const toggleConfirmIcon  = document.getElementById('toggleConfirmIcon');
  const strengthMeter      = document.getElementById('strengthMeter');
  const strengthLabel      = document.getElementById('passwordStrengthLabel');
  const countdownEl        = document.getElementById('countdown');

  let hasRecoverySession = false;

  /* ---- Helpers ---- */
  function showAlert(type, msg) {
    if (!authAlert || !alertMessage) return;
    authAlert.className = `auth-alert${type === 'success' ? ' auth-alert--success' : ''}`;
    if (alertIcon) {
      alertIcon.className = type === 'success'
        ? 'auth-alert__icon fa-solid fa-circle-check'
        : 'auth-alert__icon fa-solid fa-circle-exclamation';
    }
    alertMessage.textContent = msg;
    authAlert.removeAttribute('hidden');
    authAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideAlert() { authAlert?.setAttribute('hidden', ''); }

  function setLoading(on) {
    if (!submitBtn) return;
    submitBtn.disabled = on;
    submitBtn.setAttribute('aria-busy', String(on));
    submitBtn.classList.toggle('is-loading', on);
  }

  function showFieldError(errEl, textEl, inputEl, msg) {
    if (!errEl || !textEl || !inputEl) return;
    textEl.textContent = msg;
    errEl.removeAttribute('hidden');
    inputEl.classList.add('is-error');
    inputEl.setAttribute('aria-invalid', 'true');
  }

  function clearFieldError(errEl, inputEl) {
    errEl?.setAttribute('hidden', '');
    inputEl?.classList.remove('is-error');
    inputEl?.removeAttribute('aria-invalid');
  }

  /* ---- Password strength ---- */
  const STRENGTH_LABELS = { 1:'Weak', 2:'Fair', 3:'Good', 4:'Strong' };
  function scorePassword(pw) {
    if (!pw) return 0;
    let s = 0;
    if (pw.length >= 8)                        s++;
    if (/\d/.test(pw))                         s++;
    if (/[^a-zA-Z0-9]/.test(pw))              s++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
    return Math.max(s, 1);
  }

  newPasswordInput?.addEventListener('input', () => {
    hideAlert();
    clearFieldError(passwordError, newPasswordInput);
    const val = newPasswordInput.value;
    if (!val) { strengthMeter?.setAttribute('hidden', ''); return; }
    const score = scorePassword(val);
    if (strengthMeter) {
      strengthMeter.removeAttribute('hidden');
      strengthMeter.setAttribute('data-strength', score);
    }
    if (strengthLabel) strengthLabel.textContent = STRENGTH_LABELS[score] || '';
  });

  /* ---- Password toggles ---- */
  function setupToggle(btn, icon, input) {
    btn?.addEventListener('click', () => {
      const isHidden = input.type === 'password';
      input.type     = isHidden ? 'text' : 'password';
      if (icon) icon.className = isHidden ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
      btn.setAttribute('aria-label',   isHidden ? 'Hide password' : 'Show password');
      btn.setAttribute('aria-pressed', isHidden ? 'true' : 'false');
    });
  }
  setupToggle(togglePasswordBtn, togglePasswordIcon, newPasswordInput);
  setupToggle(toggleConfirmBtn,  toggleConfirmIcon,  confirmInput);

  /* ---- Confirm matching ---- */
  confirmInput?.addEventListener('input', () => {
    hideAlert();
    clearFieldError(confirmError, confirmInput);
    if (confirmInput.value && confirmInput.value !== newPasswordInput.value) {
      showFieldError(confirmError, confirmErrorText, confirmInput, 'Passwords do not match.');
    }
  });

  /* ---- Validation ---- */
  function validate() {
    let valid = true;
    clearFieldError(passwordError, newPasswordInput);
    clearFieldError(confirmError,  confirmInput);

    const pw      = newPasswordInput?.value || '';
    const confirm = confirmInput?.value     || '';

    if (!pw) {
      showFieldError(passwordError, passwordErrorText, newPasswordInput, 'Please enter a new password.');
      valid = false;
    } else if (pw.length < 8) {
      showFieldError(passwordError, passwordErrorText, newPasswordInput, 'Password must be at least 8 characters.');
      valid = false;
    } else if (scorePassword(pw) < 2) {
      showFieldError(passwordError, passwordErrorText, newPasswordInput, 'Password is too weak. Add numbers or symbols.');
      valid = false;
    }

    if (!confirm) {
      showFieldError(confirmError, confirmErrorText, confirmInput, 'Please confirm your new password.');
      valid = false;
    } else if (confirm !== pw) {
      showFieldError(confirmError, confirmErrorText, confirmInput, 'Passwords do not match.');
      valid = false;
    }

    return valid;
  }

  /* ---- Success screen + countdown ---- */
  function showSuccess() {
    resetCard?.setAttribute('hidden', '');
    successCard?.removeAttribute('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    let seconds = 5;
    const timer = setInterval(() => {
      seconds--;
      if (countdownEl) countdownEl.textContent = seconds;
      if (seconds <= 0) {
        clearInterval(timer);
        window.location.replace(JARAAuth.ROUTES.login);
      }
    }, 1000);
  }

  /* ---- Auth state listener ---- */
  let recoveryTimeout = setTimeout(() => {
    if (!hasRecoverySession) {
      errorCard?.removeAttribute('hidden');
      resetCard?.setAttribute('hidden', '');
    }
  }, 3000);

  window._supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && !hasRecoverySession)) {
      clearTimeout(recoveryTimeout);
      hasRecoverySession = true;
      resetCard?.removeAttribute('hidden');
      errorCard?.setAttribute('hidden', '');
    }
  });

  /* ---- Form submit ---- */
  resetForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    if (!validate()) return;

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
        let msg = 'Something went wrong updating your password. Please try again.';
        const m = error.message.toLowerCase();
        if (m.includes('same password') || m.includes('different from the old')) {
          msg = 'Your new password must be different from your current password.';
        } else if (m.includes('expired') || m.includes('invalid')) {
          msg = 'Your reset session has expired. Please request a new reset link.';
        }
        showAlert('error', msg);
        setLoading(false);
        return;
      }

      showSuccess();

    } catch (err) {
      console.error('JARA reset-password error:', err);
      showAlert('error', 'A network error occurred. Please check your connection.');
      setLoading(false);
    }
  });

  newPasswordInput?.addEventListener('input', hideAlert);
  confirmInput?.addEventListener('input', hideAlert);

});
