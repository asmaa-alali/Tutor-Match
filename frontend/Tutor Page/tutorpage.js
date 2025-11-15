// tutorpage.js

document.addEventListener("DOMContentLoaded", async () => {
  lucide.createIcons();

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

  const inputs = document.querySelectorAll(".form-input.editable-field");

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
    const initials =
      (t.firstName?.[0] || "?") + (t.lastName?.[0] || "?");
    avatar.textContent = initials.toUpperCase();
  }

  // AVAILABILITY
  const schedule =
    (t.availabilitySchedule && typeof t.availabilitySchedule === "object")
      ? t.availabilitySchedule
      : buildDefaultScheduleFromUI();

  renderAvailabilityGrid(schedule);
}


// ======================= HELPERS =======================

// SUBJECT NORMALIZER
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
    } catch (e) { }

    return subjects
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return [];
}

// CREATE DEFAULT SCHEDULE IF DB EMPTY
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

// LOAD SCHEDULE INTO UI
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

// COLLECT UPDATED SCHEDULE
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


// ======================= UI & TOASTS =======================

function initUIHandlers() {
  window.toggleSidebar = function () {
    document.querySelector(".sidebar")?.classList.toggle("open");
    document.querySelector(".sidebar-overlay")?.classList.toggle("active");
  };

  window.toggleDarkMode = function (toggle) {
    document.body.classList.toggle("dark-mode");

    document.querySelectorAll(".dark-mode-toggle").forEach((t) => {
      t.classList.toggle("active");
      const icon = t.querySelector("i");
      icon.setAttribute(
        "data-lucide",
        t.classList.contains("active") ? "moon" : "sun"
      );
    });

    lucide.createIcons();
    showToast(document.body.classList.contains("dark-mode")
      ? "Dark mode activated"
      : "Light mode activated");
  };

  window.showToast = function (message, type = "info") {
    const toast = document.createElement("div");
    const bg =
      type === "success" ? "bg-green-500"
      : type === "error" ? "bg-red-500"
      : "bg-blue-500";

    toast.className = `fixed top-6 right-6 ${bg} text-white px-6 py-4 rounded-2xl shadow-xl z-50 transition-all`;
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


  // ---------- FIXED SAVE ----------
  window.saveProfile = async function () {
    try {
      const tutorId = localStorage.getItem("tutorId");
      if (!tutorId) return showToast("No tutor ID found.", "error");

      const inputs = document.querySelectorAll(".form-input.editable-field");
      const rateInput = inputs[2];
      const subjectsInput = inputs[3];
      const bioTextarea = document.querySelector("textarea.editable-field");

      // HOURLY RATE FIXED VALIDATION
      let hourlyRateRaw = (rateInput?.value || "").trim();
      hourlyRateRaw = hourlyRateRaw.replace(/[^0-9.]/g, "");

      const hourlyRate = hourlyRateRaw === "" ? null : Number(hourlyRateRaw);

      if (hourlyRate !== null && (!Number.isFinite(hourlyRate) || hourlyRate <= 0)) {
        showToast("Hourly rate must be a valid positive number.", "error");
        return;
      }

      const subjects = (subjectsInput?.value || "")
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
        subjects,
        experience: null,
        format: null,
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
        console.error(data);
        showToast(data.error || "Failed to update profile", "error");
        return;
      }

      showToast("Profile updated successfully", "success");
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

    document.getElementById("editBtn").style.display = isEditing ? "none" : "";
    document.getElementById("saveBtn").style.display = isEditing ? "" : "none";
    document.getElementById("cancelBtn").style.display = isEditing ? "" : "none";

    lucide.createIcons();
  }
})();
