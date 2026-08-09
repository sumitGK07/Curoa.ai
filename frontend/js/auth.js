/**
 * Curoa.AI — Auth page behaviour (login + signup)
 */
document.addEventListener("DOMContentLoaded", () => {
  // Redirect already-logged-in users straight to the workspace.
  if (CuroaAPI.isLoggedIn() && document.body.dataset.page !== "app") {
    // Keep this soft: don't force it if backend isn't up yet in dev.
  }

  wireUpPasswordToggles();
  wireUpLoginForm();
  wireUpSignupForm();
});

function wireUpPasswordToggles() {
  document.querySelectorAll(".toggle-visibility").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = btn.closest(".field-input").querySelector("input");
      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      btn.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
    });
  });
}

function showAlert(form, message) {
  const alertBox = form.querySelector(".form-alert");
  if (!alertBox) return;
  alertBox.querySelector("[data-alert-text]").textContent = message;
  alertBox.classList.add("show");
}

function clearAlert(form) {
  const alertBox = form.querySelector(".form-alert");
  if (alertBox) alertBox.classList.remove("show");
}

function setFieldError(form, fieldName, message) {
  const group = form.querySelector(`[data-field="${fieldName}"]`);
  if (!group) return;
  group.classList.add("error");
  const err = group.querySelector(".field-error");
  if (err) err.textContent = message;
}

function clearFieldErrors(form) {
  form.querySelectorAll(".field-group.error").forEach((g) => g.classList.remove("error"));
}

function setLoading(button, loading, loadingText = "Please wait…") {
  if (loading) {
    button.dataset.originalText = button.textContent;
    button.textContent = loadingText;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
  }
}

function wireUpLoginForm() {
  const form = document.getElementById("login-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearAlert(form);
    clearFieldErrors(form);

    const email = form.email.value.trim();
    const password = form.password.value;

    if (!email) return setFieldError(form, "email", "Enter your email address.");
    if (!password) return setFieldError(form, "password", "Enter your password.");

    const submitBtn = form.querySelector('button[type="submit"]');
    setLoading(submitBtn, true, "Signing in…");

    try {
      const result = await CuroaAPI.login({ email, password });
      CuroaAPI.setSession(result.access_token, result.user);
      window.location.href = "index.html";
    } catch (err) {
      showAlert(form, err.message || "Couldn't sign you in. Check your details and try again.");
    } finally {
      setLoading(submitBtn, false);
    }
  });
}

function wireUpSignupForm() {
  const form = document.getElementById("signup-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearAlert(form);
    clearFieldErrors(form);

    const fullName = form.full_name.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;
    const confirmPassword = form.confirm_password.value;
    const agreed = form.terms.checked;

    let hasError = false;
    if (!fullName) { setFieldError(form, "full_name", "Enter your full name."); hasError = true; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { setFieldError(form, "email", "Enter a valid email address."); hasError = true; }
    if (password.length < 8) { setFieldError(form, "password", "Use at least 8 characters."); hasError = true; }
    if (password !== confirmPassword) { setFieldError(form, "confirm_password", "Passwords don't match."); hasError = true; }
    if (!agreed) { showAlert(form, "Please agree to the Terms and the medical disclaimer to continue."); hasError = true; }
    if (hasError) return;

    const submitBtn = form.querySelector('button[type="submit"]');
    setLoading(submitBtn, true, "Creating account…");

    try {
      const result = await CuroaAPI.signup({ full_name: fullName, email, password });
      CuroaAPI.setSession(result.access_token, result.user);
      window.location.href = "index.html";
    } catch (err) {
      showAlert(form, err.message || "Couldn't create your account. Please try again.");
    } finally {
      setLoading(submitBtn, false);
    }
  });
}
