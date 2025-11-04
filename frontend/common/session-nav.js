(function () {
  const escapeHtml = (value) => {
    if (typeof value !== "string") return "";
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  const SESSION_KEY = "tmUserSession";
  let sessionRaw = null;

  try {
    sessionRaw = localStorage.getItem(SESSION_KEY);
  } catch (err) {
    console.warn("session-nav: unable to access localStorage", err);
    return;
  }

  if (!sessionRaw) return;

  let session;
  try {
    session = JSON.parse(sessionRaw);
  } catch (err) {
    console.warn("session-nav: invalid session payload", err);
    return;
  }

  const role =
    typeof session.role === "string" ? session.role.toLowerCase() : null;

  if (!session || (role && role !== "student")) {
    return;
  }

  const profileRole =
    session.profile && typeof session.profile.role === "string"
      ? session.profile.role.toLowerCase()
      : null;
  if (session.role === undefined && profileRole && profileRole !== "student") {
    return;
  }

  const dashboardUrl = "/Student%20Page/StudentDashboard.html";
  const profileUrl = "/Student%20Page/MyProfile.html";
  const studentFindUrl = "/Student%20Page/findtutor.html";

  const navBrand = document.getElementById("about-brand-link");
  if (navBrand) {
    navBrand.setAttribute("href", dashboardUrl);
  }

  const desktopNav = document.getElementById("desktop-nav-links");
  if (desktopNav) {
    const adjustLink = (selector, href) => {
      const link = desktopNav.querySelector(selector);
      if (link) link.setAttribute("href", href);
    };

    adjustLink('a[href="/Homepage/home.html"]', dashboardUrl);
    adjustLink('a[href="/FindTutor/find-tutor.html"]', studentFindUrl);
  }

  const authLinks = document.getElementById("auth-links");
  if (authLinks) {
    const firstName =
      session.profile && typeof session.profile.firstName === "string"
        ? session.profile.firstName.trim()
        : "";

    const safeName = escapeHtml(firstName || "Student");

    authLinks.innerHTML = `
      <a href="${dashboardUrl}"
         class="magnetic text-white hover:text-blue-300 font-medium px-4 py-2 rounded-xl glass transition-all duration-300 hover:scale-105 flex items-center">
        <i data-lucide="layout-dashboard" class="w-4 h-4 inline mr-2"></i>
        Dashboard
      </a>
      <a href="${profileUrl}"
         class="magnetic bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white font-semibold px-6 py-2 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl flex items-center">
        <i data-lucide="user" class="w-4 h-4 inline mr-2"></i>
        ${safeName}
      </a>
    `;
  }

  if (typeof lucide !== "undefined" && lucide.createIcons) {
    lucide.createIcons();
  }
})();
