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
    const sideThemeToggle = $('#side-theme-toggle');
    const htmlEl = document.documentElement;

    // Apply saved theme on load
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') htmlEl.classList.add('dark');

        // Ensure correct initial icon
    setTimeout(() => {
      const sunIcon = themeToggle?.querySelector('[data-lucide="sun"]');
      const moonIcon = themeToggle?.querySelector('[data-lucide="moon"]');


      if (!sunIcon || !moonIcon) return;
      if (htmlEl.classList.contains('dark')) { sunIcon.classList.add('hidden'); moonIcon.classList.remove('hidden'); }
      else { sunIcon.classList.remove('hidden'); moonIcon.classList.add('hidden'); }
    },50 );

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
    const avatar =
      t.profilePhotoUrl ||
      t.avatarUrl ||
      t.profilePhoto ||
      t.photoUrl ||
      t.passportPhoto ||
      DEFAULT_AVATAR_SRC;
    const subs = Array.isArray(t.subjects) ? t.subjects : (t.subjects ? [t.subjects] : []);
    const subjectsHtml = subs.map(s =>
      `<span class="subject-tag" data-subject="${String(s).toLowerCase()}">${String(s)}</span>`
    ).join('');
    const rating = (typeof t.rating === 'number' ? t.rating : 4.9).toFixed(1);
    const reviews = t.reviews ? `${t.reviews} reviews` : 'New';
    const rate = t.rate ? Number(t.rate) : 35;
    const fmt = t.format || 'online/in-person';

    return `
      <div class="tutor-card p-6" data-name="${name.toLowerCase()}" data-rate="${rate}" data-rating="${rating}" data-format="${String(fmt).toLowerCase()}" data-profile-id="${t.id || ''}">
        <div class="flex items-center gap-4 mb-4">
          <img src="${avatar}" alt="${name}" class="w-16 h-16 rounded-full object-cover" loading="lazy" onerror="this.onerror=null;this.src='${DEFAULT_AVATAR_SRC}';"/>
          <div>
            <h3 class="text-xl font-semibold text-white">${name}</h3>
            <div class="star-rating text-sm">★ ${rating} <span class="text-white/60">(${reviews})</span></div>
          </div>
        </div>
        <div class="mb-4 flex flex-wrap gap-2">${subjectsHtml || '<span class="text-white/60 text-sm">No subjects listed</span>'}</div>
        <div class="flex items-center justify-between mb-3">
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
<<<<<<< HEAD
<<<<<<< HEAD

        <button class="w-full glass dark:glass-dark px-4 py-2 rounded-xl text-white hover:bg-white/20 transition-all"
  data-action="rate" data-id="${t.id || ''}" data-name="${name}">
  <i data-lucide="star" class="w-4 h-4 inline mr-2"></i> Rate This Tutor
</button>

        
=======
        <button class="w-full glass dark:glass-dark px-4 py-2 rounded-xl text-white hover:bg-white/20 transition-all" data-action="rate" data-id="${t.id || ''}" data-name="${name}">
          <i data-lucide="star" class="w-4 h-4 inline mr-2"></i> Rate This Tutor
        </button>
>>>>>>> parent of 85188fc (Merge branch 'main' of https://github.com/asmaa-alali/Tutor-Match)
=======
        <button class="w-full glass dark:glass-dark px-4 py-2 rounded-xl text-white hover:bg-white/20 transition-all" data-action="rate" data-id="${t.id || ''}" data-name="${name}">
          <i data-lucide="star" class="w-4 h-4 inline mr-2"></i> Rate This Tutor
        </button>
>>>>>>> parent of 85188fc (Merge branch 'main' of https://github.com/asmaa-alali/Tutor-Match)
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
    const openTutorProfile = (id) => {
      if (!id) {
        alert("This tutor is finalizing their profile. Please try again later.");
        return;
      }
      window.location.href = `/Student%20Page/tutor-profile.html?id=${encodeURIComponent(id)}`;
    };


    const openRatingModal = (tutorId, tutorName) => {
  if (!tutorId) {
    alert("Unable to rate this tutor at the moment.");
    return;
  }

  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.id = 'rating-modal-overlay';
  overlay.className = 'fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4';

  overlay.innerHTML = `
    <div class="glass dark:glass-dark rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
         onclick="event.stopPropagation()">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-3xl font-bold text-white">Rate ${tutorName || 'Tutor'}</h2>
        <button id="close-rating-modal" class="p-2 rounded-xl hover:bg-white/10 text-white">
          <i data-lucide="x" class="w-6 h-6"></i>
        </button>
      </div>

      <form id="rating-form" class="space-y-6">
        <!-- Star Rating -->
        <div>
          <label class="block text-white font-medium mb-3 text-lg">Overall Rating</label>
          <div class="flex gap-2" id="star-rating-input">
            ${[1, 2, 3, 4, 5].map(i => `
              <button type="button"
                      class="star-btn text-5xl transition-all hover:scale-110"
                      data-rating="${i}">
                <span class="star-empty text-gray-400">☆</span>
                <span class="star-filled text-yellow-400 hidden">★</span>
              </button>
            `).join('')}
          </div>
          <p class="text-white/60 text-sm mt-2">Click to rate (1–5 stars)</p>
          <input type="hidden" id="rating-value" name="rating" required>
        </div>

        <!-- Feedback -->
        <div>
          <label class="block text-white font-medium mb-3 text-lg">Your Feedback</label>
          <textarea id="feedback-text" name="feedback" rows="5"
            class="w-full px-4 py-3 rounded-xl bg-white/10 border-2 border-white/20 
                   text-white placeholder-white/50 focus:border-blue-500 focus:outline-none resize-none"
            placeholder="Share your experience with this tutor..."
            required></textarea>
          <p class="text-white/60 text-sm mt-2">Minimum 20 characters</p>
        </div>

        <!-- Subject -->
        <div>
          <label class="block text-white font-medium mb-3 text-lg">Subject(s) Taught</label>
          <input type="text" id="subject-taught" name="subject"
            class="w-full px-4 py-3 rounded-xl bg-white/10 border-2 border-white/20 
                   text-white placeholder-white/50 focus:border-blue-500 focus:outline-none"
            placeholder="e.g., CMPS 200, Mathematics">
        </div>

        <!-- Recommend -->
        <div>
          <label class="block text-white font-medium mb-3 text-lg">Would you recommend this tutor?</label>
          <div class="flex gap-4">
            <label class="flex items-center gap-3 glass dark:glass-dark px-6 py-3 rounded-xl cursor-pointer hover:bg-white/20">
              <input type="radio" name="recommend" value="yes" class="w-5 h-5" required>
              <span class="text-white">Yes 👍</span>
            </label>
            <label class="flex items-center gap-3 glass dark:glass-dark px-6 py-3 rounded-xl cursor-pointer hover:bg-white/20">
              <input type="radio" name="recommend" value="no" class="w-5 h-5" required>
              <span class="text-white">No 👎</span>
            </label>
          </div>
        </div>

        <!-- Submit / Cancel -->
        <div class="flex gap-4 pt-4">
          <button type="submit" class="btn-premium flex-1 py-4 text-lg font-semibold">
            <i data-lucide="send" class="w-5 h-5 inline mr-2"></i>
            Submit Rating
          </button>
          <button type="button" id="cancel-rating"
            class="glass dark:glass-dark px-8 py-4 rounded-full text-white font-semibold hover:bg-white/20">
            Cancel
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);
  refreshIcons();

  // Star system
  let selectedRating = 0;
  const starBtns = overlay.querySelectorAll('.star-btn');
  const ratingInput = overlay.querySelector('#rating-value');

  starBtns.forEach((btn, idx) => {
    btn.addEventListener('click', () => {
      selectedRating = idx + 1;
      ratingInput.value = selectedRating;

      starBtns.forEach((b, i) => {
        const empty = b.querySelector('.star-empty');
        const filled = b.querySelector('.star-filled');
        if (i < selectedRating) {
          empty.classList.add('hidden');
          filled.classList.remove('hidden');
        } else {
          empty.classList.remove('hidden');
          filled.classList.add('hidden');
        }
      });
    });
  });

  // Close modal
  const closeModal = () => overlay.remove();
  overlay.addEventListener('click', closeModal);
  overlay.querySelector('#close-rating-modal').addEventListener('click', closeModal);
  overlay.querySelector('#cancel-rating').addEventListener('click', closeModal);

  // Submit
  overlay.querySelector('#rating-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const rating = parseInt(ratingInput.value);
    const feedback = overlay.querySelector('#feedback-text').value.trim();
    const subject = overlay.querySelector('#subject-taught').value.trim();
    const recommend = overlay.querySelector('input[name="recommend"]:checked')?.value;

    if (!rating) return alert('Select a rating');
    if (feedback.length < 20) return alert('Feedback must be at least 20 characters');

    // Fix for session
    let rawSession = localStorage.getItem('tmUserSession') || localStorage.getItem('session');
    const session = rawSession ? JSON.parse(rawSession) : {};
    const studentId = session.userId;

    if (!studentId) return alert('Please log in to submit a rating');

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<div class="loading-spinner inline-block w-6 h-6 mr-3"></div>Submitting...';
    submitBtn.disabled = true;

    try {
      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tutorId,
          studentId,
          rating,
          feedback,
          subject,
          recommend: recommend === 'yes'
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to submit rating');
      }

      closeModal();

      // Success message
      const successMsg = document.createElement('div');
      successMsg.className =
        'fixed top-20 left-1/2 transform -translate-x-1/2 z-50 glass dark:glass-dark rounded-2xl p-6 shadow-2xl';
      successMsg.innerHTML = `
        <div class="flex items-center gap-4 text-white">
          <div class="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
            <i data-lucide="check" class="w-6 h-6"></i>
          </div>
          <div>
            <p class="font-bold text-lg">Rating Submitted!</p>
            <p class="text-white/80">Thank you for your feedback</p>
          </div>
        </div>
      `;
      document.body.appendChild(successMsg);
      refreshIcons();
<<<<<<< HEAD

      setTimeout(() => successMsg.remove(), 3000);
    } catch (err) {
      alert(`Error: ${err.message}`);
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  });
};
=======
      
      // Star rating interaction
      let selectedRating = 0;
      const starBtns = overlay.querySelectorAll('.star-btn');
      const ratingInput = overlay.querySelector('#rating-value');
      
      starBtns.forEach((btn, idx) => {
        btn.addEventListener('click', () => {
          selectedRating = idx + 1;
          ratingInput.value = selectedRating;
          
          starBtns.forEach((b, i) => {
            const empty = b.querySelector('.star-empty');
            const filled = b.querySelector('.star-filled');
            if (i < selectedRating) {
              empty.classList.add('hidden');
              filled.classList.remove('hidden');
            } else {
              empty.classList.remove('hidden');
              filled.classList.add('hidden');
            }
          });
        });
        
        // Hover effect
        btn.addEventListener('mouseenter', () => {
          starBtns.forEach((b, i) => {
            const empty = b.querySelector('.star-empty');
            const filled = b.querySelector('.star-filled');
            if (i <= idx) {
              empty.classList.add('opacity-50');
              filled.classList.remove('opacity-50');
            }
          });
        });
        
        btn.addEventListener('mouseleave', () => {
          starBtns.forEach(b => {
            b.querySelector('.star-empty').classList.remove('opacity-50');
            b.querySelector('.star-filled').classList.remove('opacity-50');
          });
        });
      });
      
      // Close modal handlers
      const closeModal = () => {
        overlay.remove();
      };
      
      overlay.addEventListener('click', closeModal);
      overlay.querySelector('#close-rating-modal').addEventListener('click', closeModal);
      overlay.querySelector('#cancel-rating').addEventListener('click', closeModal);
      
      // Form submission
      overlay.querySelector('#rating-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const rating = parseInt(ratingInput.value);
        const feedback = overlay.querySelector('#feedback-text').value.trim();
        const subject = overlay.querySelector('#subject-taught').value.trim();
        const recommend = overlay.querySelector('input[name="recommend"]:checked')?.value;
        
        // Validation
        if (!rating || rating < 1 || rating > 5) {
          alert('Please select a star rating');
          return;
        }
        
        if (feedback.length < 20) {
          alert('Please provide more detailed feedback (minimum 20 characters)');
          return;
        }
        
        if (!recommend) {
          alert('Please indicate if you would recommend this tutor');
          return;
        }
        
        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<div class="loading-spinner inline-block w-6 h-6 mr-3"></div>Submitting...';
        submitBtn.disabled = true;
        
        try {
          // Get student info from localStorage
          const session = JSON.parse(localStorage.getItem('session') || '{}');
          const studentId = session.userId;
          
          if (!studentId) {
            throw new Error('Please log in to submit a rating');
          }
          
          const response = await fetch('/api/ratings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tutorId,
              studentId,
              rating,
              feedback,
              subject,
              recommend: recommend === 'yes'
            })
          });
          
          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to submit rating');
          }
          
          // Success!
          closeModal();
          
          // Show success message
          const successMsg = document.createElement('div');
          successMsg.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 z-50 glass dark:glass-dark rounded-2xl p-6 shadow-2xl';
          successMsg.innerHTML = `
            <div class="flex items-center gap-4 text-white">
              <div class="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                <i data-lucide="check" class="w-6 h-6"></i>
              </div>
              <div>
                <p class="font-bold text-lg">Rating Submitted!</p>
                <p class="text-white/80">Thank you for your feedback</p>
              </div>
            </div>
          `;
          document.body.appendChild(successMsg);
          refreshIcons();
          
          setTimeout(() => {
            successMsg.remove();
          }, 3000);
          
        } catch (error) {
          console.error('Rating submission error:', error);
          alert(`Error: ${error.message}`);
          submitBtn.innerHTML = originalText;
          submitBtn.disabled = false;
        }
      });
    };
>>>>>>> parent of 85188fc (Merge branch 'main' of https://github.com/asmaa-alali/Tutor-Match)


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
