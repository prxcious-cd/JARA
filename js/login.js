/* ============================================================
   JARA ∆ — Login Page Logic  (auth-integrated)
   js/login.js
============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ---- DOM refs ---- */
  const form         = document.getElementById('loginForm');
  const emailInput   = document.getElementById('email');
  const passwordInput= document.getElementById('password');
  const submitBtn    = document.getElementById('submitBtn');
  const authAlert    = document.getElementById('authAlert');
  const alertMessage = document.getElementById('alertMessage');
  const toggleBtn    = document.getElementById('togglePassword');
  const toggleIcon   = document.getElementById('togglePasswordIcon');

  /* ---- Helpers ---- */
  function showAlert(msg) {
    if (!authAlert || !alertMessage) return;
    alertMessage.textContent = msg;
    authAlert.removeAttribute('hidden');
    authAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideAlert() {
    authAlert?.setAttribute('hidden', '');
  }

  function setLoading(on) {
    if (!submitBtn) return;
    submitBtn.disabled = on;
    submitBtn.setAttribute('aria-busy', String(on));
    submitBtn.classList.toggle('is-loading', on);
  }

  function friendlyError(msg) {
    if (!msg) return 'Something went wrong. Please try again.';
    const m = msg.toLowerCase();
    if (m.includes('invalid login') || m.includes('invalid credentials'))
      return 'Incorrect email or password. Please try again.';
    if (m.includes('email not confirmed'))
      return 'Please verify your email address before logging in.';
    if (m.includes('too many requests') || m.includes('rate limit'))
      return 'Too many attempts. Please wait a few minutes and try again.';
    if (m.includes('network') || m.includes('fetch'))
      return 'Network error. Please check your connection and try again.';
    return 'Something went wrong. Please try again.';
  }

  /* ---- Password toggle ---- */
  toggleBtn?.addEventListener('click', () => {
    const isHidden = passwordInput.type === 'password';
    passwordInput.type = isHidden ? 'text' : 'password';
    toggleIcon.className = isHidden ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
    toggleBtn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
  });

  /* ---- Clear alert on input ---- */
  emailInput?.addEventListener('input', hideAlert);
  passwordInput?.addEventListener('input', hideAlert);

  /* ---- Form submit ---- */
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const email    = emailInput?.value.trim()    || '';
    const password = passwordInput?.value        || '';

    if (!email || !password) {
      showAlert('Please enter your email address and password.');
      return;
    }

    setLoading(true);

    try {
      /*
       Supabase sign in with email + password.
       FUTURE: After sign-in, check profile.onboarding_complete
       and route accordingly.
      */
      const { data, error } = await window._supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        showAlert(friendlyError(error.message));
        setLoading(false);
        return;
      }

      /*
       Sign-in successful.
       FUTURE: Fetch profile to check onboarding_complete:

         const profile = await JARAAuth.getProfile(data.user.id);
         if (!profile?.onboarding_complete) {
           window.location.replace(JARAAuth.ROUTES.onboarding);
           return;
         }
      */

      // Default: send to explore
      window.location.replace(JARAAuth.ROUTES.explore);

    } catch (err) {
      console.error('JARA login error:', err);
      showAlert('A network error occurred. Please check your connection.');
      setLoading(false);
    }
  });

});
