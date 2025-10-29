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

const savedTheme = localStorage.getItem("theme");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const isDark = savedTheme === "dark" || (!savedTheme && prefersDark);
if (isDark) document.body.classList.add("dark");

// ====================== UI Enhancements ======================
document.addEventListener("DOMContentLoaded", () => {
  updateThemeIcons(isDark);
  lucide.createIcons();
});
// ================= FILE UPLOAD PREVIEW =================
function handleFileUpload(inputId, previewId, allowedSizeMB) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);

  input.addEventListener("change", () => {
    const file = input.files[0];
    preview.innerHTML = ""; // clear old preview

    if (!file) return;

    const maxSize = allowedSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      preview.innerHTML = `<p class="text-red-400 text-sm">❌ File exceeds ${allowedSizeMB}MB limit</p>`;
      input.value = "";
      return;
    }

    const fileName = document.createElement("p");
    fileName.className = "text-sm text-green-400 mt-1";
    fileName.textContent = `✅ ${file.name}`;
    preview.appendChild(fileName);
  });
}

// init previews
handleFileUpload("passportPhoto", "passportPhotoPreview", 2); // 2MB
handleFileUpload("certificate", "certificatePreview", 5);     // 5MB

// ================= PASSWORD VALIDATION =================
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

function validatePasswordMatch() {
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword");
  const error = document.getElementById("confirmPasswordError");
  const success = document.getElementById("confirmPasswordSuccess");

  if (confirmPassword.value && password === confirmPassword.value) {
    confirmPassword.classList.remove("error");
    confirmPassword.classList.add("success");
    error.style.display = "none";
    success.style.display = "block";
    return true;
  } else if (confirmPassword.value) {
    confirmPassword.classList.add("error");
    confirmPassword.classList.remove("success");
    error.style.display = "block";
    success.style.display = "none";
    return false;
  } else {
    confirmPassword.classList.remove("error", "success");
    error.style.display = "none";
    success.style.display = "none";
    return false;
  }
}

// ====================== FORM SUBMISSION ======================
const form = document.getElementById("tutorForm");
document.getElementById("password").addEventListener("input", updatePasswordStrength);
document.getElementById("confirmPassword").addEventListener("input", validatePasswordMatch);

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // password checks
  if (!updatePasswordStrength()) {
    document.getElementById("passwordError").style.display = "block";
    return;
  }
  if (!validatePasswordMatch()) {
    document.getElementById("confirmPasswordError").style.display = "block";
    return;
  }

  // subjects check
  const subjectsSelected = [...document.querySelectorAll("input[name='subjects']:checked")].map(s => s.value);
  if (subjectsSelected.length === 0) {
    document.getElementById("subjectsError").style.display = "block";
    return;
  } else {
    document.getElementById("subjectsError").style.display = "none";
  }

  // agreements check
  if (!document.getElementById("accurateInfo").checked || !document.getElementById("terms").checked) {
    document.getElementById("agreementsError").style.display = "block";
    return;
  } else {
    document.getElementById("agreementsError").style.display = "none";
  }

  // file validation
  const passportFile = document.getElementById("passportPhoto").files[0];
  const certificateFile = document.getElementById("certificate").files[0];
  if (!passportFile || !certificateFile) {
    alert("Please upload both passport and certificate before submitting.");
    return;
  }

  // ✅ Build multipart form
  const fd = new FormData();
  fd.append("firstName", document.getElementById("firstName").value.trim());
  fd.append("lastName", document.getElementById("lastName").value.trim());
  fd.append("email", document.getElementById("email").value.trim());
  fd.append("password", document.getElementById("password").value.trim());
  fd.append("birthdate", document.getElementById("birthdate").value.trim());
  fd.append("phone", document.getElementById("phone").value.trim());
  fd.append("major", document.getElementById("major").value.trim());
  fd.append("degree", document.getElementById("degree").value.trim());
  fd.append("gpa", document.getElementById("gpa").value.trim() || "");
  fd.append("subjects", JSON.stringify(subjectsSelected));
  fd.append("experience", document.getElementById("experience").value.trim());
  fd.append("motivation", document.getElementById("motivation").value.trim());
  fd.append("format", document.getElementById("format").value.trim());
  fd.append("availability", document.getElementById("availability").value.trim());
  fd.append("passportPhoto", passportFile);
  fd.append("certificate", certificateFile);

  try {
    const res = await fetch("http://localhost:3000/api/signup/tutor", {
      method: "POST",
      body: fd, // ⚠️ no Content-Type header; the browser sets it for multipart
    });

    const data = await res.json();

    if (res.ok) {
      document.getElementById("welcomeMessage").textContent =
        `🎉 Welcome ${document.getElementById("firstName").value.trim()}! Please verify your email to activate your tutor account.`;
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
  window.location.href = "/Homepage/home.html";
}

// ✅ Allow clicking outside modal to close
document.getElementById("successModal").addEventListener("click", (e) => {
  if (e.target === document.getElementById("successModal")) goToHome();
});  