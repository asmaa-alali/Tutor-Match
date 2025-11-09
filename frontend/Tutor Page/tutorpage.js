document.addEventListener("DOMContentLoaded", async () => {
  lucide.createIcons(); // ✅ create icons once

  // ✅ Fetch tutor info
  const tutorId = localStorage.getItem("tutorId");
  if (!tutorId) {
    alert("No tutor logged in. Redirecting...");
    window.location.href = "/Homepage/home.html"; // redirect to homepage
    return;
  }

  try {
    const res = await fetch(`http://localhost:3000/api/tutors/profile/${tutorId}`);
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Failed to load tutor profile");

    const t = data.tutor;

    // ✅ Fill fields
    const fields = document.querySelectorAll(".editable-field");
    if (fields.length >= 4) {
      fields[0].value = `${t.firstName || ""} ${t.lastName || ""}`;
      fields[1].value = t.email || "";
      fields[2].value = t.rate || "";
      fields[3].value = Array.isArray(t.subjects) ? t.subjects.join(", ") : t.subjects || "";
    }

    const bio = document.querySelector("textarea");
    if (bio) bio.value = t.motivation || "";

    // ✅ Show initials
    const avatar = document.getElementById("profilePhotoPreview");
    if (avatar) {
      const initials =
        (t.firstName?.[0] || "?") + (t.lastName?.[0] || "");
      avatar.textContent = initials.toUpperCase();
    }
  } catch (err) {
    console.error("Tutor page error:", err);
    alert("Could not load your profile. Please sign in again.");
    window.location.href = "/Homepage/home.html";
  }

  // ✅ Logout
  const logoutBtn = document.querySelector(".logout");
  if (logoutBtn && !logoutBtn.hasAttribute("data-tm-logout")) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("tutorId");
      localStorage.removeItem("tmUserSession");
      window.location.href = "/Homepage/home.html";
    });
  }

  // ✅ Dark mode, sidebar, etc.
  initUIHandlers();
});

function initUIHandlers() {
  // Sidebar toggle
  window.toggleSidebar = function () {
    const sidebar = document.querySelector(".sidebar");
    const overlay = document.querySelector(".sidebar-overlay");
    sidebar.classList.toggle("open");
    overlay.classList.toggle("active");
  };

  // Dark mode toggle
  window.toggleDarkMode = function (toggle) {
    document.body.classList.toggle("dark-mode");

    document.querySelectorAll(".dark-mode-toggle").forEach((t) => {
      t.classList.toggle("active");
      const icon = t.querySelector("i");
      if (t.classList.contains("active")) {
        icon.setAttribute("data-lucide", "moon");
      } else {
        icon.setAttribute("data-lucide", "sun");
      }
    });

    lucide.createIcons();
    const isDark = document.body.classList.contains("dark-mode");
    showToast(isDark ? "Dark mode activated" : "Light mode activated", "info");
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

// Initialize and expose edit/cancel/save + photo handlers used by the HTML
(function initEditModeHandlers() {
  const editBtn = document.getElementById("editBtn");
  const saveBtn = document.getElementById("saveBtn");
  const cancelBtn = document.getElementById("cancelBtn");

  window.editProfile = function () {
    setEditMode(true);
  };

  window.cancelEdit = function () {
    setEditMode(false);
    // Reload to restore original values from server
    window.location.reload();
  };

  window.saveProfile = async function () {
    try {
      const tutorId = localStorage.getItem("tutorId");
      const values = collectFormValues();
      // No tutor update API yet; keep locally so UI feels responsive
      sessionStorage.setItem("tutorDraftProfile:" + tutorId, JSON.stringify(values));
      showToast("Changes saved (local only)", "success");
      setEditMode(false);
    } catch (e) {
      console.error(e);
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
    const nameInput = document.querySelector('.editable-field[type="text"]');
    if (nameInput && nameInput.value) {
      const parts = nameInput.value.trim().split(/\s+/);
      const initials = (parts[0]?.[0] || "?") + (parts[1]?.[0] || "");
      preview.textContent = initials.toUpperCase();
    }
  };

  // Search stub to avoid reference error from oninput
  window.filterFeedback = function () {};

  function setEditMode(isEditing) {
    document.body.classList.toggle("editing", isEditing);
    document.querySelectorAll(".editable-field").forEach((el) => {
      const tag = el.tagName.toLowerCase();
      const type = (el.getAttribute("type") || "").toLowerCase();
      if (tag === "input" || tag === "textarea") {
        if (type === "checkbox") {
          el.disabled = !isEditing;
        } else if (type === "email") {
          // Keep email uneditable always
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

  function collectFormValues() {
    const values = {};
    const fields = document.querySelectorAll(".editable-field");
    fields.forEach((el, idx) => {
      const tag = el.tagName.toLowerCase();
      const type = (el.getAttribute("type") || "").toLowerCase();
      const key = el.name || `field_${idx}`;
      if (tag === "input" || tag === "textarea") {
        if (type === "email") return; // ignore email in save payload
        values[key] = type === "checkbox" ? !!el.checked : el.value;
      }
    });
    return values;
  }
  // Wire up View All Feedback button to navigate to feedback page
  const viewBtn = Array.from(document.querySelectorAll("button"))
    .find((b) => /View All Feedback/i.test(b.textContent || ""));
  if (viewBtn) {
    viewBtn.addEventListener("click", () => {
      window.location.href = "feedback.html";
    });
  }

  // Implement search that filters by student name only
  window.filterFeedback = function () {
    const q = (document.getElementById("searchBar")?.value || "").trim().toLowerCase();
    document.querySelectorAll(".feedback-card").forEach((card) => {
      const nameEl = card.querySelector("h4, .student-name");
      const name = (nameEl?.textContent || "").trim().toLowerCase();
      const show = !q || name.includes(q);
      card.style.display = show ? "" : "none";
    });
  };
})();




