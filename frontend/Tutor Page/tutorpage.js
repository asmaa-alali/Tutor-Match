document.addEventListener("DOMContentLoaded", async () => {
  lucide.createIcons(); // ✅ create icons once

  // ✅ Fetch tutor info
  const tutorId = localStorage.getItem("tutorId");
  if (!tutorId) {
    alert("No tutor logged in. Redirecting...");
    window.location.href = "/Signin/signin.html"; // fix path consistency
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
    window.location.href = "/Signin/signin.html";
  }

  // ✅ Logout
  const logoutBtn = document.querySelector(".logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("tutorId");
      localStorage.removeItem("tmUserSession");
      window.location.href = "/Signin/signin.html";
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
