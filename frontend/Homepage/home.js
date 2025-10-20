
lucide.createIcons();
const themeToggle = document.getElementById('theme-toggle');
const html = document.documentElement;
const savedTheme = localStorage.getItem('theme') || 'light';
if (savedTheme === 'dark') {
  html.classList.add('dark');
}
        setTimeout(() => {
            const sunIcon = themeToggle.querySelector('[data-lucide="sun"]');
            const moonIcon = themeToggle.querySelector('[data-lucide="moon"]');
           
            if (html.classList.contains('dark')) {
                sunIcon.classList.add('hidden');
                moonIcon.classList.remove('hidden');
            } else {
                sunIcon.classList.remove('hidden');
                moonIcon.classList.add('hidden');
            }
        }, 100);
       
        function toggleTheme() {
            const isDark = html.classList.contains('dark');
            const sunIcon = themeToggle.querySelector('[data-lucide="sun"]');
            const moonIcon = themeToggle.querySelector('[data-lucide="moon"]');
            document.body.classList.add('theme-transition');
           
            if (isDark) {
                html.classList.remove('dark');
                localStorage.setItem('theme', 'light');
                sunIcon.classList.remove('hidden');
                moonIcon.classList.add('hidden');
            } else {
                html.classList.add('dark');
                localStorage.setItem('theme', 'dark');
                sunIcon.classList.add('hidden');
                moonIcon.classList.remove('hidden');
            }
           
            setTimeout(() => {
                lucide.createIcons();
                document.body.classList.remove('theme-transition');
            }, 500);
        }
       
        themeToggle.addEventListener('click', toggleTheme);
        const navbar = document.getElementById('navbar');
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.classList.add('glass', 'dark:glass-dark', 'shadow-2xl');
                navbar.style.background = 'rgba(255, 255, 255, 0.1)';
            } else {
                navbar.classList.remove('glass', 'dark:glass-dark', 'shadow-2xl');
                navbar.style.background = 'transparent';
            }
        });
       
        document.querySelectorAll('.magnetic').forEach(element => {
            element.addEventListener('mousemove', (e) => {
                const rect = element.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
               
                const moveX = x * 0.1;
                const moveY = y * 0.1;
               
                element.style.transform = `translate(${moveX}px, ${moveY}px)`;
            });
           
            element.addEventListener('mouseleave', () => {
                element.style.transform = 'translate(0, 0)';
            });
        });
       
        function createParticles() {
            const particlesContainer = document.getElementById('particles');
            const particleCount = 50;
           
            for (let i = 0; i < particleCount; i++) {
                const particle = document.createElement('div');
                particle.className = 'particle';
                particle.style.left = Math.random() * 100 + '%';
                particle.style.top = Math.random() * 100 + '%';
                particle.style.animationDelay = Math.random() * 6 + 's';
                particle.style.animationDuration = (Math.random() * 3 + 3) + 's';
                particlesContainer.appendChild(particle);
            }
        }
       
        createParticles();
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
       
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.animationPlayState = 'running';
                    entry.target.classList.add('animate-in');
                }
            });
        }, observerOptions);
        document.querySelectorAll('.float-up, .slide-reveal, .scale-bounce, .rotate-reveal').forEach(el => {
            observer.observe(el);
        });
        document.querySelectorAll('button').forEach(button => {
            button.addEventListener('mouseenter', () => {
                button.style.transform = 'translateY(-3px) scale(1.05)';
            });
           
            button.addEventListener('mouseleave', () => {
                button.style.transform = 'translateY(0) scale(1)';
            });
           
            button.addEventListener('mousedown', () => {
                button.style.transform = 'translateY(0) scale(0.98)';
            });
           
            button.addEventListener('mouseup', () => {
                button.style.transform = 'translateY(-3px) scale(1.05)';
            });
        });
        document.querySelectorAll('button').forEach(button => {
            if (button.textContent.includes('Start Learning') ||
                button.textContent.includes('Search') ||
                button.textContent.includes('Start Your Journey')) {
                button.addEventListener('click', () => {
                    const ripple = document.createElement('div');
                    ripple.style.position = 'absolute';
                    ripple.style.borderRadius = '50%';
                    ripple.style.background = 'rgba(255, 255, 255, 0.6)';
                    ripple.style.transform = 'scale(0)';
                    ripple.style.animation = 'ripple 0.6s linear';
                    ripple.style.left = '50%';
                    ripple.style.top = '50%';
                    button.appendChild(ripple);
                   
                    setTimeout(() => {
                        alert('🚀 Redirecting to tutor search...');
                        ripple.remove();
                    }, 300);
                });
            } else if (button.textContent.includes('Book Now')) {
                button.addEventListener('click', () => {
                    alert('📅 Opening booking calendar...');
                });
            } else if (button.textContent.includes('Watch Demo')) {
                button.addEventListener('click', () => {
                    alert('🎥 Loading demo video...');
                });
            } else if (button.textContent.includes('Log In')) {
                button.addEventListener('click', () => {
                    alert('🔐 Opening login form...');
                });
            } else if (button.textContent.includes('Sign Up')) {
                button.addEventListener('click', () => {
                    alert('📝 Opening registration form...');
                });
            } else if (button.textContent.includes('Submit Feedback')) {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                
                    const rating = document.querySelector('.star-rating.text-yellow-400')?.dataset.rating || 0;
                    const categories = Array.from(document.querySelectorAll('.feedback-category input:checked')).map(cb => cb.value);
                    const feedback = document.querySelector('textarea').value;
                    const name = document.querySelector('input[placeholder="Your name"]').value;
                    const email = document.querySelector('input[type="email"]').value;
                   
                    if (rating === 0) {
                        alert('⭐ Please select a rating before submitting!');
                        return;
                    }
                   
                    if (!feedback.trim()) {
                        alert('📝 Please share your feedback before submitting!');
                        return;
                    }
                    const successMessage = `
                        ✅ Thank you for your feedback!
                       
                        Rating: ${rating} star${rating > 1 ? 's' : ''}
                        Categories: ${categories.length > 0 ? categories.join(', ') : 'General'}
                        ${name ? `Name: ${name}` : ''}
                        ${email ? `Email: ${email}` : ''}
                       
                        Your feedback has been submitted successfully and will help us improve AUB Tutor Hub!
                    `;
                   
                    alert(successMessage);
                    document.querySelector('form').reset();
                    document.querySelectorAll('.star-rating').forEach(star => {
                        star.classList.remove('text-yellow-400');
                        star.classList.add('text-gray-300');
                    });
                    document.querySelectorAll('.feedback-category div').forEach(div => {
                        div.classList.remove('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/20');
                        div.classList.add('border-transparent');
                    });
                    document.getElementById('rating-text').textContent = '';
                });
            }
        });
        const starRatings = document.querySelectorAll('.star-rating');
        const ratingText = document.getElementById('rating-text');
        const ratingMessages = {
            1: 'Poor - We\'re sorry to hear that',
            2: 'Fair - We can do better',
            3: 'Good - Thanks for your feedback',
            4: 'Very Good - We\'re glad you enjoyed it',
            5: 'Excellent - Thank you for the amazing review!'
        };
       
        starRatings.forEach((star, index) => {
            star.addEventListener('click', () => {
                const rating = parseInt(star.dataset.rating);
                starRatings.forEach(s => {
                    s.classList.remove('text-yellow-400');
                    s.classList.add('text-gray-300');
                });
                for (let i = 0; i < rating; i++) {
                    starRatings[i].classList.remove('text-gray-300');
                    starRatings[i].classList.add('text-yellow-400');
                }
               
                ratingText.textContent = ratingMessages[rating];
                ratingText.className = rating <= 2 ? 'text-red-500 dark:text-red-400 font-medium' :
                                     rating === 3 ? 'text-yellow-500 dark:text-yellow-400 font-medium' :
                                     'text-green-500 dark:text-green-400 font-medium';
            });
           
            star.addEventListener('mouseenter', () => {
                const rating = parseInt(star.dataset.rating);
                starRatings.forEach((s, i) => {
                    if (i < rating) {
                        s.classList.add('text-yellow-300');
                    }
                });
            });
           
            star.addEventListener('mouseleave', () => {
                starRatings.forEach(s => {
                    s.classList.remove('text-yellow-300');
                });
            });
        });
        document.querySelectorAll('.feedback-category').forEach(category => {
            category.addEventListener('click', () => {
                const checkbox = category.querySelector('input[type="checkbox"]');
                const div = category.querySelector('div');
               
                checkbox.checked = !checkbox.checked;
               
                if (checkbox.checked) {
                    div.classList.remove('border-transparent');
                    div.classList.add('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/20');
                } else {
                    div.classList.add('border-transparent');
                    div.classList.remove('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/20');
                }
            });
        });
        document.querySelectorAll('.flip-card').forEach(card => {
            card.addEventListener('click', () => {
                const tutorName = card.querySelector('h3').textContent;
                console.log(`Clicked on ${tutorName}'s card`);
            });
        });
        const style = document.createElement('style');
        style.textContent = `
            @keyframes ripple {
                to {
                    transform: scale(4);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
        let ticking = false;
       
        function updateScrollEffects() {
            ticking = false;
        }
       
        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(updateScrollEffects);
                ticking = true;
            }
        });
  (function(){function c(){var b=a.contentDocument||a.contentWindow.document;if(b){var d=b.createElement('script');d.innerHTML="window.__CF$cv$params={r:'97b4771c24aae30e',t:'MTc1NzIyOTg1NC4wMDAwMDA='};var a=document.createElement('script');a.nonce='';a.src='/cdn-cgi/challenge-platform/scripts/jsd/main.js';document.getElementsByTagName('head')[0].appendChild(a);";b.getElementsByTagName('head')[0].appendChild(d)}}if(document.body){var a=document.createElement('iframe');a.height=1;a.width=1;a.style.position='absolute';a.style.top=0;a.style.left=0;a.style.border='none';a.style.visibility='hidden';document.body.appendChild(a);if('loading'!==document.readyState)c();else if(window.addEventListener)document.addEventListener('DOMContentLoaded',c);else{var e=document.onreadystatechange||function(){};document.onreadystatechange=function(b){e(b);'loading'!==document.readyState&&(document.onreadystatechange=e.c())}}}})();
