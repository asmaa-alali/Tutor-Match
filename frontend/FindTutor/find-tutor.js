/* find-tutor.js */
console.log("✅ findtutor.js loaded!");

(() => {
  'use strict';

  // ------- Helpers -------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ------- Icons -------
  function refreshIcons() {
    try { window.lucide && window.lucide.createIcons(); } catch (_) {}
  }

  // ------- Theme Toggle -------
  function setupThemeToggle() {
    const themeToggle = $('#theme-toggle');
    const htmlEl = document.documentElement;
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') htmlEl.classList.add('dark');

    // Ensure correct initial icon
    setTimeout(() => {
      const sunIcon = themeToggle?.querySelector('[data-lucide="sun"]');
      const moonIcon = themeToggle?.querySelector('[data-lucide="moon"]');
      if (!sunIcon || !moonIcon) return;
      if (htmlEl.classList.contains('dark')) { sunIcon.classList.add('hidden'); moonIcon.classList.remove('hidden'); }
      else { sunIcon.classList.remove('hidden'); moonIcon.classList.add('hidden'); }
    }, 50);

    themeToggle?.addEventListener('click', () => {
      const sunIcon = themeToggle.querySelector('[data-lucide="sun"]');
      const moonIcon = themeToggle.querySelector('[data-lucide="moon"]');
      document.body.classList.add('theme-transition');

      const isDark = htmlEl.classList.contains('dark');
      if (isDark) {
        htmlEl.classList.remove('dark');
        localStorage.setItem('theme', 'light');
        sunIcon?.classList.remove('hidden');
        moonIcon?.classList.add('hidden');
      } else {
        htmlEl.classList.add('dark');
        localStorage.setItem('theme', 'dark');
        sunIcon?.classList.add('hidden');
        moonIcon?.classList.remove('hidden');
      }

      setTimeout(() => {
        refreshIcons();
        document.body.classList.remove('theme-transition');
      }, 300);
    });
  }

  // ------- Navbar glass on scroll -------
  function setupNavbarGlass() {
    const navbar = $('#navbar');
    if (!navbar) return;
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        navbar.classList.add('glass', 'dark:glass-dark', 'shadow-2xl');
        navbar.style.background = 'rgba(255,255,255,.1)';
      } else {
        navbar.classList.remove('glass', 'dark:glass-dark', 'shadow-2xl');
        navbar.style.background = 'transparent';
      }
    });
  }

  // ------- Magnetic hover -------
  function setupMagnetic() {
    $$('.magnetic').forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${x * 0.1}px, ${y * 0.1}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = 'translate(0,0)'; });
    });
  }

  // ------- Particles -------
  function setupParticles() {
    const c = $('#particles');
    if (!c) return;
    const n = 50;
    for (let i = 0; i < n; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.left = Math.random() * 100 + '%';
      p.style.top = Math.random() * 100 + '%';
      p.style.animationDelay = Math.random() * 6 + 's';
      p.style.animationDuration = (Math.random() * 3 + 3) + 's';
      c.appendChild(p);
    }
  }

  // ------- Tutors (fetch & render) -------
  const tutorsGrid = $('#tutors-grid');
  const loadingEl = $('#loading-tutors');

  function subjectKeyFromUI(val) {
    const map = {
      'computer-science': ['cmps', 'computer', 'cs', 'programming', 'algorithms'],
      'mathematics': ['math', 'calculus', 'algebra', 'probability'],
      'physics': ['phys', 'physics'],
      'chemistry': ['chem', 'chemistry'],
      'statistics': ['stat', 'statistics'],
      'economics': ['econ', 'economics'],
      'business': ['bus', 'business', 'management'],
      'engineering': ['engr', 'engineering']
    };
    return map[val] || null;
  }

  function renderTutorCard(t) {
    const name = [t.firstName || '', t.lastName || ''].join(' ').trim() || 'Tutor';
    const avatar = t.avatarUrl || t.passportPhoto || 'https://placehold.co/96x96';
    const subs = Array.isArray(t.subjects) ? t.subjects : (t.subjects ? [t.subjects] : []);
    const subjectsHtml = subs.map(s =>
      `<span class="subject-tag" data-subject="${String(s).toLowerCase()}">${String(s)}</span>`
    ).join('');
    const rating = (typeof t.rating === 'number' ? t.rating : 4.9).toFixed(1);
    const reviews = t.reviews ? `${t.reviews} reviews` : 'New';
    const rate = t.rate ? Number(t.rate) : 35;
    const fmt = t.format || 'online/in-person';

    return `
      <div class="tutor-card p-6" data-name="${name.toLowerCase()}" data-rate="${rate}" data-rating="${rating}" data-format="${String(fmt).toLowerCase()}">
        <div class="flex items-center gap-4 mb-4">
          <img src="${avatar}" alt="${name}" class="w-16 h-16 rounded-full object-cover"/>
          <div>
            <h3 class="text-xl font-semibold text-white">${name}</h3>
            <div class="star-rating text-sm">★ ${rating} <span class="text-white/60">(${reviews})</span></div>
          </div>
        </div>
        <div class="mb-4 flex flex-wrap gap-2">${subjectsHtml || '<span class="text-white/60 text-sm">No subjects listed</span>'}</div>
        <div class="flex items-center justify-between">
          <div class="text-green-400 font-bold">$${rate}/hour</div>
          <div class="flex items-center gap-2">
            <button class="btn-premium px-6 py-2" data-action="view" data-id="${t.id || ''}">
              <i data-lucide="user" class="w-4 h-4 inline mr-2"></i> View Profile
            </button>
            <button class="glass dark:glass-dark px-4 py-2 rounded-xl text-white" data-action="message" data-id="${t.id || ''}">
              <i data-lucide="message-circle" class="w-4 h-4 inline"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  async function fetchTutors({ subject = '', search = '' } = {}) {
    const params = new URLSearchParams();
    if (subject) params.set('subject', subject);
    if (search) params.set('search', search);
    const url = params.toString() ? `/api/tutors?${params.toString()}` : '/api/tutors';

    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch tutors');
    const payload = await res.json();
    return Array.isArray(payload?.tutors) ? payload.tutors : [];
  }

  function injectTutors(tutors) {
    if (!tutorsGrid) return;
    tutorsGrid.innerHTML = tutors.map(renderTutorCard).join('') || `
      <div class="glass dark:glass-dark rounded-2xl p-6 text-white/80">No tutors found yet.</div>
    `;
    refreshIcons();
  }

  async function loadAndRender(initialFilters = {}) {
    if (!loadingEl || !tutorsGrid) return;
    loadingEl.classList.remove('hidden');
    tutorsGrid.classList.add('hidden');
    try {
      const tutors = await fetchTutors(initialFilters);
      injectTutors(tutors);
    } catch (e) {
      console.error(e);
      loadingEl.innerHTML = `<p class="text-red-200">Failed to load tutors.</p>`;
    } finally {
      loadingEl.classList.add('hidden');
      tutorsGrid.classList.remove('hidden');
      const count = applyCurrentFiltersClientSide();
      showSearchResults(currentFilterState(), count);
    }
  }

  // ------- Filters -------
  const heroSearch = $('#hero-search');
  const heroSearchBtn = $('#hero-search-btn');
  const subjectFilter = $('#subject-filter');
  const priceFilter = $('#price-filter');
  const ratingFilter = $('#rating-filter');
  const availabilityFilter = $('#availability-filter');
  const formatButtons = $$('.filter-btn');

  function currentFilterState() {
    const activeFormatBtn = $('.filter-btn.active');
    return {
      search: (heroSearch?.value || '').trim().toLowerCase(),
      subject: (subjectFilter?.value || '').trim(),
      price: priceFilter?.value || '',
      rating: ratingFilter?.value || '',
      availability: availabilityFilter?.value || '',
      format: activeFormatBtn ? activeFormatBtn.dataset.format : 'all'
    };
  }

  function subjectTextsIn(card) {
    return $$('.subject-tag', card).map(s => s.textContent.toLowerCase());
  }

  function applyCurrentFiltersClientSide() {
    const state = currentFilterState();
    const cards = $$('#tutors-grid .tutor-card');
    let visible = 0;

    cards.forEach((card) => {
      let show = true;
      const name = card.dataset.name || '';
      const rate = Number(card.dataset.rate || '0');
      const rating = Number(card.dataset.rating || '0');
      const format = (card.dataset.format || 'both').toLowerCase();
      const subs = subjectTextsIn(card);

      // search
      if (state.search) {
        const inName = name.includes(state.search);
        const inSub = subs.some(s => s.includes(state.search));
        if (!inName && !inSub) show = false;
      }

      // subject
      if (state.subject) {
        const keys = subjectKeyFromUI(state.subject) || [state.subject];
        const has = keys.some(k => subs.some(s => s.includes(k)));
        if (!has) show = false;
      }

      // price
      if (state.price) {
        const [min, max] = state.price.split('-').map(v => parseInt(v, 10));
        if (Number.isFinite(min) && rate < min) show = false;
        if (Number.isFinite(max) && rate > max) show = false;
      }

      // rating
      if (state.rating) {
        const minR = parseFloat(state.rating);
        if (rating < minR) show = false;
      }

      // availability — no-op placeholder (not in dataset yet)

      // format — assume many tutors do both; don't over-filter unless explicit
      if (state.format && state.format !== 'all') {
        const want = state.format;
        if (!format.includes(want) && !(want === 'both' && (format.includes('online') && format.includes('in-person')))) {
          // keep as-is to avoid hiding most cards
        }
      }

      if (show) {
        card.style.display = 'block';
        card.dataset.hidden = '0';
        visible++;
      } else {
        card.style.display = 'none';
        card.dataset.hidden = '1';
      }
    });

    return visible;
  }

  function showSearchResults(filters, visibleCount) {
    let box = $('#search-results');
    if (!box) {
      box = document.createElement('div');
      box.id = 'search-results';
      box.className = 'text-center text-white/80 mb-8 glass dark:glass-dark rounded-2xl p-6';
      tutorsGrid?.parentNode?.insertBefore(box, tutorsGrid);
    }

    const summary = [];
    if (filters.search) summary.push(`"${filters.search}"`);
    if (filters.subject) summary.push(filters.subject.replace('-', ' '));
    if (filters.price) summary.push(`$${filters.price}/hour`);
    if (filters.rating) summary.push(`${filters.rating}+ stars`);
    if (filters.availability) summary.push(filters.availability);
    const hasFilters = summary.length > 0;
    const tail = hasFilters ? ` for ${summary.join(', ')}` : '';

    box.innerHTML = `
      <div class="flex items-center justify-center space-x-4">
        <i data-lucide="search" class="w-6 h-6 text-blue-400"></i>
        <div>
          <p class="text-xl font-semibold text-white">Found ${visibleCount} tutor${visibleCount !== 1 ? 's' : ''}${tail}</p>
          ${hasFilters ? `<button id="clear-filters" class="text-blue-400 hover:text-blue-300 text-sm mt-2 underline">Clear all filters</button>` : ''}
        </div>
      </div>
      ${visibleCount === 0 ? `
        <div class="mt-6 p-4 bg-yellow-500/20 rounded-xl">
          <p class="text-yellow-200 mb-3">
            <i data-lucide="info" class="w-5 h-5 inline mr-2"></i>
            No tutors match your current filters
          </p>
          <div class="text-sm text-yellow-100/80">
            Try adjusting your search criteria or
            <button id="clear-filters-2" class="text-yellow-200 underline hover:text-yellow-100">clear all filters</button>
          </div>
        </div>
      ` : '' }
    `;
    refreshIcons();

    const cf = $('#clear-filters');
    const cf2 = $('#clear-filters-2');
    [cf, cf2].forEach(btn => btn && btn.addEventListener('click', clearAllFilters));
  }

  function clearAllFilters() {
    if (heroSearch) heroSearch.value = '';
    if (subjectFilter) subjectFilter.value = '';
    if (priceFilter) priceFilter.value = '';
    if (ratingFilter) ratingFilter.value = '';
    if (availabilityFilter) availabilityFilter.value = '';
    $$('.filter-btn').forEach(b => { b.classList.remove('active'); if (b.dataset.format === 'all') b.classList.add('active'); });
    const visible = applyCurrentFiltersClientSide();
    showSearchResults(currentFilterState(), visible);
  }

  // ------- Card buttons / CTA -------
  function setupCardAndCtaHandlers() {
    tutorsGrid?.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (action === 'view') {
        window.open(`/api/tutors/${encodeURIComponent(id)}`, '_blank');
      } else if (action === 'message') {
        const card = btn.closest('.tutor-card');
        const name = card?.querySelector('h3')?.textContent || 'Tutor';
        alert(`💬 Opening chat with ${name}...\n\n(Stub) Implement chat UI later.`);
      }
    });

    $('#cta-find')?.addEventListener('click', () => tutorsGrid?.scrollIntoView({ behavior: 'smooth' }));
    $('#cta-demo')?.addEventListener('click', () => alert('🎥 Demo coming soon'));

    // Hover lift on all buttons
    document.addEventListener('mouseover', (e) => {
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      b.style.transform = 'translateY(-3px) scale(1.05)';
    });
    document.addEventListener('mouseout', (e) => {
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      b.style.transform = 'translateY(0) scale(1)';
    });
  }

  // ------- Scroll animation observer -------
  function setupScrollObserver() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.animationPlayState = 'running';
          entry.target.classList.add('animate-in');
        }
      });
    }, { threshold: .1, rootMargin: '0px 0px -50px 0px' });

    $$('.float-up, .slide-reveal, .scale-bounce, .flying-card').forEach((el) => observer.observe(el));
  }

  // ------- Events wiring (server-assisted for subject/search; client-only for others) -------
  function setupFilterEvents() {
    heroSearch?.addEventListener('input', async (e) => {
      const s = (e.target.value || '').trim();
      await loadAndRender({ search: s });
    });

    heroSearchBtn?.addEventListener('click', async () => {
      const s = (heroSearch?.value || '').trim();
      await loadAndRender({ search: s });
    });

    subjectFilter?.addEventListener('change', async () => {
      const val = subjectFilter.value;
      const firstToken = (subjectKeyFromUI(val) || [val])[0] || '';
      await loadAndRender({ subject: firstToken, search: (heroSearch?.value || '').trim() });
    });

    [priceFilter, ratingFilter, availabilityFilter].forEach((f) => {
      f?.addEventListener('change', () => {
        const visible = applyCurrentFiltersClientSide();
        showSearchResults(currentFilterState(), visible);
      });
    });

    $$('.filter-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        $$('.filter-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const visible = applyCurrentFiltersClientSide();
        showSearchResults(currentFilterState(), visible);
      });
    });
  }

  // ------- Init -------
  window.addEventListener('DOMContentLoaded', async () => {
    refreshIcons();
    setupThemeToggle();
    setupNavbarGlass();
    setupMagnetic();
    setupParticles();
    setupFilterEvents();
    setupCardAndCtaHandlers();
    setupScrollObserver();
    await loadAndRender({});
  });
})();
