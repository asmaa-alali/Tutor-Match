/* find-tutor.js */
console.log("✅ findtutor.js loaded!");

(() => {
  'use strict';
  const DEFAULT_AVATAR_SRC = '/assets/default-avatar.svg';

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

    setTimeout(() => {
      const sun = themeToggle?.querySelector('[data-lucide="sun"]');
      const moon = themeToggle?.querySelector('[data-lucide="moon"]');
      if (!sun || !moon) return;

      if (htmlEl.classList.contains('dark')) {
        sun.classList.add('hidden');
        moon.classList.remove('hidden');
      } else {
        sun.classList.remove('hidden');
        moon.classList.add('hidden');
      }
    }, 50);

    themeToggle?.addEventListener('click', () => {
      const sun = themeToggle.querySelector('[data-lucide="sun"]');
      const moon = themeToggle.querySelector('[data-lucide="moon"]');
      document.body.classList.add('theme-transition');

      const isDark = htmlEl.classList.contains('dark');
      if (isDark) {
        htmlEl.classList.remove('dark');
        localStorage.setItem('theme', 'light');
        sun?.classList.remove('hidden');
        moon?.classList.add('hidden');
      } else {
        htmlEl.classList.add('dark');
        localStorage.setItem('theme', 'dark');
        sun?.classList.add('hidden');
        moon?.classList.remove('hidden');
      }

      setTimeout(() => {
        refreshIcons();
        document.body.classList.remove('theme-transition');
      }, 300);
    });
  }

  // ------- Navbar glass -------
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
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'translate(0,0)';
      });
    });
  }

  // ------- Particles -------
  function setupParticles() {
    const container = $('#particles');
    if (!container) return;

    for (let i = 0; i < 50; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.left = Math.random() * 100 + '%';
      p.style.top = Math.random() * 100 + '%';
      p.style.animationDelay = Math.random() * 6 + 's';
      p.style.animationDuration = (Math.random() * 3 + 3) + 's';
      container.appendChild(p);
    }
  }

  // ------- Render tutor cards -------
  const tutorsGrid = $('#tutors-grid');
  const loadingEl = $('#loading-tutors');

  function renderTutorCard(t) {
    const name = [t.firstName || '', t.lastName || ''].join(' ').trim() || 'Tutor';
    const avatar =
      t.profilePhotoUrl || t.avatarUrl || t.photoUrl || DEFAULT_AVATAR_SRC;

    const subjects = Array.isArray(t.subjects) ? t.subjects : (t.subjects ? [t.subjects] : []);
    const subjectsHtml = subjects.map(s =>
      `<span class="subject-tag">${s}</span>`
    ).join('');

    const rating = (typeof t.rating === 'number' ? t.rating : 4.9).toFixed(1);
    const reviews = t.reviews ? `${t.reviews} reviews` : 'New';

    return `
      <div class="tutor-card p-6"
           data-name="${name.toLowerCase()}"
           data-rating="${rating}"
           data-rate="${t.rate || 35}"
           data-profile-id="${t.id || ''}">
           
        <div class="flex items-center gap-4 mb-4">
          <img src="${avatar}" class="w-16 h-16 rounded-full object-cover"/>
          <div>
            <h3 class="text-xl font-semibold text-white">${name}</h3>
            <div class="star-rating text-sm">★ ${rating} <span class="text-white/60">(${reviews})</span></div>
          </div>
        </div>

        <div class="mb-4 flex flex-wrap gap-2">${subjectsHtml || '<span class="text-white/60 text-sm">No subjects listed</span>'}</div>

        <div class="flex items-center justify-between mb-3">
          <div class="text-green-400 font-bold">$${t.rate || 35}/hour</div>
          <div class="flex items-center gap-2">
            <button class="btn-premium px-6 py-2" data-action="view" data-id="${t.id}">View Profile</button>
            <button class="glass dark:glass-dark px-4 py-2 rounded-xl" data-action="message" data-id="${t.id}">
              <i data-lucide="message-circle" class="w-4 h-4"></i>
            </button>
          </div>
        </div>

        <button class="w-full glass dark:glass-dark px-4 py-2 rounded-xl text-white hover:bg-white/20"
                data-action="rate" data-id="${t.id}" data-name="${name}">
          <i data-lucide="star" class="w-4 h-4 inline mr-2"></i> Rate This Tutor
        </button>
      </div>
    `;
  }

  // ------- Fetch tutors -------
  async function fetchTutors({ subject = '', search = '' } = {}) {
    const params = new URLSearchParams();
    if (subject) params.set('subject', subject);
    if (search) params.set('search', search);
    const url = params.toString() ? `/api/tutors?${params}` : '/api/tutors';

    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch tutors');
    const data = await res.json();
    return data.tutors || [];
  }

  function injectTutors(tutors) {
    tutorsGrid.innerHTML = tutors.length
      ? tutors.map(renderTutorCard).join('')
      : `<div class="glass dark:glass-dark p-6 rounded-2xl text-white/80">No tutors found.</div>`;
    refreshIcons();
  }

  // ------- Load tutors -------
  async function loadAndRender(initialFilters = {}) {
    loadingEl.classList.remove('hidden');
    tutorsGrid.classList.add('hidden');

    try {
      const tutors = await fetchTutors(initialFilters);
      injectTutors(tutors);
    } catch (err) {
      loadingEl.innerHTML = `<p class="text-red-200">Failed to load tutors.</p>`;
    } finally {
      loadingEl.classList.add('hidden');
      tutorsGrid.classList.remove('hidden');
    }
  }

  // ------- Rating Modal -------
  function openRatingModal(tutorId, tutorName) {
    if (!tutorId) return alert("Unable to rate this tutor.");

    const overlay = document.createElement('div');
    overlay.id = 'rating-modal-overlay';
    overlay.className = 'fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4';

    overlay.innerHTML = `
      <div class="glass dark:glass-dark rounded-3xl p-8 max-w-2xl w-full"
           onclick="event.stopPropagation()">

        <div class="flex justify-between mb-6">
          <h2 class="text-3xl font-bold text-white">Rate ${tutorName}</h2>
          <button id="close-rating-modal">
            <i data-lucide="x" class="w-6 h-6 text-white"></i>
          </button>
        </div>

        <form id="rating-form" class="space-y-6">

          <div>
            <label class="text-white font-medium">Overall Rating</label>
            <div class="flex gap-2 mt-3">
              ${[1,2,3,4,5].map(i=>`
                <button type="button" class="star-btn text-4xl" data-rating="${i}">
                  <span class="empty text-gray-400">☆</span>
                  <span class="filled text-yellow-400 hidden">★</span>
                </button>`).join('')}
            </div>
            <input type="hidden" id="rating-value" required>
          </div>

          <div>
            <label class="text-white font-medium">Feedback</label>
            <textarea id="feedback-text" rows="5"
              class="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white"
              placeholder="Share your experience..." required></textarea>
          </div>

          <div>
            <label class="text-white font-medium">Subject(s)</label>
            <input id="subject-taught"
              class="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white"
              placeholder="e.g., CMPS 200">
          </div>

          <div>
            <label class="text-white font-medium">Recommend this tutor?</label>
            <div class="flex gap-4 mt-2">
              <label class="flex items-center gap-3 glass dark:glass-dark p-3 rounded-xl">
                <input type="radio" name="recommend" value="yes" required> <span class="text-white">Yes</span>
              </label>
              <label class="flex items-center gap-3 glass dark:glass-dark p-3 rounded-xl">
                <input type="radio" name="recommend" value="no" required> <span class="text-white">No</span>
              </label>
            </div>
          </div>

          <button type="submit" class="btn-premium w-full py-4 text-lg font-semibold">
            Submit Rating
          </button>

        </form>
      </div>
    `;

    document.body.appendChild(overlay);
    refreshIcons();

    // Star rating logic
    const ratingInput = overlay.querySelector('#rating-value');
    overlay.querySelectorAll('.star-btn').forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        ratingInput.value = idx + 1;
        overlay.querySelectorAll('.star-btn').forEach((b, i) => {
          b.querySelector('.empty').classList.toggle('hidden', i < idx+1);
          b.querySelector('.filled').classList.toggle('hidden', i >= idx+1);
        });
      });
    });

    // Close modal
    const closeModal = () => overlay.remove();
    overlay.addEventListener('click', closeModal);
    overlay.querySelector('#close-rating-modal').addEventListener('click', closeModal);

    // Submit form
    overlay.querySelector('#rating-form').addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!ratingInput.value) return alert("Select a rating.");
      const feedback = overlay.querySelector('#feedback-text').value.trim();
      if (feedback.length < 20) return alert("Feedback must be at least 20 characters.");

      const subject = overlay.querySelector('#subject-taught').value.trim();
      const recommend = overlay.querySelector('input[name="recommend"]:checked')?.value;

      const session = JSON.parse(localStorage.getItem('tmUserSession') || '{}');
      const studentId = session.userId;
      if (!studentId) return alert("Please log in.");

      try {
        const res = await fetch('/api/ratings', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            tutorId, studentId, rating: Number(ratingInput.value),
            feedback, subject, recommend: recommend === 'yes'
          })
        });

        if (!res.ok) throw new Error("Failed to submit rating");

        closeModal();
        alert("Rating submitted!");

      } catch (err) {
        alert(err.message);
      }
    });
  }

  // ------- Button Handlers -------
  function setupCardAndCtaHandlers() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      const id = btn.dataset.id;
      const action = btn.dataset.action;
      const name = btn.dataset.name;

      if (action === 'view') {
        window.location.href = `/Student%20Page/tutor-profile.html?id=${id}`;
      }

      if (action === 'rate') {
        openRatingModal(id, name);
      }
    });
  }

  // ------- Init -------
  window.addEventListener('DOMContentLoaded', async () => {
    refreshIcons();
    setupThemeToggle();
    setupNavbarGlass();
    setupMagnetic();
    setupParticles();
    setupCardAndCtaHandlers();
    await loadAndRender({});
  });

})();
