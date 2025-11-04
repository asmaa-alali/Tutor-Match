(function () {
  const LOGOUT_ATTR = "data-tm-logout";
  const REDIRECT_ATTR = "data-logout-redirect";
  const SESSION_KEY = "tmUserSession";
  const DEFAULT_REDIRECT = "/Sign in/signin.html";

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
      performLogout(explicitTarget || fallbackHref || DEFAULT_REDIRECT);
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

