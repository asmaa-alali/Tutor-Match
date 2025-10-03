// about.js
document.addEventListener("DOMContentLoaded", () => {
    lucide.createIcons();

    const body = document.body;
    const toggleBtn = document.getElementById("theme-toggle");
    const sunIcon = toggleBtn.querySelector("[data-lucide='sun']");
    const moonIcon = toggleBtn.querySelector("[data-lucide='moon']");
    const navbar = document.getElementById("navbar");

    // --- Theme Management ---
    function updateIcons() {
    if (body.classList.contains("dark")) {
        // Dark mode → show moon, hide sun
        moonIcon.classList.remove("hidden");
        sunIcon.classList.add("hidden");
    } else {
        // Light mode → show sun, hide moon
        sunIcon.classList.remove("hidden");
        moonIcon.classList.add("hidden");
    }
}


    function toggleTheme() {
        body.classList.toggle("dark");
        localStorage.setItem(
            "theme",
            body.classList.contains("dark") ? "dark" : "light"
        );
        updateIcons();
    }

    // Initialize theme
    if (
        localStorage.getItem("theme") === "dark" ||
        (!localStorage.getItem("theme") &&
            window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
        body.classList.add("dark");
    }
    updateIcons();

    toggleBtn.addEventListener("click", toggleTheme);

    // --- Navbar scroll effect ---
    window.addEventListener("scroll", () => {
        if (window.scrollY > 50) {
            navbar.classList.add("glass", "shadow-2xl");
        } else {
            navbar.classList.remove("glass", "shadow-2xl");
        }
    });

    // --- Magnetic effect ---
    document.querySelectorAll(".magnetic").forEach((element) => {
        element.addEventListener("mousemove", (e) => {
            const rect = element.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            const moveX = x * 0.1;
            const moveY = y * 0.1;
            element.style.transform = `translate(${moveX}px, ${moveY}px)`;
        });
        element.addEventListener("mouseleave", () => {
            element.style.transform = "translate(0, 0)";
        });
    });

    // --- Scroll animations ---
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px",
    };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.style.animationPlayState = "running";
            }
        });
    }, observerOptions);

    document
        .querySelectorAll(
            ".float-up, .scale-bounce, .slide-in-left, .slide-in-right, .fade-in"
        )
        .forEach((el) => {
            observer.observe(el);
        });

    // --- Timeline animation ---
    const timelineObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        entry.target.classList.add("animate");
                    }, index * 200);
                }
            });
        },
        { threshold: 0.5 }
    );

    document.querySelectorAll(".timeline-item").forEach((item) => {
        timelineObserver.observe(item);
    });

    // --- Stats counter animation ---
    function animateCounter(element, target, duration = 2000) {
        let start = 0;
        const increment = target / (duration / 16);
        function updateCounter() {
            start += increment;
            if (start < target) {
                element.textContent = Math.floor(start);
                requestAnimationFrame(updateCounter);
            } else {
                element.textContent = target;
            }
        }
        updateCounter();
    }

    const statsObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const statNumber = entry.target.querySelector(".stat-number");
                    const target = parseInt(statNumber.getAttribute("data-target"));
                    setTimeout(() => {
                        animateCounter(statNumber, target);
                    }, 500);
                    statsObserver.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.5 }
    );

    document.querySelectorAll(".glass").forEach((card) => {
        if (card.querySelector(".stat-number")) {
            statsObserver.observe(card);
        }
    });

    // --- Particles system ---
    function createParticle() {
        const particle = document.createElement("div");
        particle.className = "particle";
        particle.style.left = Math.random() * 100 + "vw";
        particle.style.animationDuration = Math.random() * 3 + 7 + "s";
        particle.style.opacity = Math.random() * 0.3 + 0.1;
        document.getElementById("particles").appendChild(particle);
        setTimeout(() => particle.remove(), 10000);
    }

    setInterval(createParticle, 500);

    // --- Enhanced button interactions ---
    document.querySelectorAll("button, .btn-premium").forEach((button) => {
        button.addEventListener("mouseenter", () => {
            if (!button.disabled) {
                button.style.transform = "translateY(-3px) scale(1.05)";
            }
        });
        button.addEventListener("mouseleave", () => {
            if (!button.disabled) {
                button.style.transform = "translateY(0) scale(1)";
            }
        });
    });
});
