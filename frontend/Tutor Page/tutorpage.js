// tutorpage.js

const DEFAULT_AVATAR_SRC = "/assets/default-avatar.svg";

document.addEventListener("DOMContentLoaded", async () => {
  lucide.createIcons();

  // >>> ENABLE PHOTO UPLOAD LISTENER <<<
  const photoInput = document.getElementById("photoInput");
  if (photoInput) {
    photoInput.addEventListener("change", handlePhotoUpload);
  }
  // >>> END <<<

  const tutorId = localStorage.getItem("tutorId");
  if (!tutorId) {
    alert("No tutor logged in. Redirecting...");
    window.location.href = "/Homepage/home.html";
    return;
  }

  try {
    await loadTutorProfile(tutorId);
  } catch (err) {
    console.error("Tutor page error:", err);
    alert("Could not load your profile. Please sign in again.");
    window.location.href = "/Homepage/home.html";
    return;
  }

  const logoutBtn = document.querySelector(".logout");
  if (logoutBtn && !logoutBtn.hasAttribute("data-tm-logout")) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("tutorId");
      localStorage.removeItem("tmUserSession");
      window.location.href = "/Homepage/home.html";
    });
  }

  initUIHandlers();
});


// ======================= LOAD PROFILE =======================

async function loadTutorProfile(tutorId) {
  const res = await fetch(
    `https://tutor-match-n8a7.onrender.com/api/tutors/profile/${tutorId}`
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to load tutor profile");

  const t = data.tutor || {};

  const inputs = Array.from(
    document.querySelectorAll(".form-input.editable-field")
  ).filter((el) => el.tagName === "INPUT");

  if (inputs.length >= 4) {
    const firstName = t.firstName || "";
    const lastName = t.lastName || "";

    inputs[0].value = `${firstName} ${lastName}`.trim();
    inputs[1].value = t.email || "";

    // HOURLY RATE
    const rate = Number(t.hourlyRate);
    inputs[2].value = Number.isFinite(rate) ? rate : "";

    // SUBJECTS
    const subjectsArray = normalizeSubjects(t.subjects);
    inputs[3].value = subjectsArray.join(", ");
  }

  const bio = document.querySelector("textarea.editable-field");
  if (bio) bio.value = t.motivation || "";

  const avatar = document.getElementById("profilePhotoPreview");
  if (avatar) {
    if (t.profilePhotoUrl) {
      avatar.style.backgroundImage = `url(${t.profilePhotoUrl})`;
      avatar.style.backgroundSize = "cover";
      avatar.style.backgroundPosition = "center";
      avatar.textContent = "";
    } else {
      const initials =
        (t.firstName?.[0] || "?") + (t.lastName?.[0] || "?");
      avatar.style.backgroundImage = "";
      avatar.textContent = initials.toUpperCase();
    }
  }

  // AVAILABILITY
  const schedule =
    (t.availabilitySchedule && typeof t.availabilitySchedule === "object")
      ? t.availabilitySchedule
      : buildDefaultScheduleFromUI();

  renderAvailabilityGrid(schedule);
}


// ======================= HELPERS =======================

function normalizeSubjects(subjects) {
  if (Array.isArray(subjects)) {
    return subjects.map((s) => (typeof s === "string" ? s.trim() : "")).filter(Boolean);
  }

  if (typeof subjects === "string") {
    try {
      const parsed = JSON.parse(subjects);
      if (Array.isArray(parsed)) {
        return parsed.map((s) => s.trim()).filter(Boolean);
      }
    } catch (e) {}
    return subjects.split(",").map((s) => s.trim()).filter(Boolean);
  }

  return [];
}

function buildDefaultScheduleFromUI() {
  const schedule = {};
  document.querySelectorAll(".availability-day-slot").forEach((slot) => {
    const dayLabel = slot.querySelector(".day-label");
    if (!dayLabel) return;
    const key = dayLabel.textContent.trim().toLowerCase();

    const timeInputs = slot.querySelectorAll('input[type="time"]');
    const toggle = slot.querySelector('input[type="checkbox"]');

    schedule[key] = {
      enabled: !!(toggle && toggle.checked),
      from: timeInputs[0]?.value || null,
      to: timeInputs[1]?.value || null,
    };
  });
  return schedule;
}

function renderAvailabilityGrid(schedule) {
  document.querySelectorAll(".availability-day-slot").forEach((slot) => {
    const dayLabel = slot.querySelector(".day-label");
    if (!dayLabel) return;

    const key = dayLabel.textContent.trim().toLowerCase();
    const cfg = schedule[key] || {};

    const timeInputs = slot.querySelectorAll('input[type="time"]');
    const toggle = slot.querySelector('input[type="checkbox"]');

    if (timeInputs[0]) timeInputs[0].value = cfg.from || "";
    if (timeInputs[1]) timeInputs[1].value = cfg.to || "";
    if (toggle) toggle.checked = !!cfg.enabled;
  });
}

function collectAvailabilitySchedule() {
  const schedule = {};
  document.querySelectorAll(".availability-day-slot").forEach((slot) => {
    const dayLabel = slot.querySelector(".day-label");
    const key = dayLabel.textContent.trim().toLowerCase();

    const timeInputs = slot.querySelectorAll('input[type="time"]');
    const toggle = slot.querySelector('input[type="checkbox"]');

    schedule[key] = {
      enabled: toggle.checked,
      from: timeInputs[0]?.value || null,
      to: timeInputs[1]?.value || null,
    };
  });
  return schedule;
}


// ======================= PHOTO FUNCTIONS =======================

window.handlePhotoClick = function () {
  if (!document.body.classList.contains("editing")) {
    showToast("Enable edit mode to change photo", "info");
    return;
  }
  document.getElementById("photoInput")?.click();
};

window.handlePhotoUpload = function (event) {
  const file = event.target.files[0];
  if (!file) return;

  const preview = document.getElementById("profilePhotoPreview");
  const url = URL.createObjectURL(file);

  preview.style.backgroundImage = `url(${url})`;
  preview.style.backgroundSize = "cover";
  preview.style.backgroundPosition = "center";
  preview.textContent = "";
};

window.removePhoto = function () {
  const preview = document.getElementById("profilePhotoPreview");
  preview.style.backgroundImage = "";
  removePhotoRequested = true;

  const photoInput = document.getElementById("photoInput");
  if (photoInput) {
    photoInput.value = "";
  }

  const nameInput = document.querySelector('.editable-field[type="text"]');
  if (nameInput) {
    const parts = nameInput.value.trim().split(/\s+/);
    const initials =
      (parts[0]?.[0] || "?") + (parts[1]?.[0] || "");
    preview.textContent = initials.toUpperCase();
  }
};


// ======================= UI & TOASTS =======================

function initUIHandlers() {
  window.toggleSidebar = function () {
    document.querySelector(".sidebar")?.classList.toggle("open");
    document.querySelector(".sidebar-overlay")?.classList.toggle("active");
  };

  window.toggleDarkMode = function () {
    document.body.classList.toggle("dark-mode");
  };

  window.showToast = function (message, type = "info") {
    const toast = document.createElement("div");
    const bg =
      type === "success" ? "bg-green-500"
      : type === "error" ? "bg-red-500"
      : "bg-blue-500";

    toast.className = `fixed top-6 right-6 ${bg} text-white px-6 py-4 rounded-2xl shadow-xl z-50`;
    toast.innerHTML = `
      <div class="flex items-center gap-3">
        <i data-lucide="info" class="w-5 h-5"></i>
        <span>${message}</span>
      </div>
    `;
    document.body.appendChild(toast);
    lucide.createIcons();

    setTimeout(() => toast.remove(), 2500);
  };
}


// ======================= EDIT / SAVE =======================

(function () {
  const editBtn = document.getElementById("editBtn");
  const saveBtn = document.getElementById("saveBtn");
  const cancelBtn = document.getElementById("cancelBtn");

  window.editProfile = function () {
    setEditMode(true);
  };

  window.cancelEdit = function () {
    window.location.reload();
  };

  window.saveProfile = async function () {
  try {
    const tutorId = localStorage.getItem("tutorId");
    if (!tutorId) return showToast("No tutor ID found.", "error");

    const inputs = Array.from(
      document.querySelectorAll(".form-input.editable-field")
    ).filter((el) => el.tagName === "INPUT");
    const rateInput = inputs[2];
    const subjectsInput = inputs[3];
    const bioTextarea = document.querySelector("textarea.editable-field");

    let hourlyRateRaw = (rateInput?.value || "").trim();
    hourlyRateRaw = hourlyRateRaw.replace(/[^0-9.]/g, "");
    const hourlyRate = hourlyRateRaw === "" ? null : Number(hourlyRateRaw);

    const subjects = (subjectsInput?.value || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const availabilitySchedule = collectAvailabilitySchedule();
    const motivation = bioTextarea?.value || null;

    // -------------------------
    // ⬇️ NEW: Build FormData
    // -------------------------
    const formData = new FormData();
    formData.append("userId", tutorId);
    if (hourlyRate !== null) {
  formData.append("hourlyRate", hourlyRate);
}


    formData.append("motivation", motivation);
    formData.append("availabilitySchedule", JSON.stringify(availabilitySchedule));
    formData.append("subjects", JSON.stringify(subjects));

    // ⬇️ Attach file if selected
     const photoInput = document.getElementById("photoInput");
     if (photoInput && photoInput.files.length > 0) {
     formData.append("profilePhoto", photoInput.files[0]);
}


    const res = await fetch(
      "https://tutor-match-n8a7.onrender.com/api/tutors/profile",
      {
        method: "PUT",
        body: formData,  // <-- NO HEADERS, browser sets automatically
      }
    );

    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || "Failed to update profile", "error");
      return;
    }

    showToast("Profile updated successfully", "success");
    await loadTutorProfile(tutorId);

    setEditMode(false);

  } catch (err) {
    console.error(err);
    showToast("Failed to save changes", "error");
  }
};


  function setEditMode(isEditing) {
  document.body.classList.toggle("editing", isEditing);

  document.querySelectorAll(".editable-field").forEach((el) => {
    const type = el.getAttribute("type");
    if (type === "email") {
      el.readOnly = true;
    } else if (type === "checkbox") {
      el.disabled = !isEditing;
    } else {
      el.readOnly = !isEditing;
    }
  });

  // ENABLE / DISABLE PHOTO BUTTON
  const uploadBtn = document.getElementById("photoUploadBtn");
  const removeBtn = document.getElementById("removePhotoBtn");

  if (uploadBtn) {
    uploadBtn.disabled = !isEditing;
    uploadBtn.classList.toggle("opacity-50", !isEditing);
    uploadBtn.classList.toggle("cursor-not-allowed", !isEditing);
  }

  if (removeBtn) {
    removeBtn.style.display = isEditing ? "" : "none";
  }

  document.getElementById("editBtn").style.display = isEditing ? "none" : "";
  document.getElementById("saveBtn").style.display = isEditing ? "" : "none";
  document.getElementById("cancelBtn").style.display = isEditing ? "" : "none";

  lucide.createIcons();
}

})();
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("viewAllFeedbackBtn");
  if (btn) {
    btn.onclick = () => {
      window.location.href = "feedback.html"; 
    };
  }
});
