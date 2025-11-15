// tutorpage.js

document.addEventListener("DOMContentLoaded", async () => {
  lucide.createIcons(); // icons

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

  // Extra logout guard (won't run if data-tm-logout is present)
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

// ---------- LOAD PROFILE FROM BACKEND ----------

async function loadTutorProfile(tutorId) {
  const res = await fetch(
    `https://tutor-match-n8a7.onrender.com/api/tutors/profile/${tutorId}`
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to load tutor profile");
  }

  const t = data.tutor || {};

  // === Basic fields: name, email, hourly rate, subjects ===
  const inputs = document.querySelectorAll(".form-input.editable-field");
  // 0: full name, 1: email, 2: hourly rate, 3: subjects
  if (inputs.length >= 4) {
    const firstName = t.firstName || "";
    const lastName = t.lastName || "";
    inputs[0].value = `${firstName} ${lastName}`.trim() || "";
    inputs[1].value = t.email || "";

    // hourlyRate (numeric column)
    const rate =
      typeof t.hourlyRate === "number"
        ? t.hourlyRate
        : t.hourlyRate
        ? Number(t.hourlyRate)
        : "";
    inputs[2].value = Number.isNaN(rate) ? "" : rate;

    // subjects: handle array OR JSON string OR plain text
    const subjectsArray = normalizeSubjects(t.subjects);
    inputs[3].value = subjectsArray.join(", ");
  }

  // === Bio (motivation) ===
  const bio = document.querySelector("textarea.editable-field");
  if (bio) bio.value = t.motivation || "";

  // === Avatar initials ===
  const avatar = document.getElementById("profilePhotoPreview");
  if (avatar) {
    const initials =
      (t.firstName?.[0] || "?") + (t.lastName?.[0] || "");
    avatar.textContent = initials.toUpperCase();
  }

  // === Availability schedule ===
  const scheduleFromDb =
    t.availabilitySchedule || t.availabilitySched || t.availabilitySc || null;
  const schedule =
    scheduleFromDb && typeof scheduleFromDb === "object"
      ? scheduleFromDb
      : buildDefaultScheduleFromUI();

  renderAvailabilityGrid(schedule);
}

// Try to interpret whatever is stored in tutors.subjects
function normalizeSubjects(subjects) {
  if (Array.isArray(subjects)) {
    return subjects
      .map((s) => (typeof s === "string" ? s.trim() : ""))
      .filter(Boolean);
  }
  if (typeof subjects === "string") {
    // try JSON first
    try {
      const parsed = JSON.parse(subjects);
      if (Array.isArray(parsed)) {
        return parsed
          .map((s) => (typeof s === "string" ? s.trim() : ""))
          .filter(Boolean);
      }
    } catch {
      // not JSON, treat as "Math, Physics"
    }
    return subjects
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

// Build a default schedule object from whatever is currently in the HTML
function buildDefaultScheduleFromUI() {
  const schedule = {};
  document.querySelectorAll(".availability-day-slot").forEach((slot) => {
    const dayLabel = slot.querySelector(".day-label");
    if (!dayLabel) return;

    const key = dayLabel.textContent.trim().toLowerCase(); // "monday"
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

// Apply a schedule object to the availability grid
function renderAvailabilityGrid(schedule) {
  document.querySelectorAll(".availability-day-slot").forEach((slot) => {
    const dayLabel = slot.querySelector(".day-label");
    if (!dayLabel) return;

    const key = dayLabel.textContent.trim().toLowerCase();
    const cfg = schedule[key];
    const timeInputs = slot.querySelectorAll('input[type="time"]');
    const toggle = slot.querySelector('input[type="checkbox"]');

    if (!cfg) return; // leave defaults

    if (timeInputs[0]) timeInputs[0].value = cfg.from || "";
    if (timeInputs[1]) timeInputs[1].value = cfg.to || "";
    if (toggle) toggle.checked = !!cfg.enabled;
  });
}

// Collect schedule from UI into JSON we send to backend
function collectAvailabilitySchedule() {
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

// ---------- UI HELPERS (SIDEBAR / DARK MODE / TOASTS) ----------

function initUIHandlers() {
  // Sidebar toggle
  window.toggleSidebar = function () {
    const sidebar = document.querySelector(".sidebar");
    const overlay = document.querySelector(".sidebar-overlay");
    sidebar?.classList.toggle("open");
    overlay?.classList.toggle("active");
  };

  // Dark mode toggle
  window.toggleDarkMode = function (toggle) {
    document.body.classList.toggle("dark-mode");

    document.querySelectorAll(".dark-mode-toggle").forEach((t) => {
      t.classList.toggle("active");
      const icon = t.querySelector("i");
      if (icon) {
        icon.setAttribute(
          "data-lucide",
          t.classList.contains("active") ? "moon" : "sun"
        );
      }
    });

    lucide.createIcons();
    const isDark = document.body.classList.contains("dark-mode");
    showToast(
      isDark ? "Dark mode activated" : "Light mode activated",
      "info"
    );
    updateDarkModeText();
  };

  // Color text based on mode
  window.updateDarkModeText = function () {
    const isDark = document.body.classList.contains("dark-mode");
    document.querySelectorAll(".dark-mode-text").forEach((el) => {
      el.style.color = isDark ? "#cbd5e1" : "";
    });
  };

  // Toast helper
  window.showToast = function (message, type = "info") {
    const toast = document.createElement("div");
    const bgColor =
      type === "success"
        ? "bg-green-500"
        : type === "error"
        ? "bg-red-500"
        : "bg-blue-500";

    toast.className = `fixed top-6 right-6 ${bgColor} text-white px-6 py-4 rounded-2xl shadow-2xl z-50 transform transition-all duration-300`;
    toast.style.transform = "translateX(400px)";
    toast.innerHTML = `
      <div class="flex items-center gap-3">
        <i data-lucide="${
          type === "success"
            ? "check-circle"
            : type === "error"
            ? "alert-circle"
            : "info"
        }" class="w-5 h-5"></i>
        <span class="font-semibold">${message}</span>
      </div>
    `;

    document.body.appendChild(toast);
    lucide.createIcons();

    setTimeout(() => (toast.style.transform = "translateX(0)"), 100);
    setTimeout(() => {
      toast.style.transform = "translateX(400px)";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };
}

// ---------- EDIT / SAVE / PHOTO / SEARCH ----------

(function initEditModeHandlers() {
  const editBtn = document.getElementById("editBtn");
  const saveBtn = document.getElementById("saveBtn");
  const cancelBtn = document.getElementById("cancelBtn");

  window.editProfile = function () {
    setEditMode(true);
  };

  window.cancelEdit = function () {
    setEditMode(false);
    window.location.reload();
  };

  // ✅ REAL SAVE to backend
  window.saveProfile = async function () {
    try {
      const tutorId = localStorage.getItem("tutorId");
      if (!tutorId) {
        showToast("No tutor ID found, please log in again.", "error");
        return;
      }

      const inputs = document.querySelectorAll(".form-input.editable-field");
      const nameInput = inputs[0]; // not saved yet, mostly display
      const emailInput = inputs[1]; // read-only
      const rateInput = inputs[2];
      const subjectsInput = inputs[3];
      const bioTextarea = document.querySelector("textarea.editable-field");

      const hourlyRateRaw = rateInput?.value ?? "";
      const hourlyRate = hourlyRateRaw === "" ? null : Number(hourlyRateRaw);

      if (hourlyRate !== null && Number.isNaN(hourlyRate)) {
        showToast("Hourly rate must be a number.", "error");
        return;
      }

      const subjectsString = subjectsInput?.value || "";
      const subjects = subjectsString
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const availabilitySchedule = collectAvailabilitySchedule();
      const motivation = bioTextarea?.value || null;

      const payload = {
        userId: tutorId,
        hourlyRate,
        availabilitySchedule,
        motivation,
        experience: null, // you can wire this later if you add a field
        subjects,
        format: null, // same here
      };

      const res = await fetch(
        "https://tutor-match-n8a7.onrender.com/api/tutors/profile",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        console.error("Save profile error:", data);
        showToast(data.error || "Failed to update profile", "error");
        return;
      }

      showToast("Profile updated successfully", "success");
      setEditMode(false);
    } catch (e) {
      console.error("saveProfile exception:", e);
      showToast("Failed to save changes", "error");
    }
  };

  window.handlePhotoClick = function () {
    if (!document.body.classList.contains("editing")) {
      showToast("Enable edit mode to change photo", "info");
      return;
    }
    document.getElementById("photoInput")?.click();
  };

  window.handlePhotoUpload = function (evt) {
    const file = evt?.target?.files?.[0];
    if (!file) return;
    const preview = document.getElementById("profilePhotoPreview");
    if (!preview) return;
    const url = URL.createObjectURL(file);
    preview.style.backgroundImage = `url('${url}')`;
    preview.style.backgroundSize = "cover";
    preview.style.backgroundPosition = "center";
    preview.textContent = "";
    preview.dataset.photoObjectUrl = url;
  };

  window.removePhoto = function () {
    const preview = document.getElementById("profilePhotoPreview");
    if (!preview) return;
    if (preview.dataset.photoObjectUrl) {
      URL.revokeObjectURL(preview.dataset.photoObjectUrl);
      delete preview.dataset.photoObjectUrl;
    }
    preview.style.backgroundImage = "";
    const nameInput = document.querySelector(
      '.editable-field[type="text"]'
    );
    if (nameInput && nameInput.value) {
      const parts = nameInput.value.trim().split(/\s+/);
      const initials =
        (parts[0]?.[0] || "?") + (parts[1]?.[0] || "");
      preview.textContent = initials.toUpperCase();
    }
  };

  function setEditMode(isEditing) {
    document.body.classList.toggle("editing", isEditing);
    document.querySelectorAll(".editable-field").forEach((el) => {
      const tag = el.tagName.toLowerCase();
      const type = (el.getAttribute("type") || "").toLowerCase();

      if (tag === "input" || tag === "textarea") {
        if (type === "checkbox") {
          el.disabled = !isEditing;
        } else if (type === "email") {
          // email always read-only
          el.readOnly = true;
          el.classList.add("cursor-not-allowed");
        } else {
          el.readOnly = !isEditing;
        }
      }
    });

    togglePhotoControls(isEditing);

    if (editBtn) editBtn.style.display = isEditing ? "none" : "";
    if (saveBtn) saveBtn.style.display = isEditing ? "" : "none";
    if (cancelBtn) cancelBtn.style.display = isEditing ? "" : "none";
    lucide.createIcons();
  }

  function togglePhotoControls(isEditing) {
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
  }

  // Search stub to avoid reference error from oninput
  window.filterFeedback = function () {};

  // Wire up View All Feedback button to navigate to feedback page
  const viewBtn = Array.from(document.querySelectorAll("button")).find((b) =>
    /View All Feedback/i.test(b.textContent || "")
  );
  if (viewBtn) {
    viewBtn.addEventListener("click", () => {
      window.location.href = "feedback.html";
    });
  }

  // Implement search that filters by student name only
  window.filterFeedback = function () {
    const q = (
      document.getElementById("searchBar")?.value || ""
    )
      .trim()
      .toLowerCase();
    document.querySelectorAll(".feedback-card").forEach((card) => {
      const nameEl = card.querySelector("h4, .student-name");
      const name = (nameEl?.textContent || "")
        .trim()
        .toLowerCase();
      const show = !q || name.includes(q);
      card.style.display = show ? "" : "none";
    });
  };
})();
