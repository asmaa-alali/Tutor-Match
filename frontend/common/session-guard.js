(function () {
  const SESSION_KEY = "tmUserSession";
  const SIGNIN_HREF = "/Homepage/home.html";
  const SIGNIN_PATH = "/Homepage/home.html";

  const hasActiveSession = () => {
    try {
      const raw = window.localStorage ? localStorage.getItem(SESSION_KEY) : null;
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data || typeof data !== "object") return false;
      if (typeof data.userId === "string" && data.userId.trim()) return true;
      if (typeof data.email === "string" && data.email.trim()) return true;
      return false;
    } catch (err) {
      console.warn("session-guard: failed to validate session", err);
      return false;
    }
  };

  const redirectToSignIn = () => {
    if (window.location.pathname === SIGNIN_PATH) return;
    try {
      if (window.localStorage) localStorage.removeItem(SESSION_KEY);
    } catch (_) {
      /* swallow */
    }
    window.location.replace(SIGNIN_HREF);
  };

  const enforceSession = async () => {
    if (!hasActiveSession()) {
      redirectToSignIn();
      return;
    }
    // Best-effort: verify server-side block status
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      const sess = raw ? JSON.parse(raw) : null;
      const userId = sess && sess.userId;
      if (!userId) return;
      const res = await fetch(`/api/account/status?userId=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const body = await res.json();
        if (body && body.blocked) {
          try { localStorage.removeItem(SESSION_KEY); } catch (_) {}
          alert(body.reason || 'Your account has been blocked.');
          redirectToSignIn();
        }
      }
    } catch (_) { /* ignore: keep UX resilient */ }
  };

  enforceSession();

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) enforceSession();
  });

  window.addEventListener("focus", enforceSession);

  window.addEventListener("pageshow", (event) => {
    if (event.persisted) enforceSession();
  });

  window.addEventListener("storage", (event) => {
    if (!event) return;
    if (event.key !== SESSION_KEY) return;
    if (!event.newValue) enforceSession();
  });
})();

