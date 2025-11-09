(function () {
  const LOGOUT_ATTR = "data-tm-logout";
  const REDIRECT_ATTR = "data-logout-redirect";
  const SESSION_KEY = "tmUserSession";
  const DEFAULT_REDIRECT = "/Homepage/home.html";

  const safeRemove = (store, key) => {
    if (!store || typeof store.removeItem !== "function") return;
    try {
      store.removeItem(key);
    } catch (err) {
      console.warn("logout: unable to remove item", key, err);
    }
  };

  const clearOtpLimits = () => {
    try {
      if (!window.localStorage) return;
      const keys = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (typeof key === "string" && key.startsWith("otp_limit_")) {
          keys.push(key);
        }
      }
      keys.forEach((key) => safeRemove(localStorage, key));
    } catch (err) {
      console.warn("logout: unable to clear otp limits", err);
    }
  };

  const performLogout = (redirectTo) => {
    safeRemove(window.localStorage, SESSION_KEY);
    safeRemove(window.sessionStorage, SESSION_KEY);
    clearOtpLimits();

    const target = redirectTo || DEFAULT_REDIRECT;
    if (target) {
      window.location.assign(target);
    }
  };

  const attachHandler = (el) => {
    if (!el || typeof el.addEventListener !== "function") return;

    if (el.dataset.tmLogoutBound === "1") return;
    el.dataset.tmLogoutBound = "1";

    el.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const explicitTarget = el.getAttribute(REDIRECT_ATTR);
      const fallbackHref = typeof el.getAttribute === "function" ? el.getAttribute("href") : null;
      let target = explicitTarget || fallbackHref || DEFAULT_REDIRECT;
      if (typeof target === "string" && target.toLowerCase().includes("signin.html")) {
        target = DEFAULT_REDIRECT;
      }
      renderLogoutConfirm(target);
    });
  };

  const init = () => {
    try {
      const nodes = document.querySelectorAll(`[${LOGOUT_ATTR}]`);
      if (!nodes.length) return;
      nodes.forEach(attachHandler);
    } catch (err) {
      console.warn("logout: failed to initialize", err);
    }
  };

  // Professional modal confirm
  const renderLogoutConfirm = (target) => {
    if (document.getElementById("tm-logout-confirm")) return;

    const overlay = document.createElement("div");
    overlay.id = "tm-logout-confirm";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.background = "rgba(0,0,0,0.5)";
    overlay.style.backdropFilter = "blur(4px)";
    overlay.style.zIndex = "9999";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";

    const card = document.createElement("div");
    card.style.width = "100%";
    card.style.maxWidth = "420px";
    card.style.margin = "16px";
    card.style.borderRadius = "16px";
    card.style.border = "1px solid rgba(148,163,184,0.3)";
    card.style.background = "linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.95))";
    card.style.boxShadow = "0 20px 50px rgba(0,0,0,0.4)";
    card.style.color = "#e5e7eb";
    card.style.padding = "20px";
    card.style.transform = "scale(0.98)";
    card.style.opacity = "0";
    card.style.transition = "all .18s ease";

    const iconWrap = document.createElement("div");
    iconWrap.style.display = "flex";
    iconWrap.style.alignItems = "center";
    iconWrap.style.justifyContent = "center";
    iconWrap.style.marginBottom = "12px";
    const icon = document.createElement("i");
    icon.setAttribute("data-lucide", "log-out");
    icon.style.width = "36px";
    icon.style.height = "36px";
    icon.style.color = "#f87171"; // red-400
    iconWrap.appendChild(icon);

    const title = document.createElement("h3");
    title.textContent = "Log Out";
    title.style.fontSize = "20px";
    title.style.fontWeight = "800";
    title.style.textAlign = "center";
    title.style.margin = "0 0 6px 0";

    const desc = document.createElement("p");
    desc.textContent = "Are you sure you want to log out?";
    desc.style.textAlign = "center";
    desc.style.color = "#cbd5e1"; // slate-300
    desc.style.margin = "0 0 16px 0";

    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.gap = "10px";

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = "Cancel";
    cancel.style.flex = "1";
    cancel.style.padding = "10px 14px";
    cancel.style.borderRadius = "10px";
    cancel.style.background = "#475569"; // slate-600
    cancel.style.color = "#fff";
    cancel.style.fontWeight = "600";
    cancel.style.border = "1px solid rgba(148,163,184,0.35)";
    cancel.style.transition = "transform .12s ease, opacity .12s ease";

    const confirm = document.createElement("button");
    confirm.type = "button";
    confirm.innerHTML = '<span style="display:inline-flex;align-items:center;gap:8px;"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> Log Out</span>';
    confirm.style.flex = "1";
    confirm.style.padding = "10px 14px";
    confirm.style.borderRadius = "10px";
    confirm.style.background = "linear-gradient(135deg,#ef4444,#dc2626)"; // red
    confirm.style.color = "#fff";
    confirm.style.fontWeight = "700";
    confirm.style.border = "none";
    confirm.style.boxShadow = "0 6px 20px rgba(239,68,68,0.35)";
    confirm.style.transition = "transform .12s ease, opacity .12s ease";

    row.appendChild(cancel);
    row.appendChild(confirm);

    card.appendChild(iconWrap);
    card.appendChild(title);
    card.appendChild(desc);
    card.appendChild(row);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    try { if (typeof lucide !== "undefined" && lucide.createIcons) lucide.createIcons(); } catch (_) {}

    requestAnimationFrame(() => {
      card.style.transform = "scale(1)";
      card.style.opacity = "1";
    });

    const cleanup = () => {
      card.style.transform = "scale(0.98)";
      card.style.opacity = "0";
      setTimeout(() => overlay.remove(), 120);
    };

    cancel.addEventListener("click", cleanup);
    confirm.addEventListener("click", () => {
      cleanup();
      performLogout(target);
    });

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) cleanup();
    });

    const onKey = (e) => {
      if (e.key === "Escape") {
        cleanup();
      } else if (e.key === "Enter") {
        cleanup();
        performLogout(target);
      }
    };
    setTimeout(() => document.addEventListener("keydown", onKey, { once: true }), 0);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

