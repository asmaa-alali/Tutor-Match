lucide.createIcons();

// Enhanced Loading
        window.addEventListener('load', () => {
            setTimeout(() => {
                document.getElementById('loadingOverlay').classList.add('hidden');
            }, 1000);
        });
        
        // Theme Management
        function toggleTheme() {
            document.body.classList.toggle('dark');
            const isDark = document.body.classList.contains('dark');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            updateThemeIcons(isDark);
        }
        
        function updateThemeIcons(isDark) {
            const icons = ['themeIcon', 'themeIconMobile'];
            icons.forEach(iconId => {
                const icon = document.getElementById(iconId);
                if (icon) {
                    icon.setAttribute('data-lucide', isDark ? 'moon' : 'sun');
                }
            });
            lucide.createIcons();
        }
        
        // Initialize theme
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
        
        if (isDark) {
            document.body.classList.add('dark');
        }
        
        // Set initial icons after page load
        document.addEventListener('DOMContentLoaded', () => {
            updateThemeIcons(isDark);
        });
        
        // Enhanced navbar scroll effect
        const navbar = document.getElementById('navbar');
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.classList.add('glass-strong', 'shadow-2xl');
            } else {
                navbar.classList.remove('glass-strong', 'shadow-2xl');
            }
        });
        
        // Enhanced particles system
        function createParticle() {
            const particle = document.createElement('div');
            const types = ['particle-1', 'particle-2', 'particle-3'];
            const randomType = types[Math.floor(Math.random() * types.length)];
            
            particle.className = `particle ${randomType}`;
            particle.style.left = Math.random() * 100 + 'vw';
            particle.style.animationDuration = (Math.random() * 5 + 8) + 's';
            particle.style.animationDelay = Math.random() * 2 + 's';
            
            document.getElementById('particles').appendChild(particle);
            setTimeout(() => particle.remove(), 12000);
        }
        
        setInterval(createParticle, 600);
        
        // Enhanced magnetic effect
        document.querySelectorAll('.magnetic').forEach(element => {
            element.addEventListener('mousemove', (e) => {
                const rect = element.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                const moveX = x * 0.15;
                const moveY = y * 0.15;
                element.style.transform = `translate(${moveX}px, ${moveY}px) scale(1.02)`;
            });
            element.addEventListener('mouseleave', () => {
                element.style.transform = 'translate(0, 0) scale(1)';
            });
        });
        
        // Enhanced role selection
        function selectRole(role) {
            const selectedCard = document.querySelector(`.choice-card.${role}`);
            const otherCard = document.querySelector(`.choice-card:not(.${role})`);
            
            // Animate selection
            selectedCard.style.transform = 'scale(0.95)';
            selectedCard.style.filter = 'brightness(1.2)';
            otherCard.style.opacity = '0.5';
            otherCard.style.transform = 'scale(0.95)';
            
            setTimeout(() => {
                selectedCard.style.transform = 'scale(1.05)';
                
                setTimeout(() => {
                    // Navigate to appropriate registration page
                    if (role === 'student') {
                        window.location.href = 'student-account.html';
                    } else if (role === 'tutor') {
                        window.location.href = 'tutor-account.html';
                    }
                }, 200);
            }, 150);
        }
        
        // Enhanced animations on page load
        document.addEventListener('DOMContentLoaded', () => {
            const animatedElements = document.querySelectorAll('.animate-slide-up, .animate-slide-left, .animate-scale-in');
            animatedElements.forEach((element, index) => {
                element.style.opacity = '0';
                element.style.transform = element.classList.contains('animate-slide-up') ? 'translateY(80px) scale(0.95)' : 
                                        element.classList.contains('animate-slide-left') ? 'translateX(-80px) rotate(-5deg)' : 'scale(0.7) rotate(10deg)';
                
                setTimeout(() => {
                    element.style.transition = 'all 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                    element.style.opacity = '1';
                    element.style.transform = 'translateY(0) translateX(0) scale(1) rotate(0deg)';
                }, index * 150);
            });
        });
        
        // Enhanced hover effects
        document.querySelectorAll('.choice-card').forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.style.boxShadow = card.classList.contains('student') 
                    ? '0 35px 80px rgba(59, 130, 246, 0.4)' 
                    : '0 35px 80px rgba(13, 148, 136, 0.4)';
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.boxShadow = '';
            });
        });
        
        // Add parallax effect to background
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const parallax = document.getElementById('particles');
            const speed = scrolled * 0.5;
            parallax.style.transform = `translateY(${speed}px)`;
        });