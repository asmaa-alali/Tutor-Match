// Shared mobile menu toggle for pages outside Homepage
// Expects a button#mobile-menu-toggle with icons #icon-menu and #icon-close
// and a container #mobile-menu (initially hidden). If not present, this script
// will attempt to wire up the first navbar menu button it finds.

(function () {
  if (typeof window === 'undefined') return;
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  // Find or create toggle button references
  let toggle = document.getElementById('mobile-menu-toggle');
  if (!toggle) {
    toggle = navbar.querySelector('button i[data-lucide="menu"]')?.closest('button') || null;
    if (toggle) toggle.id = 'mobile-menu-toggle';
  }

  // If still no toggle, create a fixed fallback button (mobile only)
  if (!toggle) {
    const btn = document.createElement('button');
    btn.id = 'mobile-menu-toggle';
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'mobile-menu');
    btn.className = 'fixed top-4 right-4 z-[60] md:hidden glass dark:glass-dark p-3 rounded-2xl';
    const icon = document.createElement('i');
    icon.setAttribute('data-lucide', 'menu');
    icon.id = 'icon-menu';
    icon.className = 'w-6 h-6 text-white';
    const iconX = document.createElement('i');
    iconX.setAttribute('data-lucide', 'x');
    iconX.id = 'icon-close';
    iconX.className = 'w-6 h-6 text-white hidden';
    btn.appendChild(icon);
    btn.appendChild(iconX);
    document.body.appendChild(btn);
    toggle = btn;
    if (window.lucide?.createIcons) window.lucide.createIcons();
  }

  if (!toggle) return;

  let iconMenu = document.getElementById('icon-menu');
  let iconClose = document.getElementById('icon-close');
  if (!iconMenu || !iconClose) {
    // Ensure both icons exist for a better UX
    const menuIcon = toggle.querySelector('i[data-lucide="menu"]');
    if (menuIcon && !menuIcon.id) menuIcon.id = 'icon-menu';
    iconMenu = document.getElementById('icon-menu') || menuIcon;

    if (!document.getElementById('icon-close')) {
      const closeIcon = document.createElement('i');
      closeIcon.setAttribute('data-lucide', 'x');
      closeIcon.id = 'icon-close';
      closeIcon.className = (menuIcon?.className || 'w-6 h-6 text-white') + ' hidden';
      toggle.appendChild(closeIcon);
      iconClose = closeIcon;
      if (window.lucide?.createIcons) window.lucide.createIcons();
    } else {
      iconClose = document.getElementById('icon-close');
    }
  }

  let menu = document.getElementById('mobile-menu');
  if (!menu) {
    // Build a simple mobile menu that mirrors core links.
    // Compute base: if we’re already in Homepage, stay at './', else '../'
    const path = (window.location.pathname || '').toLowerCase();
    const base = path.includes('/homepage/') ? './' : '../';

    menu = document.createElement('div');
    menu.id = 'mobile-menu';
    menu.className = 'md:hidden hidden px-6 pb-6';
    menu.innerHTML = `
      <div class="glass dark:glass-dark rounded-2xl p-4 mt-3 space-y-2">
        <a href="${base}Homepage/home.html" class="block px-3 py-2 rounded-xl text-white hover:bg-white/10">Home</a>
        <a href="${base}FindTutor/find-tutor.html" class="block px-3 py-2 rounded-xl text-white hover:bg-white/10">Find Tutors</a>
        <a href="${base}Sign Up/tutorsignup.html" class="block px-3 py-2 rounded-xl text-white hover:bg-white/10">Become a Tutor</a>
        <a href="${base}About/about.html" class="block px-3 py-2 rounded-xl text-white hover:bg-white/10">About</a>
        <a href="${base}Contact/contact.html" class="block px-3 py-2 rounded-xl text-white hover:bg-white/10">Contact</a>
        <div class="flex gap-3 pt-2">
          <a href="${base}Sign in/signin.html" class="flex-1 text-center glass dark:glass-dark px-4 py-2 rounded-xl text-white">Log In</a>
          <a href="${base}Sign Up/sign-up.html" class="flex-1 text-center bg-gradient-to-r from-blue-500 to-blue-700 px-4 py-2 rounded-xl text-white">Sign Up</a>
        </div>
      </div>`;

    // Append right after the first container in navbar
    navbar.appendChild(menu);
  }

  function openMenu() {
    menu.classList.remove('hidden');
    toggle.setAttribute('aria-expanded', 'true');
    iconMenu?.classList.add('hidden');
    iconClose?.classList.remove('hidden');
  }

  function closeMenu() {
    menu.classList.add('hidden');
    toggle.setAttribute('aria-expanded', 'false');
    iconMenu?.classList.remove('hidden');
    iconClose?.classList.add('hidden');
  }

  toggle.addEventListener('click', () => {
    if (menu.classList.contains('hidden')) openMenu();
    else closeMenu();
  });

  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu));
})();
