/* AdminPage.js — fixed */

lucide.createIcons();

const ADMIN_EMAIL = "admintm01@proton.me";

/* -------------------- session helpers -------------------- */
function getAdminEmailForRequests() {
  const sessionData = localStorage.getItem("tmUserSession");
  if (!sessionData) return "";
  try {
    const session = JSON.parse(sessionData);
    if (!session || typeof session !== "object") return "";
    let email = typeof session.email === "string" ? session.email.trim() : "";
    const role =
      typeof session.role === "string" ? session.role.trim().toLowerCase() : "";

    if (role === "admin" && email !== ADMIN_EMAIL) {
      email = ADMIN_EMAIL;
      session.email = ADMIN_EMAIL;
      try {
        localStorage.setItem("tmUserSession", JSON.stringify(session));
      } catch (storageErr) {
        console.warn("Failed to persist admin email:", storageErr);
      }
    }
    return email;
  } catch (err) {
    console.warn("Unable to parse admin session:", err);
    return "";
  }
}

function requireAdminEmail() {
  const email = getAdminEmailForRequests();
  if (!email) {
    alert("Admin session expired. Please sign in again.");
    window.location.href = "/Sign in/signin.html";
    return null;
  }
  return email;
}

/* One helper to build headers for all admin routes */
function adminHeaders(extra = {}) {
  const email = requireAdminEmail();
  if (!email) return null;
  return { "Content-Type": "application/json", "x-user-email": email, ...extra };
}

/* -------------------- UI-only guard (kept minimal) -------------------- */
(function enforceAdminSession() {
  const sessionData = localStorage.getItem("tmUserSession");
  if (!sessionData) {
    alert("Access denied. Please log in as admin.");
    window.location.href = "/Sign in/signin.html";
    return;
  }
  try {
    const session = JSON.parse(sessionData);
    let userEmail = typeof session.email === "string" ? session.email.trim() : "";
    const userRole = (session.role || "").toString();
    const normalizedRole = userRole.toLowerCase();

    if (!userEmail && normalizedRole === "admin") {
      userEmail = ADMIN_EMAIL;
      session.email = ADMIN_EMAIL;
      try {
        localStorage.setItem("tmUserSession", JSON.stringify(session));
      } catch (storageErr) {
        console.warn("Failed to persist admin email:", storageErr);
      }
    }

    if (userEmail !== ADMIN_EMAIL && normalizedRole !== "admin") {
      alert("Access denied. Admin privileges required.");
      window.location.href = "/Sign in/signin.html";
      return;
    }
    console.log("Admin access granted:", userEmail || ADMIN_EMAIL);
  } catch (err) {
    console.error("Session validation failed:", err);
    localStorage.removeItem("tmUserSession");
    window.location.href = "/Sign in/signin.html";
  }
})();

/* -------------------- state -------------------- */
let users = [];
let tutorRequests = [];
let filteredRequests = [];

const posts = [
  { id: 1, user: "johndoe", content: "Just had an amazing day at the beach! 🏖️", type: "text", status: "active", date: "2024-03-01", reports: 0 },
  { id: 2, user: "janedoe", content: "Check out this sunset photo I took!", type: "image", status: "active", date: "2024-03-02", reports: 0 },
  { id: 3, user: "mikebrown", content: "This is inappropriate content that should be removed", type: "text", status: "reported", date: "2024-03-03", reports: 3 },
  { id: 4, user: "sarahwilson", content: "My cooking tutorial video", type: "video", status: "active", date: "2024-03-04", reports: 0 },
  { id: 5, user: "tomjones", content: "Spam content with links", type: "text", status: "removed", date: "2024-03-05", reports: 5 },
];

let activityLogs = [];
let currentSection = "dashboard";
let filteredUsers = [...users];
let filteredPosts = [...posts];

/* -------------------- theme -------------------- */
function toggleTheme() {
  document.body.classList.toggle("dark");
  const isDark = document.body.classList.contains("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  updateThemeIcon(isDark);
}

function updateThemeIcon(isDark) {
  const icon = document.getElementById("themeIcon");
  if (icon) {
    icon.setAttribute("data-lucide", isDark ? "moon" : "sun");
    lucide.createIcons();
  }
}

const savedTheme = localStorage.getItem("theme");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const isDark = savedTheme === "dark" || (!savedTheme && prefersDark);
if (isDark) document.body.classList.add("dark");

document.addEventListener("DOMContentLoaded", () => {
  updateThemeIcon(isDark);
  fetchUsers();
  fetchTutorRequests();
  fetchDashboardStats();
  try {
    const saved = JSON.parse(localStorage.getItem("tmAdminActivity") || "[]");
    if (Array.isArray(saved)) activityLogs = saved;
  } catch {}
  loadRecentActions();
});

/* -------------------- dashboard -------------------- */
async function fetchDashboardStats() {
  try {
    const headers = adminHeaders();
    if (!headers) return;
    const res = await fetch("/api/admin/stats", { method: "GET", headers });
    if (!res.ok) throw new Error((await res.json()).error || "Failed to load stats");
    const body = await res.json();
    const { totalUsers = 0, blockedUsers = 0, totalPosts = 0, removedPosts = 0 } = body || {};
    const setText = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(val);
    };
    setText("totalUsersCount", totalUsers);
    setText("blockedUsersCount", blockedUsers);
    setText("totalPostsCount", totalPosts);
    setText("removedPostsCount", removedPosts);
  } catch (err) {
    console.error("fetchDashboardStats error:", err);
  }
}

/* -------------------- users -------------------- */
async function fetchUsers() {
  try {
    const headers = adminHeaders();
    if (!headers) return;

    const res = await fetch("/api/admin/users", {
      method: "GET",
      headers,
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      throw new Error(errorBody.error || "Failed to fetch users");
    }

    const body = await res.json();
    const remote = body.users || [];

    users = remote.map((u) => {
      const meta = u.raw?.user_metadata || u.user_metadata || {};
      const isBlocked = !!(meta.blocked === true) || !!u.banned_until;
      const status = isBlocked
        ? "blocked"
        : (u.raw?.email_confirmed_at || u.email_confirmed_at ? "active" : "unverified");
      return {
        id: u.id,
        username: u.username || (u.email ? u.email.split("@")[0] : "user"),
        email: u.email || "",
        status,
        role: u.role || meta.role || "user",
        joined: u.created_at ? new Date(u.created_at).toLocaleDateString() : "",
        avatar: (u.email && u.email.charAt(0).toUpperCase()) || "U",
        raw: u,
      };
    });

    filteredUsers = [...users];
    loadUsers();
  } catch (err) {
    console.error("fetchUsers error:", err);
    showNotification("Unable to load users from server: " + err.message, "error");
    filteredUsers = [...users];
    loadUsers();
  }
}

function loadUsers() {
  const tbody = document.getElementById("usersTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  filteredUsers.forEach((user) => {
    const row = document.createElement("tr");
    row.className = "table-row";
    const encodedEmail = encodeURIComponent(user.email);
    row.innerHTML = `
      <td class="py-3 px-4">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <span class="text-white text-sm font-semibold">${user.avatar}</span>
          </div>
          <span class="font-medium text-gray-900 dark:text-white">${user.username}</span>
        </div>
      </td>
      <td class="py-3 px-4 text-gray-600 dark:text-gray-300">${user.email}</td>
      <td class="py-3 px-4">
        <span class="status-badge status-${user.status}">${user.status}</span>
      </td>
      <td class="py-3 px-4 text-gray-600 dark:text-gray-300">${user.role}</td>
      <td class="py-3 px-4 text-gray-600 dark:text-gray-300">${user.joined}</td>
      <td class="py-3 px-4">
        <div class="flex gap-2">
          ${
            user.status === "blocked"
              ? `<button class="btn-success text-xs" onclick="unblockUser('${encodedEmail}')">Unblock</button>`
              : `<button class="btn-danger text-xs" onclick="blockUser('${encodedEmail}')">Block</button>`
          }
          <button class="btn-secondary text-xs" onclick="viewUser('${encodedEmail}')">View</button>
          <button class="btn-danger text-xs" onclick="deleteUser('${encodedEmail}')" style="background-color:#dc2626;">Delete</button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function filterUsers() {
  const search = (document.getElementById("userSearch")?.value || "").toLowerCase();
  const statusFilter = document.getElementById("userStatusFilter")?.value || "";
  const roleFilter = document.getElementById("userRoleFilter")?.value || "";

  filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.username.toLowerCase().includes(search) ||
      user.email.toLowerCase().includes(search);
    const matchesStatus = !statusFilter || user.status === statusFilter;
    const matchesRole = !roleFilter || user.role === roleFilter;
    return matchesSearch && matchesStatus && matchesRole;
  });

  loadUsers();
}

function resetUserFilters() {
  if (document.getElementById("userSearch")) document.getElementById("userSearch").value = "";
  if (document.getElementById("userStatusFilter")) document.getElementById("userStatusFilter").value = "";
  if (document.getElementById("userRoleFilter")) document.getElementById("userRoleFilter").value = "";
  filteredUsers = [...users];
  loadUsers();
}

/* -------------------- block / unblock / delete -------------------- */
async function blockUser(userEmail) {
  userEmail = decodeURIComponent(userEmail);
  const user = users.find((u) => u.email === userEmail);
  if (!user) return showNotification("User not found", "error");

  showPromptModal(
    `Provide a reason for blocking "${user.email}" (optional).`,
    "Reason for block...",
    async (reason) => {
      try {
        const headers = adminHeaders();
        if (!headers) return;
        const res = await fetch("/api/admin/block-user", {
          method: "POST",
          headers,
          body: JSON.stringify({ userEmail: user.email, reason }),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          return showNotification(e.error || "Failed to block user", "error");
        }
        user.status = "blocked";
        try {
          user.raw = user.raw || {};
          const meta = (user.raw.user_metadata = user.raw.user_metadata || {});
          meta.blocked = true;
          if (reason) meta.blocked_reason = reason;
          meta.blocked_at = new Date().toISOString();
        } catch {}
        logActivity("User Blocked", `Blocked user ${user.email} for violating community guidelines`);
        loadUsers();
        fetchDashboardStats();
        showNotification(`User ${user.email} has been blocked`, "success");
      } catch (err) {
        console.error("blockUser error:", err);
        showNotification("Server error, could not block user", "error");
      }
    }
  );
}

async function unblockUser(userEmail) {
  userEmail = decodeURIComponent(userEmail);
  const user = users.find((u) => u.email === userEmail);
  if (!user) return showNotification("User not found", "error");

  showConfirmModal(
    `Are you sure you want to unblock user "${user.email}"? They will regain access to the website.`,
    async () => {
      try {
        const headers = adminHeaders();
        if (!headers) return;
        const res = await fetch("/api/admin/unblock-user", {
          method: "POST",
          headers,
          body: JSON.stringify({ userEmail: user.email }),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          return showNotification(e.error || "Failed to unblock user", "error");
        }
        user.status = "active";
        try {
          if (user.raw && user.raw.user_metadata) {
            delete user.raw.user_metadata.blocked;
            delete user.raw.user_metadata.blocked_reason;
            delete user.raw.user_metadata.blocked_at;
          }
        } catch {}
        logActivity("User Unblocked", `Unblocked user ${user.email} after review`);
        loadUsers();
        fetchDashboardStats();
        showNotification(`User ${user.email} has been unblocked`, "success");
      } catch (err) {
        console.error("unblockUser error:", err);
        showNotification("Server error, could not unblock user", "error");
      }
    }
  );
}

function deleteUser(userEmail) {
  userEmail = decodeURIComponent(userEmail);
  const user = users.find((u) => u.email === userEmail);
  if (!user) return showNotification("User not found", "error");

  showConfirmModal(
    `Are you sure you want to permanently delete user "${user.email}"? This action cannot be undone.`,
    async () => {
      try {
        const headers = adminHeaders();
        if (!headers) return;
        const res = await fetch("/api/admin/delete-user", {
          method: "DELETE",
          headers,
          body: JSON.stringify({ userEmail: user.email }),
        });
        if (!res.ok) {
          const error = await res.json().catch(() => ({}));
          return showNotification(error.error || "Failed to delete user", "error");
        }
        const index = users.findIndex((u) => u.email === user.email);
        if (index > -1) users.splice(index, 1);
        filteredUsers = [...users];
        logActivity("User Deleted", `Deleted user ${user.email} permanently`);
        loadUsers();
        showNotification(`User ${user.email} has been deleted`, "success");
      } catch (err) {
        console.error("Delete user error:", err);
        showNotification("Server error, could not delete user", "error");
      }
    }
  );
}

/* -------------------- tutor requests -------------------- */
async function fetchTutorRequests() {
  try {
    const headers = adminHeaders();
    if (!headers) return;
    const res = await fetch("/api/admin/tutor-requests", {
      method: "GET",
      headers,
    });
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      throw new Error(errorBody.error || "Failed to fetch tutor requests");
    }
    const body = await res.json();
    tutorRequests = Array.isArray(body.requests) ? body.requests : [];
    filteredRequests = [...tutorRequests];
    loadTutorRequests();
  } catch (err) {
    console.error("fetchTutorRequests error:", err);
    showNotification("Unable to load tutor requests: " + err.message, "error");
    filteredRequests = [];
    loadTutorRequests();
  }
}

function refreshRequests() {
  fetchTutorRequests();
}

function filterRequests() {
  const search = (document.getElementById("requestSearch")?.value || "").toLowerCase();
  filteredRequests = tutorRequests.filter((r) => {
    const name = `${r.firstName || ""} ${r.lastName || ""}`.trim().toLowerCase();
    const email = (r.email || "").toLowerCase();
    return !search || name.includes(search) || email.includes(search);
  });
  loadTutorRequests();
}

function loadTutorRequests() {
  const tbody = document.getElementById("requestsTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  filteredRequests.forEach((r) => {
    const row = document.createElement("tr");
    row.className = "table-row";
    const name = [r.firstName, r.lastName].filter(Boolean).join(" ") || "—";
    const submitted = r.submittedAt ? new Date(r.submittedAt).toLocaleString() : "—";
    row.innerHTML = `
      <td class="py-3 px-4 text-gray-900 dark:text-white">${name}</td>
      <td class="py-3 px-4 text-gray-600 dark:text-gray-300">${r.email || ""}</td>
      <td class="py-3 px-4 text-gray-600 dark:text-gray-300">${submitted}</td>
      <td class="py-3 px-4">
        <div class="flex gap-2">
          <button class="btn-secondary text-xs" onclick="viewTutorRequest('${r.id}')">View</button>
          <button class="btn-success text-xs" onclick="acceptTutorRequest('${r.id}')">Accept</button>
          <button class="btn-danger text-xs" onclick="rejectTutorRequest('${r.id}')">Reject</button>
        </div>
      </td>`;
    tbody.appendChild(row);
  });
}

function findRequestById(id) {
  return tutorRequests.find((r) => r && r.id === id) || null;
}

function viewTutorRequest(id) {
  const req = findRequestById(id);
  if (!req) return showNotification("Request not found", "error");
  const profile = req.profile || {};

  const lines = [];
  lines.push(`<div class="grid grid-cols-1 md:grid-cols-2 gap-4">`);
  lines.push(`<div><div class="text-sm text-gray-400">Name</div><div class="font-semibold">${[req.firstName, req.lastName].filter(Boolean).join(" ") || "—"}</div></div>`);
  lines.push(`<div><div class="text-sm text-gray-400">Email</div><div class="font-semibold">${req.email || "—"}</div></div>`);
  lines.push(`<div><div class="text-sm text-gray-400">Major</div><div class="font-semibold">${profile.major || "—"}</div></div>`);
  lines.push(`<div><div class="text-sm text-gray-400">Degree</div><div class="font-semibold">${profile.degree || "—"}</div></div>`);
  lines.push(`<div><div class="text-sm text-gray-400">GPA</div><div class="font-semibold">${profile.gpa ?? "—"}</div></div>`);
  lines.push(`<div><div class="text-sm text-gray-400">Subjects</div><div class="font-semibold">${Array.isArray(profile.subjects) ? profile.subjects.join(", ") : (profile.subjects || "—")}</div></div>`);
  lines.push(`<div><div class="text-sm text-gray-400">Experience</div><div class="font-semibold">${profile.experience || "—"}</div></div>`);
  lines.push(`<div><div class="text-sm text-gray-400">Motivation</div><div class="font-semibold">${profile.motivation || "—"}</div></div>`);
  lines.push(`<div><div class="text-sm text-gray-400">Format</div><div class="font-semibold">${profile.format || "—"}</div></div>`);
  lines.push(`<div><div class="text-sm text-gray-400">Availability</div><div class="font-semibold">${profile.availability || "—"}</div></div>`);
  lines.push(`</div>`);

  const hasPassport = typeof profile.passportPhoto === "string" && profile.passportPhoto.trim();
  const hasCertificate = typeof profile.certificate === "string" && profile.certificate.trim();
  if (hasPassport || hasCertificate) {
    lines.push(`<div class="mt-4">`);
    lines.push(`<div class="text-sm text-gray-400 mb-2">Documents</div>`);
    lines.push(`<div class="grid grid-cols-1 md:grid-cols-2 gap-4">`);
    if (hasPassport) {
      const url = profile.passportPhoto;
      lines.push(`
        <div class="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 cursor-zoom-in" onclick="previewDoc('${url.replace(/"/g, "&quot;")}', 'Passport Photo')">
          <img src="${url}" alt="Passport Photo" style="width:100%;max-height:240px;object-fit:cover;display:block;"/>
          <div class="px-3 py-2 text-sm text-gray-600 dark:text-gray-300">Passport Photo (click to view)</div>
        </div>`);
    }
    if (hasCertificate) {
      const url = profile.certificate;
      const isImage = /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(url);
      if (isImage) {
        lines.push(`
          <div class="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 cursor-zoom-in" onclick="previewDoc('${url.replace(/"/g, "&quot;")}', 'Certificate / CV')">
            <img src="${url}" alt="Certificate/CV" style="width:100%;max-height:240px;object-fit:cover;display:block;"/>
            <div class="px-3 py-2 text-sm text-gray-600 dark:text-gray-300">Certificate / CV (click to view)</div>
          </div>`);
      } else {
        lines.push(`
          <a href="${url}" target="_blank" rel="noopener" class="rounded-lg border border-gray-200 dark:border-gray-700 p-4 block hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            <div class="flex items-center gap-3">
              <i data-lucide="file-text" class="w-5 h-5 text-blue-500"></i>
              <div>
                <div class="font-semibold">Open Certificate / CV</div>
                <div class="text-xs text-gray-500">Opens in a new tab</div>
              </div>
            </div>
          </a>`);
      }
    }
    lines.push(`</div>`);
    lines.push(`</div>`);
  }

  const body = document.getElementById("requestDetailsBody");
  if (body) body.innerHTML = lines.join("");
  const modal = document.getElementById("requestDetailsModal");
  if (modal) modal.classList.add("show");
}

function hideRequestDetails() {
  const modal = document.getElementById("requestDetailsModal");
  if (modal) modal.classList.remove("show");
}

async function acceptTutorRequest(id) {
  const req = findRequestById(id);
  if (!req) return showNotification("Request not found", "error");
  try {
    const headers = adminHeaders();
    if (!headers) return;
    const res = await fetch("/api/admin/tutor-requests/accept", {
      method: "POST",
      headers,
      body: JSON.stringify({ userId: id }),
    });
    if (!res.ok) throw new Error((await res.json()).error || "Approve failed");
    showNotification("Tutor approved", "success");
    tutorRequests = tutorRequests.filter((r) => r.id !== id);
    filterRequests();
  } catch (err) {
    console.error("acceptTutorRequest:", err);
    showNotification("Failed to approve: " + err.message, "error");
  }
}

async function rejectTutorRequest(id) {
  const req = findRequestById(id);
  if (!req) return showNotification("Request not found", "error");
  showConfirmModal(
    `Reject tutor application for "${req.email}"? This will delete their account.`,
    async () => {
      try {
        const headers = adminHeaders();
        if (!headers) return;
        const res = await fetch("/api/admin/tutor-requests/reject", {
          method: "POST",
          headers,
          body: JSON.stringify({ userId: id }),
        });
        if (!res.ok) throw new Error((await res.json()).error || "Reject failed");
        showNotification("Tutor rejected and removed", "success");
        tutorRequests = tutorRequests.filter((r) => r.id !== id);
        filterRequests();
      } catch (err) {
        console.error("rejectTutorRequest:", err);
        showNotification("Failed to reject: " + err.message, "error");
      }
    }
  );
}

/* -------------------- preview lightbox -------------------- */
function buildDocLightbox() {
  if (document.getElementById("tm-doc-lightbox")) return;
  const overlay = document.createElement("div");
  overlay.id = "tm-doc-lightbox";
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background = "rgba(0,0,0,0.7)";
  overlay.style.backdropFilter = "blur(2px)";
  overlay.style.display = "none";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.zIndex = "10000";

  const frame = document.createElement("div");
  frame.style.position = "relative";
  frame.style.maxWidth = "90vw";
  frame.style.maxHeight = "85vh";
  frame.style.borderRadius = "12px";
  frame.style.overflow = "hidden";
  frame.style.boxShadow = "0 20px 50px rgba(0,0,0,0.5)";
  frame.style.background = "#111827";

  const img = document.createElement("img");
  img.id = "tm-doc-image";
  img.style.display = "block";
  img.style.maxWidth = "90vw";
  img.style.maxHeight = "85vh";
  img.style.objectFit = "contain";

  const close = document.createElement("button");
  close.textContent = "Exit";
  close.style.position = "absolute";
  close.style.top = "8px";
  close.style.right = "8px";
  close.style.background = "rgba(31,41,55,0.85)";
  close.style.color = "#fff";
  close.style.border = "1px solid rgba(255,255,255,0.2)";
  close.style.borderRadius = "8px";
  close.style.padding = "8px 12px";
  close.style.fontWeight = "700";
  close.style.cursor = "pointer";

  close.addEventListener("click", () => (overlay.style.display = "none"));
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.style.display = "none";
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") overlay.style.display = "none";
  });

  frame.appendChild(img);
  frame.appendChild(close);
  overlay.appendChild(frame);
  document.body.appendChild(overlay);
}

function previewDoc(url) {
  buildDocLightbox();
  const overlay = document.getElementById("tm-doc-lightbox");
  const img = document.getElementById("tm-doc-image");
  if (img) img.src = url;
  overlay.style.display = "flex";
}

/* -------------------- posts demo (unchanged UI) -------------------- */
function loadPosts() {
  const grid = document.getElementById("postsGrid");
  if (!grid) return;
  grid.innerHTML = "";

  filteredPosts.forEach((post) => {
    const card = document.createElement("div");
    card.className = "card p-4";
    card.innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
            <span class="text-white text-xs font-semibold">${post.user.charAt(0).toUpperCase()}</span>
          </div>
          <span class="text-sm font-medium text-gray-900 dark:text-white">@${post.user}</span>
        </div>
        <span class="status-badge status-${post.status}">${post.status}</span>
      </div>

      <div class="mb-3">
        <p class="text-gray-700 dark:text-gray-300 text-sm">${post.content}</p>
        <div class="flex items-center gap-2 mt-2">
          <span class="text-xs text-gray-500">Type: ${post.type}</span>
          <span class="text-xs text-gray-500">•</span>
          <span class="text-xs text-gray-500">${post.date}</span>
          ${post.reports > 0 ? `<span class="text-xs text-red-500">• ${post.reports} reports</span>` : ""}
        </div>
      </div>

      <div class="flex gap-2">
        ${
          post.status !== "removed"
            ? `<button class="btn-danger text-xs" onclick="removePost(${post.id})">Remove</button>`
            : `<button class="btn-success text-xs" onclick="restorePost(${post.id})">Restore</button>`
        }
        <button class="btn-secondary text-xs" onclick="viewPost(${post.id})">View Full</button>
      </div>
    `;
    grid.appendChild(card);
  });
}

function filterPosts() {
  const search = (document.getElementById("postSearch")?.value || "").toLowerCase();
  const typeFilter = document.getElementById("postTypeFilter")?.value || "";
  const statusFilter = document.getElementById("postStatusFilter")?.value || "";

  filteredPosts = posts.filter((post) => {
    const matchesSearch =
      post.content.toLowerCase().includes(search) || post.user.toLowerCase().includes(search);
    const matchesType = !typeFilter || post.type === typeFilter;
    const matchesStatus = !statusFilter || post.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  loadPosts();
}

function resetPostFilters() {
  if (document.getElementById("postSearch")) document.getElementById("postSearch").value = "";
  if (document.getElementById("postTypeFilter")) document.getElementById("postTypeFilter").value = "";
  if (document.getElementById("postStatusFilter")) document.getElementById("postStatusFilter").value = "";
  filteredPosts = [...posts];
  loadPosts();
}

function removePost(postId) {
  const post = posts.find((p) => p.id === postId);
  showConfirmModal(
    `Are you sure you want to remove this post by @${post.user}? This action cannot be undone.`,
    () => {
      post.status = "removed";
      logActivity("Post Removed", `Removed inappropriate post by @${post.user}`);
      loadPosts();
      showNotification("Post has been removed", "success");
    }
  );
}

function restorePost(postId) {
  const post = posts.find((p) => p.id === postId);
  showConfirmModal(`Are you sure you want to restore this post by @${post.user}?`, () => {
    post.status = "active";
    logActivity("Post Restored", `Restored post by @${post.user} after review`);
    loadPosts();
    showNotification("Post has been restored", "success");
  });
}

function viewPost(postId) {
  const post = posts.find((p) => p.id === postId);
  showNotification(`Viewing full post by @${post.user}`, "success");
}

/* -------------------- activity log -------------------- */
function loadActivityLog() {
  const container = document.getElementById("activityLog");
  if (!container) return;
  container.innerHTML = "";

  activityLogs.forEach((log) => {
    const iconClass = log.type === "user" ? "users" : log.type === "post" ? "file-text" : "settings";
    const iconColor = log.type === "user" ? "blue" : log.type === "post" ? "green" : "gray";

    const entry = document.createElement("div");
    entry.className = "flex items-start gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg";

    entry.innerHTML = `
      <div class="w-10 h-10 bg-${iconColor}-100 dark:bg-${iconColor}-900/20 rounded-full flex items-center justify-center">
        <i data-lucide="${iconClass}" class="w-5 h-5 text-${iconColor}-600 dark:text-${iconColor}-400"></i>
      </div>
      <div class="flex-1">
        <div class="flex items-center justify-between mb-1">
          <h4 class="font-semibold text-gray-900 dark:text-white">${log.action}</h4>
          <span class="text-xs text-gray-500">${log.timestamp}</span>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-300 mb-1">${log.details}</p>
        <p class="text-xs text-gray-500">by ${log.admin}</p>
      </div>
    `;
    container.appendChild(entry);
  });

  lucide.createIcons();
}

function logActivity(action, details) {
  const sessionData = localStorage.getItem("tmUserSession");
  const session = sessionData ? JSON.parse(sessionData) : {};
  const adminEmail = session.email || "Admin User";

  const newLog = {
    id: activityLogs.length + 1,
    action,
    details,
    admin: adminEmail,
    timestamp: new Date().toLocaleString(),
    type: action.toLowerCase().includes("user") ? "user" : "post",
  };

  activityLogs.unshift(newLog);
  activityLogs = activityLogs.slice(0, 50);
  try {
    localStorage.setItem("tmAdminActivity", JSON.stringify(activityLogs));
  } catch {}
  loadRecentActions();
  if (currentSection === "activity") loadActivityLog();
}

function formatRelativeTime(ts) {
  const d = new Date(ts);
  const diff = Date.now() - (isNaN(d.getTime()) ? Date.now() : d.getTime());
  const s = Math.max(0, Math.floor(diff / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const dys = Math.floor(h / 24);
  return `${dys} day${dys === 1 ? "" : "s"} ago`;
}

function loadRecentActions() {
  const container = document.getElementById("recentActions");
  if (!container) return;
  container.innerHTML = "";

  if (!activityLogs.length) {
    const empty = document.createElement("div");
    empty.className = "text-sm text-gray-500";
    empty.textContent = "No recent actions";
    container.appendChild(empty);
    return;
  }

  const items = activityLogs.slice(0, 5);
  items.forEach((log) => {
    const li = document.createElement("div");
    li.className = "flex items-center gap-3";

    let icon = "settings";
    let color = "gray";
    const a = (log.action || "").toLowerCase();
    if (a.includes("blocked user")) {
      icon = "user-x";
      color = "red";
    } else if (a.includes("unblocked user")) {
      icon = "user-check";
      color = "green";
    } else if (a.includes("post removed") || a.includes("removed post")) {
      icon = "trash-2";
      color = "yellow";
    }

    const details = String(log.details || "");
    const emailMatch = details.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
    const handleMatch = details.match(/@([a-zA-Z0-9_]+)/);
    const subject = emailMatch ? emailMatch[0] : handleMatch ? `@${handleMatch[1]}` : "";
    const title = subject ? `${log.action} (${subject})` : `${log.action}`;
    const by = log.admin ? `by ${log.admin}` : "";

    li.innerHTML = `
      <div class="w-8 h-8 bg-${color}-100 dark:bg-${color}-900/20 rounded-full flex items-center justify-center">
        <i data-lucide="${icon}" class="w-4 h-4 text-${color}-600"></i>
      </div>
      <div class="flex-1">
        <p class="text-sm font-medium text-gray-900 dark:text-white">${title}</p>
        <p class="text-xs text-gray-500">${by ? by + " • " : ""}${formatRelativeTime(log.timestamp)}</p>
      </div>`;
    container.appendChild(li);
  });

  try {
    lucide.createIcons();
  } catch {}
}

/* -------------------- modals & notifications -------------------- */
function showConfirmModal(message, onConfirm) {
  const msg = document.getElementById("confirmMessage");
  const btn = document.getElementById("confirmButton");
  const modal = document.getElementById("confirmModal");
  if (!msg || !btn || !modal) return;
  msg.textContent = message;
  btn.onclick = () => {
    onConfirm();
    closeModal();
  };
  modal.classList.add("show");
}

function closeModal() {
  const modal = document.getElementById("confirmModal");
  if (modal) modal.classList.remove("show");
}

function showPromptModal(message, placeholder, onConfirm) {
  const modal = document.getElementById("promptModal");
  const msg = document.getElementById("promptMessage");
  const input = document.getElementById("promptInput");
  const btn = document.getElementById("promptButton");
  if (!modal || !msg || !input || !btn) return;
  msg.textContent = message || "Provide details";
  input.value = "";
  input.placeholder = placeholder || "";
  btn.onclick = () => {
    const v = input.value || "";
    onConfirm(v);
    closePromptModal();
  };
  modal.classList.add("show");
}

function closePromptModal() {
  const modal = document.getElementById("promptModal");
  if (modal) modal.classList.remove("show");
}

function showNotification(message, type = "success") {
  const notification = document.getElementById("notification");
  const text = document.getElementById("notificationText");
  if (!notification || !text) {
    alert(message);
    return;
  }
  text.textContent = message;
  notification.className = `notification ${type}`;
  notification.classList.add("show");
  setTimeout(() => {
    notification.classList.remove("show");
  }, 3000);
}

/* -------------------- layout helpers -------------------- */
function showSection(section) {
  document.querySelectorAll(".section").forEach((s) => (s.style.display = "none"));
  const el = document.getElementById(section);
  if (el) el.style.display = "block";

  document.querySelectorAll(".sidebar-item").forEach((item) => item.classList.remove("active"));
  if (typeof event !== "undefined" && event?.target?.classList) {
    event.target.classList.add("active");
  }
  currentSection = section;
  const sidebar = document.getElementById("sidebar");
  if (sidebar) sidebar.classList.remove("open");
}

function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  if (sidebar) sidebar.classList.toggle("open");
}

/* -------------------- auth -------------------- */
function adminLogout() {
  if (confirm("Are you sure you want to logout?")) {
    try {
      localStorage.removeItem("tmUserSession");
    } catch {}
    showNotification("Logged out successfully", "success");
    setTimeout(() => {
      window.location.href = "/Homepage/home.html";
    }, 600);
  }
}
window.adminLogout = adminLogout;

/* -------------------- light cloudflare snippet (unchanged) -------------------- */
(function () {
  function c() {
    var b = a.contentDocument || a.contentWindow.document;
    if (b) {
      var d = b.createElement("script");
      d.innerHTML =
        "window.__CF$cv$params={r:'989f04147421e30e',t:'MTc1OTY4OTI5Ni4wMDAwMDA='};var a=document.createElement('script');a.nonce='';a.src='/cdn-cgi/challenge-platform/scripts/jsd/main.js';document.getElementsByTagName('head')[0].appendChild(a);";
      b.getElementsByTagName("head")[0].appendChild(d);
    }
  }
  if (document.body) {
    var a = document.createElement("iframe");
    a.height = 1;
    a.width = 1;
    a.style.position = "absolute";
    a.style.top = 0;
    a.style.left = 0;
    a.style.border = "none";
    a.style.visibility = "hidden";
    document.body.appendChild(a);
    if ("loading" !== document.readyState) c();
    else if (window.addEventListener) document.addEventListener("DOMContentLoaded", c);
    else {
      var e = document.onreadystatechange || function () {};
      document.onreadystatechange = function (b) {
        e(b);
        "loading" !== document.readyState && ((document.onreadystatechange = e), c());
      };
    }
  }
})();
