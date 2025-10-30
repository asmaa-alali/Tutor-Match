lucide.createIcons();

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
document.getElementById("signInForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const submitButton = document.querySelector('button[type="submit"]');
  const originalText = submitButton.textContent;

  submitButton.textContent = "Signing in...";
  submitButton.disabled = true;

  try {
    const res = await fetch("http://localhost:3000/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      // Wrong credentials / not verified / etc.
      showNotification(data.error || "Invalid email or password", "error");
      submitButton.textContent = originalText;
      submitButton.disabled = false;
      return;
    }

    // ✅ Success → redirect by role
    showNotification("Login successful! Redirecting...", "success");

    setTimeout(() => {
      if (data.role === "student") {
        window.location.href = "/student-dashboard.html";
      } else if (data.role === "tutor") {
        window.location.href = "/tutor-dashboard.html";
      } else {
        window.location.href = "/Homepage/home.html";
      }
    }, 1000);
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
