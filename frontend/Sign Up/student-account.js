// ====================== THEME MANAGEMENT ======================
function toggleTheme() {
  document.body.classList.toggle("dark");
  const isDark = document.body.classList.contains("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  updateThemeIcons(isDark);
}

function updateThemeIcons(isDark) {
  const icons = ["themeIcon", "themeIconMobile", "themeIconBottom"];
  icons.forEach((iconId) => {
    const icon = document.getElementById(iconId);
    if (icon) icon.setAttribute("data-lucide", isDark ? "moon" : "sun");
  });
  lucide.createIcons();
}

// Initialize theme
const savedTheme = localStorage.getItem("theme");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const isDark = savedTheme === "dark" || (!savedTheme && prefersDark);
if (isDark) document.body.classList.add("dark");

document.addEventListener("DOMContentLoaded", () => {
  updateThemeIcons(isDark);
});

// ====================== NAVBAR SCROLL EFFECT ======================
const navbar = document.getElementById("navbar");
window.addEventListener("scroll", () => {
  if (window.scrollY > 50) navbar.classList.add("glass", "shadow-2xl");
  else navbar.classList.remove("glass", "shadow-2xl");
});

// ====================== PARTICLE BACKGROUND ======================
function createParticle() {
  const particle = document.createElement("div");
  particle.className = "particle";
  particle.style.left = Math.random() * 100 + "vw";
  particle.style.animationDuration = Math.random() * 3 + 5 + "s";
  particle.style.opacity = Math.random() * 0.5 + 0.2;
  document.getElementById("particles").appendChild(particle);
  setTimeout(() => particle.remove(), 8000);
}
setInterval(createParticle, 800);

// ====================== MAGNETIC BUTTON EFFECT ======================
document.querySelectorAll(".magnetic").forEach((element) => {
  element.addEventListener("mousemove", (e) => {
    const rect = element.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    element.style.transform = `translate(${x * 0.1}px, ${y * 0.1}px)`;
  });
  element.addEventListener("mouseleave", () => {
    element.style.transform = "translate(0, 0)";
  });
});

// ====================== FORM VALIDATION ======================
const form = document.getElementById("registrationForm");
const inputs = form.querySelectorAll("input, select");

inputs.forEach((input) => {
  input.addEventListener("blur", () => validateField(input));
  input.addEventListener("input", () => {
    if (input.id === "password") updatePasswordStrength();
    else if (input.id === "confirmPassword") validatePasswordMatch();
    else if (input.id === "email") validateEmail();
  });
});

// ---------------------- EMAIL VALIDATION ----------------------
function validateEmail() {
  const email = document.getElementById("email");
  const emailError = document.getElementById("emailError");
  const emailSuccess = document.getElementById("emailSuccess");

  const aubEmailRegex = /^[a-zA-Z0-9._%+-]+@mail\.aub\.edu$/;

  if (email.value && aubEmailRegex.test(email.value)) {
    email.classList.remove("error");
    email.classList.add("success");
    emailError.style.display = "none";
    emailSuccess.style.display = "block";
    return true;
  } else if (email.value) {
    email.classList.add("error");
    email.classList.remove("success");
    emailError.style.display = "block";
    emailSuccess.style.display = "none";
    return false;
  } else {
    email.classList.remove("error", "success");
    emailError.style.display = "none";
    emailSuccess.style.display = "none";
    return false;
  }
}

// ---------------------- PASSWORD STRENGTH ----------------------
function updatePasswordStrength() {
  const password = document.getElementById("password").value;
  const strengthFill = document.getElementById("strengthFill");
  const strengthText = document.getElementById("strengthText");

  let strength = 0;
  let feedback = [];

  if (password.length >= 8) strength++;
  else feedback.push("at least 8 characters");

  if (/[A-Z]/.test(password)) strength++;
  else feedback.push("1 capital letter");

  if (/[0-9]/.test(password)) strength++;
  else feedback.push("1 number");

  if (/[!@#$%^&*(),.?\":{}|<>]/.test(password)) strength++;

  strengthFill.className = "strength-fill";
  if (strength <= 1) {
    strengthFill.classList.add("strength-weak");
    strengthText.textContent = "Weak - Missing: " + feedback.join(", ");
    strengthText.className = "text-sm text-red-400";
  } else if (strength === 2) {
    strengthFill.classList.add("strength-fair");
    strengthText.textContent = "Fair - Missing: " + feedback.join(", ");
    strengthText.className = "text-sm text-yellow-400";
  } else if (strength === 3) {
    strengthFill.classList.add("strength-good");
    strengthText.textContent = "Good password!";
    strengthText.className = "text-sm text-green-400";
  } else {
    strengthFill.classList.add("strength-strong");
    strengthText.textContent = "Strong password!";
    strengthText.className = "text-sm text-green-400";
  }
  return strength >= 3;
}

// ---------------------- PASSWORD MATCH ----------------------
function validatePasswordMatch() {
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword");
  const confirmPasswordError = document.getElementById("confirmPasswordError");
  const confirmPasswordSuccess = document.getElementById("confirmPasswordSuccess");

  if (confirmPassword.value && password === confirmPassword.value) {
    confirmPassword.classList.remove("error");
    confirmPassword.classList.add("success");
    confirmPasswordError.style.display = "none";
    confirmPasswordSuccess.style.display = "block";
    return true;
  } else if (confirmPassword.value) {
    confirmPassword.classList.add("error");
    confirmPassword.classList.remove("success");
    confirmPasswordError.style.display = "block";
    confirmPasswordSuccess.style.display = "none";
    return false;
  } else {
    confirmPassword.classList.remove("error", "success");
    confirmPasswordError.style.display = "none";
    confirmPasswordSuccess.style.display = "none";
    return false;
  }
}

// ---------------------- GENERIC FIELD VALIDATION ----------------------
function validateField(field) {
  const errorElement = document.getElementById(field.id + "Error");

  if (field.hasAttribute("required") && !field.value.trim()) {
    field.classList.add("error");
    if (errorElement) errorElement.style.display = "block";
    return false;
  } else {
    field.classList.remove("error");
    if (errorElement) errorElement.style.display = "none";
    return true;
  }
}

// ====================== FORM SUBMISSION WITH EMAIL VERIFICATION ======================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  let isValid = true;
  inputs.forEach((input) => {
    if (!validateField(input)) isValid = false;
  });

  if (!validateEmail()) isValid = false;
  if (!updatePasswordStrength()) isValid = false;
  if (!validatePasswordMatch()) isValid = false;

  const confirmInfo = document.getElementById("confirmInfo");
  const agreeTerms = document.getElementById("agreeTerms");

  if (!confirmInfo.checked) {
    document.getElementById("confirmInfoError").style.display = "block";
    isValid = false;
  } else {
    document.getElementById("confirmInfoError").style.display = "none";
  }

  if (!agreeTerms.checked) {
    document.getElementById("agreeTermsError").style.display = "block";
    isValid = false;
  } else {
    document.getElementById("agreeTermsError").style.display = "none";
  }

  const gpa = document.getElementById("gpa");
  if (gpa.value && (parseFloat(gpa.value) < 0 || parseFloat(gpa.value) > 4)) {
    gpa.classList.add("error");
    document.getElementById("gpaError").style.display = "block";
    isValid = false;
  }

  if (!isValid) {
    const firstError = form.querySelector(".error");
    if (firstError) firstError.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  // Gather form data
  const formData = {
    firstName: document.getElementById("firstName").value.trim(),
    lastName: document.getElementById("lastName").value.trim(),
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("password").value.trim(),
    birthdate: document.getElementById("birthdate").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    studentId: document.getElementById("studentId").value.trim(),
    currentYear: document.getElementById("currentYear").value.trim(),
    major: document.getElementById("major").value.trim(),
    gpa: parseFloat(document.getElementById("gpa").value.trim()),
  };

  try {
      const res = await fetch("https://tutor-match-n8a7.onrender.com/api/signup/student", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    const data = await res.json();
    if (res.ok) {
      // Show verification message instead of immediate login
      document.getElementById("welcomeMessage").textContent =
        `🎉 Welcome ${formData.firstName}! Your account has been created. Please check your email to verify your account before logging in.`;
      document.getElementById("successModal").style.display = "flex";
    } else {
      alert("Error: " + data.error);
    }
  } catch (err) {
    console.error("Server error:", err);
    alert("Server error. Try again later.");
  }
});

// ====================== NAVIGATION ======================
function goToHome() {
  window.location.href = "../Homepage/home.html";
}

// ====================== COMING SOON MODAL ======================
function showComingSoon() {
  document.getElementById("comingSoonModal").style.display = "flex";
}
function closeComingSoonModal() {
  document.getElementById("comingSoonModal").style.display = "none";
}
window.showComingSoon = showComingSoon;
window.closeComingSoonModal = closeComingSoonModal;

// ====================== MODAL CLICK BEHAVIOR ======================
document.getElementById("successModal").addEventListener("click", (e) => {
  if (e.target === document.getElementById("successModal")) goToHome();
});
document.getElementById("comingSoonModal").addEventListener("click", (e) => {
  if (e.target === document.getElementById("comingSoonModal")) closeComingSoonModal();
});

// ====================== ANIMATIONS ======================
document.addEventListener("DOMContentLoaded", () => {
  const animatedElements = document.querySelectorAll(
    ".animate-slide-up, .animate-slide-left, .animate-scale-in"
  );
  animatedElements.forEach((el, i) => {
    el.style.opacity = "0";
    el.style.transform = el.classList.contains("animate-slide-up")
      ? "translateY(60px)"
      : el.classList.contains("animate-slide-left")
      ? "translateX(-60px)"
      : "scale(0.8)";
    setTimeout(() => {
      el.style.transition = "all 0.8s ease-out";
      el.style.opacity = "1";
      el.style.transform = "translate(0,0) scale(1)";
    }, i * 100);
  });
});
