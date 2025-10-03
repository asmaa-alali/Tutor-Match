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

// Form Submission
document.getElementById('signInForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    showNotification('Signing you in...', 'success');
    
    const submitButton = document.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Signing in...';
    submitButton.disabled = true;
    
    setTimeout(() => {
        showNotification('Welcome back! Redirecting...', 'success');
        
        setTimeout(() => {
            showNotification('Sign in successful!', 'success');
            submitButton.textContent = originalText;
            submitButton.disabled = false;
        }, 1500);
    }, 2000);
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
