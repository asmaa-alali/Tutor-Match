lucide.createIcons();
let loginAttempts = 0;
const maxLoginAttempts = 5;
let lockUntil = null;

// Theme Management
function toggleTheme() {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcon(isDark);
}

function updateThemeIcon(isDark) {
    const icon = document.getElementById('themeIcon');
    icon.setAttribute('data-lucide', isDark ? 'moon' : 'sun');
    lucide.createIcons();
}

// Initialize theme
const savedTheme = localStorage.getItem('theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);

if (isDark) {
    document.body.classList.add('dark');
}

document.addEventListener('DOMContentLoaded', () => {
    updateThemeIcon(isDark);
});

// Password Toggle
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const passwordIcon = document.getElementById('passwordIcon');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        passwordIcon.setAttribute('data-lucide', 'eye-off');
    } else {
        passwordInput.type = 'password';
        passwordIcon.setAttribute('data-lucide', 'eye');
    }
    
    lucide.createIcons();
}

// ✅ Real working login hooked to backend
// ---- LOGIN HANDLER WITH ATTEMPT LIMIT ----
document.getElementById("signInForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  // 🔒 Step 1: Check if user is locked
  if (lockUntil && Date.now() < lockUntil) {
    const secondsLeft = Math.ceil((lockUntil - Date.now()) / 1000);
    showNotification(`Too many failed attempts. Please wait ${secondsLeft}s before trying again.`, "error");
    return;
  }

  // 🔹 Step 2: Normal login setup
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const submitButton = document.querySelector('button[type="submit"]');
  const originalText = submitButton.textContent;

  submitButton.textContent = "Signing in...";
  submitButton.disabled = true;

  try {
    // 🔹 Step 3: Attempt login with backend
    const res = await fetch("http://localhost:3000/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    // ❌ Step 4: Handle wrong credentials
    if (!res.ok) {
      loginAttempts++;
      const remaining = maxLoginAttempts - loginAttempts;

      if (loginAttempts >= maxLoginAttempts) {
        // 🔒 Step 5: Lock user out for 1 minute
        lockUntil = Date.now() + 60 * 1000;
        showNotification("Too many failed attempts. Try again in 1 minute.", "error");
        loginAttempts = 0; // reset after lock
      } else {
        showNotification(`Invalid credentials. ${remaining} attempt${remaining === 1 ? "" : "s"} left.`, "error");
      }

      submitButton.textContent = originalText;
      submitButton.disabled = false;
      return;
    }

    // ✅ Step 6: Success — reset counters
    loginAttempts = 0;
    lockUntil = null;

    // ✅ Step 7: Send OTP
    showNotification("Sending verification code to your email...", "success");
    const otpRes = await fetch("http://localhost:3000/api/login-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const otpData = await otpRes.json();

    if (!otpRes.ok) {
      showNotification(otpData.error || "Failed to send code", "error");
      return;
    }

    // ✅ Step 8: Open OTP modal
    openOtpModal(email);
  } catch (err) {
    console.error("Login failed:", err);
    showNotification("Server error, please try again.", "error");
  } finally {
    submitButton.textContent = originalText;
    submitButton.disabled = false;
  }
});


// Social Sign In
function signInWithGoogle() {
    showNotification('Redirecting to Google...', 'success');
}

function signInWithGitHub() {
    showNotification('Redirecting to GitHub...', 'success');
}

function signInWithApple() {
    showNotification('Redirecting to Apple...', 'success');
}

// Notification System
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const text = document.getElementById('notificationText');
    
    text.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Input Focus Effects
document.querySelectorAll('.input-field').forEach(input => {
    input.addEventListener('focus', function() {
        this.parentElement.classList.add('focused');
    });
    
    input.addEventListener('blur', function() {
        this.parentElement.classList.remove('focused');
    });
});

// Keyboard Navigation
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && e.target.tagName !== 'BUTTON' && e.target.type !== 'submit') {
        const form = document.getElementById('signInForm');
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton && !submitButton.disabled) {
            submitButton.click();
        }
    }
});
// ---------- OTP MODAL CONTROL ----------
let lastLoginEmail = ""; // we’ll set this after successful /api/login

function openOtpModal(email) {
  lastLoginEmail = email;
  document.getElementById("otpModal").classList.remove("hidden");

  const inputs = document.querySelectorAll(".otp-input");

  // reset and wire inputs
  inputs.forEach((input, i) => {
    input.value = "";
    input.addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/[^0-9]/g, ""); // allow only digits
      if (e.target.value && i < inputs.length - 1) inputs[i + 1].focus();
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !input.value && i > 0) inputs[i - 1].focus();
    });
  });

  inputs[0].focus();

  // verify click
  document.getElementById("verifyOtpBtn").onclick = submitOtpCode;
  // resend click
  document.getElementById("resendOtpBtn").onclick = resendOtp;
}

function closeOtpModal() {
  document.getElementById("otpModal").classList.add("hidden");
}

async function submitOtpCode() {
  const code = Array.from(document.querySelectorAll(".otp-input"))
    .map(i => i.value)
    .join("");

  if (code.length !== 6) {
    showNotification("Please enter the full 6-digit code", "error");
    return;
  }

  try {
    const res = await fetch("http://localhost:3000/api/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: lastLoginEmail, code })
    });
    const data = await res.json();

    if (!res.ok) {
      showNotification(data.error || "Invalid code", "error");
      return;
    }

    showNotification("Verified! Redirecting...", "success");
    setTimeout(() => {
      if (data.role === "student") {
        window.location.href = "/student-dashboard.html";
      } else if (data.role === "tutor") {
        window.location.href = "/tutor-profile.html";
      } else {
        window.location.href = "/Homepage/home.html";
      }
    }, 900);
  } catch (err) {
    console.error("OTP verification failed:", err);
    showNotification("Server error, try again", "error");
  }
}

let resendCount = 0;
const maxResends = 2;

async function resendOtp() {
  if (resendCount >= maxResends) {
    showNotification("You’ve reached the resend limit. Try signing in again.", "error");
    document.getElementById("resendOtpBtn").disabled = true;
    document.getElementById("resendOtpBtn").classList.add("opacity-50", "cursor-not-allowed");
    return;
  }

  try {
    const res = await fetch("http://localhost:3000/api/login-otp", { // make sure it's the same endpoint
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: lastLoginEmail })
    });
    const data = await res.json();

    if (!res.ok) {
      showNotification(data.error || "Couldn’t resend code", "error");
      return;
    }

    resendCount++;
    const remaining = maxResends - resendCount;
    showNotification(`Code resent! You have ${remaining} attempt${remaining === 1 ? "" : "s"} left.`, "success");

    // Optional: briefly disable button for 10s to avoid spam
    const btn = document.getElementById("resendOtpBtn");
    btn.disabled = true;
    setTimeout(() => { btn.disabled = false; }, 10000);
  } catch (err) {
    console.error("Resend failed:", err);
    showNotification("Server error, try again", "error");
  }
}
