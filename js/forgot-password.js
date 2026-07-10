/* ============================================================
   JARA ∆ — Forgot Password Logic  (auth-integrated)
   js/forgot-password.js
============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  const forgotForm     = document.getElementById('forgotForm');
  const emailCard      = document.getElementById('emailCard');
  const successCard    = document.getElementById('successCard');
  const emailInput     = document.getElementById('email');
  const submitBtn      = document.getElementById('submitBtn');
  const authAlert      = document.getElementById('authAlert');
  const alertIcon      = document.getElementById('alertIcon');
  const alertMessage   = document.getElementById('alertMessage');
  const emailError     = document.getElementById('emailError');
  const emailErrorText = document.getElementById('emailErrorText');
  const successEmail   = document.getElementById('successEmail');
  const resendBtn      = document.getElementById('resendBtn');

  let lastEmail = '';

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
  }

  function hideAlert() { authAlert?.setAttribute('hidden', ''); }

  function showFieldError(msg) {
    if (!emailError || !emailErrorText) return;
    emailErrorText.textContent = msg;
    emailError.removeAttribute('hidden');
    emailInput?.classList.add('is-error');
    emailInput?.setAttribute('aria-invalid', 'true');
  }

  function clearFieldError() {
    emailError?.setAttribute('hidden', '');
    emailInput?.classList.remove('is-error');
    emailInput?.removeAttribute('aria-invalid');
  }

  function setLoading(on) {
    if (!submitBtn) return;
    submitBtn.disabled = on;
    submitBtn.setAttribute('aria-busy', String(on));
    submitBtn.classList.toggle('is-loading', on);
  }

  function validate() {
    clearFieldError();
    hideAlert();
    const val = emailInput?.value.trim() || '';
    if (!val) { showFieldError('Please enter your email address.'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) { showFieldError('Please enter a valid email address.'); return false; }
    return true;
  }

  async function sendResetEmail(email) {
    /*
     CHANGE: Replace the redirectTo URL with your live GitHub Pages URL.
     Example: https://yourname.github.io/jara/auth/reset-password.html
     Also add this URL to Supabase → Authentication → URL Configuration → Redirect URLs.
    */
    const { error } = await window._supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/auth/reset-password.html',
    });
    return error;
  }

  forgotForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    const email = emailInput.value.trim();
    lastEmail   = email;

    try {
      const error = await sendResetEmail(email);

      if (error) {
        let msg = 'Something went wrong. Please try again.';
        if (error.message.toLowerCase().includes('rate limit')) {
          msg = 'Too many requests. Please wait a few minutes and try again.';
        }
        showAlert('error', msg);
        setLoading(false);
        return;
      }

      // Always show success screen (prevents email enumeration)
      if (successEmail) successEmail.textContent = email;
      emailCard?.setAttribute('hidden', '');
      successCard?.removeAttribute('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err) {
      console.error('JARA forgot-password error:', err);
      showAlert('error', 'A network error occurred. Please check your connection.');
      setLoading(false);
    }
  });

  resendBtn?.addEventListener('click', async () => {
    if (!lastEmail) return;
    resendBtn.disabled    = true;
    resendBtn.textContent = 'Sending…';

    const error = await sendResetEmail(lastEmail);

    if (error) {
      resendBtn.disabled    = false;
      resendBtn.textContent = 'Resend failed. Tap to try again.';
      return;
    }

    resendBtn.textContent = 'Email sent! Check your inbox.';
    let countdown = 60;
    const timer = setInterval(() => {
      countdown--;
      resendBtn.textContent = `Resend again in ${countdown}s`;
      if (countdown <= 0) {
        clearInterval(timer);
        resendBtn.disabled    = false;
        resendBtn.textContent = "Didn't receive it? Resend email";
      }
    }, 1000);
  });

  emailInput?.addEventListener('input', () => { clearFieldError(); hideAlert(); });

});
