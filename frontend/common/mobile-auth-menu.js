(function () {
  const SESSION_KEY = "tmUserSession";

  const hasActiveSession = () => {
    try {
      if (typeof window === "undefined" || !window.localStorage) return false;
      const raw = window.localStorage.getItem(SESSION_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object";
    } catch (err) {
      console.warn("mobile-auth-menu: unable to read session", err);
      return false;
    }
  };

  const hideWrapper = (wrapper, menu) => {
    if (wrapper) wrapper.classList.add("hidden");
    if (menu) menu.classList.add("hidden");
  };

  const shouldHideOnAuth = (sessionExists, wrapper) => {
    if (!sessionExists || !wrapper) return false;
    return wrapper.hasAttribute("data-mobile-auth-hide-when-authenticated");
  };

  const initToggle = (toggle, menu, sessionExists) => {
    if (!toggle || !menu) return;

    const wrapper =
      toggle.closest("[data-mobile-auth-wrapper]") || toggle.parentElement;

    if (shouldHideOnAuth(sessionExists, wrapper)) {
      hideWrapper(wrapper, menu);
      return;
    }

    if (wrapper) wrapper.classList.remove("hidden");

    const closeMenu = () => menu.classList.add("hidden");

    toggle.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      menu.classList.toggle("hidden");
    });

    document.addEventListener("click", (event) => {
      if (menu.classList.contains("hidden")) return;
      if (menu.contains(event.target) || toggle.contains(event.target)) return;
      closeMenu();
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth >= 768) closeMenu();
    });

    menu
      .querySelectorAll("a")
      .forEach((link) => link.addEventListener("click", closeMenu));
  };

  const init = () => {
    if (typeof document === "undefined") return;
    const toggles = document.querySelectorAll("[data-mobile-auth-toggle]");
    if (!toggles.length) return;

    const sessionExists = hasActiveSession();

    toggles.forEach((toggle) => {
      const targetId = toggle.getAttribute("data-mobile-auth-toggle");
      if (!targetId) return;
      const menu = document.getElementById(targetId);
      if (!menu) return;
      initToggle(toggle, menu, sessionExists);
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
