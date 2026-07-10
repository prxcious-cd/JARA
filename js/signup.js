/* ============================================================
   JARA ∆ — Signup Page Logic  (auth-integrated)
   js/signup.js
============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ---- DOM refs ---- */
  const form            = document.getElementById('signupForm');
  const fullNameInput   = document.getElementById('fullName');
  const emailInput      = document.getElementById('email');
  const passwordInput   = document.getElementById('newPassword');
  const confirmInput    = document.getElementById('confirmPassword');
  const termsCheckbox   = document.getElementById('terms');
  const submitBtn       = document.getElementById('submitBtn');
  const authAlert       = document.getElementById('authAlert');
  const alertMessage    = document.getElementById('alertMessage');
  const alertIcon       = document.getElementById('alertIcon');
  const signupCard      = document.getElementById('signupCard');
  const successCard     = document.getElementById('successCard');
  const successEmail    = document.getElementById('successEmail');
  const resendBtn       = document.getElementById('resendBtn');
  const togglePassBtn   = document.getElementById('togglePassword');
  const togglePassIcon  = document.getElementById('togglePasswordIcon');
  const strengthMeter   = document.getElementById('strengthMeter');
  const strengthLabel   = document.getElementById('passwordStrengthLabel');

  let lastEmail = '';

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
  }

  function hideAlert() { authAlert?.setAttribute('hidden', ''); }

  function setLoading(on) {
    if (!submitBtn) return;
    submitBtn.disabled = on;
    submitBtn.setAttribute('aria-busy', String(on));
    submitBtn.classList.toggle('is-loading', on);
  }

  function fieldError(inputEl, errorEl, textEl, msg) {
    if (!inputEl || !errorEl || !textEl) return;
    textEl.textContent = msg;
    errorEl.removeAttribute('hidden');
    inputEl.classList.add('is-error');
    inputEl.setAttribute('aria-invalid', 'true');
  }

  function clearFieldErrors() {
    document.querySelectorAll('.field__input').forEach(el => {
      el.classList.remove('is-error');
      el.removeAttribute('aria-invalid');
    });
    document.querySelectorAll('.field__error').forEach(el => {
      el.setAttribute('hidden', '');
    });
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

  passwordInput?.addEventListener('input', () => {
    const val = passwordInput.value;
    if (!val) {
      strengthMeter?.setAttribute('hidden', '');
      return;
    }
    const score = scorePassword(val);
    if (strengthMeter) {
      strengthMeter.removeAttribute('hidden');
      strengthMeter.setAttribute('data-strength', score);
    }
    if (strengthLabel) strengthLabel.textContent = STRENGTH_LABELS[score] || '';
  });

  /* ---- Password toggle ---- */
  togglePassBtn?.addEventListener('click', () => {
    const isHidden = passwordInput.type === 'password';
    passwordInput.type = isHidden ? 'text' : 'password';
    if (togglePassIcon) {
      togglePassIcon.className = isHidden ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
    }
    togglePassBtn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
  });

  /* ---- Clear on input ---- */
  [fullNameInput, emailInput, passwordInput, confirmInput].forEach(el => {
    el?.addEventListener('input', hideAlert);
  });

  /* ---- Form validation ---- */
  function validate() {
    clearFieldErrors();
    hideAlert();
    let valid = true;

    const name     = fullNameInput?.value.trim()  || '';
    const email    = emailInput?.value.trim()     || '';
    const password = passwordInput?.value         || '';
    const confirm  = confirmInput?.value          || '';

    if (!name) {
      fieldError(
        fullNameInput,
        document.getElementById('nameError'),
        document.getElementById('nameErrorText'),
        'Please enter your full name.'
      );
      valid = false;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      fieldError(
        emailInput,
        document.getElementById('emailError'),
        document.getElementById('emailErrorText'),
        'Please enter a valid email address.'
      );
      valid = false;
    }

    if (!password || password.length < 8) {
      fieldError(
        passwordInput,
        document.getElementById('passwordError'),
        document.getElementById('passwordErrorText'),
        'Password must be at least 8 characters.'
      );
      valid = false;
    }

    if (password && scorePassword(password) < 2) {
      fieldError(
        passwordInput,
        document.getElementById('passwordError'),
        document.getElementById('passwordErrorText'),
        'Password is too weak. Add numbers or symbols.'
      );
      valid = false;
    }

    if (!confirm || confirm !== password) {
      fieldError(
        confirmInput,
        document.getElementById('confirmError'),
        document.getElementById('confirmErrorText'),
        'Passwords do not match.'
      );
      valid = false;
    }

    if (!termsCheckbox?.checked) {
      showAlert('error', 'Please accept the Terms of Service to continue.');
      valid = false;
    }

    return valid;
  }

  /* ---- Form submit ---- */
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    const email    = emailInput.value.trim();
    const password = passwordInput.value;
    const fullName = fullNameInput.value.trim();
    lastEmail      = email;

    try {
      /*
       Create the Supabase Auth account.
       The handle_new_user() database trigger (003_functions.sql)
       automatically creates a row in the profiles table.

       We pass full_name in the metadata so the trigger can
       use it when creating the profile row.

       FUTURE: Pass additional metadata here as more onboarding
       fields are introduced (e.g. account_type, school_id):
         data: { full_name, account_type, school_id }
      */
      const { data, error } = await window._supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          /*
           FUTURE: Set emailRedirectTo to your live domain
           so the confirmation link lands on the correct page.
             emailRedirectTo: 'https://yourname.github.io/jara/auth/login.html'
          */
        },
      });

      if (error) {
        let msg = 'Something went wrong. Please try again.';
        const m = error.message.toLowerCase();
        if (m.includes('already registered') || m.includes('already exists')) {
          msg = 'An account with this email already exists. Try logging in instead.';
        } else if (m.includes('password')) {
          msg = 'Your password does not meet the minimum requirements.';
        } else if (m.includes('rate limit')) {
          msg = 'Too many sign-up attempts. Please wait a moment and try again.';
        }
        showAlert('error', msg);
        setLoading(false);
        return;
      }

      /*
       Supabase returns identities = [] when the user already exists
       but email confirmation is required (prevents enumeration).
       In either case we show the success screen.
      */
      if (successEmail) successEmail.textContent = email;
      if (signupCard)   signupCard.setAttribute('hidden', '');
      if (successCard)  successCard.removeAttribute('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err) {
      console.error('JARA signup error:', err);
      showAlert('error', 'A network error occurred. Please check your connection.');
      setLoading(false);
    }
  });

  /* ---- Resend verification email ---- */
  resendBtn?.addEventListener('click', async () => {
    if (!lastEmail) return;
    resendBtn.disabled    = true;
    resendBtn.textContent = 'Sending…';

    try {
      const { error } = await window._supabase.auth.resend({
        type:  'signup',
        email: lastEmail,
      });

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

    } catch (err) {
      resendBtn.disabled    = false;
      resendBtn.textContent = 'Resend failed. Tap to try again.';
    }
  });

});
