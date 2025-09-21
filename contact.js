
lucide.createIcons();


const themeToggle = document.getElementById("theme-toggle");
const sunIcon = themeToggle.querySelector(".sun-icon");
const moonIcon = themeToggle.querySelector(".moon-icon");
const body = document.body;

function updateIcons() {
  if (body.classList.contains("dark")) {
    moonIcon.classList.remove("hidden");
    sunIcon.classList.add("hidden");
  } else {
    sunIcon.classList.remove("hidden");
    moonIcon.classList.add("hidden");
  }
}


if (
  localStorage.getItem("theme") === "dark" ||
  (!localStorage.getItem("theme") &&
    window.matchMedia("(prefers-color-scheme: dark)").matches)
) {
  body.classList.add("dark");
}
updateIcons();


themeToggle.addEventListener("click", () => {
  body.classList.toggle("dark");
  localStorage.setItem("theme", body.classList.contains("dark") ? "dark" : "light");
  updateIcons();
});


const navbar = document.getElementById("navbar");
window.addEventListener("scroll", () => {
  if (window.scrollY > 50) {
    navbar.classList.add("glass", "shadow-2xl");
    navbar.style.background = "rgba(255, 255, 255, 0.1)";
  } else {
    navbar.classList.remove("glass", "shadow-2xl");
    navbar.style.background = "transparent";
  }
});


document.querySelectorAll(".magnetic").forEach(el => {
  el.addEventListener("mousemove", e => {
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    el.style.transform = `translate(${x * 0.1}px, ${y * 0.1}px)`;
  });
  el.addEventListener("mouseleave", () => { el.style.transform = "translate(0,0)"; });
});


function openEmail() {
  window.location.href = "mailto:help@aubhub.com?subject=Inquiry from AUB Tutor Hub";
}
function makeCall() {
  window.location.href = "tel:+96113500000";
}
function openWhatsApp() {
  window.open("https://wa.me/96170123456?text=Hello! I have a question about AUB Tutor Hub.", "_blank");
}
function openLiveChat() {
  alert("💬 Live Chat Opening...\n\n✅ Connecting you with our support team\n⚡ Average wait time: < 30 seconds\n🎯 Get instant help with your questions");
}
function getDirections() {
  window.open("https://maps.google.com/?q=American+University+of+Beirut+Bliss+Street+Hamra+Beirut+Lebanon", "_blank");
}
function openFacebook() { window.open("https://facebook.com/aubtutorhub", "_blank"); }
function openTwitter() { window.open("https://twitter.com/aubtutorhub", "_blank"); }
function openInstagram() { window.open("https://instagram.com/aubtutorhub", "_blank"); }
function openLinkedIn() { window.open("https://linkedin.com/company/aubtutorhub", "_blank"); }

document.getElementById("contact-form").addEventListener("submit", e => {
  e.preventDefault();
  const form = e.target;
  const data = new FormData(form);
  const btn = form.querySelector('button[type="submit"]');
  const old = btn.innerHTML;
  btn.innerHTML = '<div class="inline-block w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>Sending...';
  btn.disabled = true;
  setTimeout(() => {
    form.style.display = "none";
    document.getElementById("success-message").classList.remove("hidden");
    btn.innerHTML = old;
    btn.disabled = false;
    console.log("Form submitted:", Object.fromEntries(data));
  }, 2000);
});
function resetForm() {
  document.getElementById("contact-form").style.display = "block";
  document.getElementById("success-message").classList.add("hidden");
  document.getElementById("contact-form").reset();
}


function toggleFAQ(btn) {
  const content = btn.nextElementSibling;
  const icon = btn.querySelector("i");
  if (content.classList.contains("hidden")) {
    content.classList.remove("hidden");
    icon.style.transform = "rotate(180deg)";
  } else {
    content.classList.add("hidden");
    icon.style.transform = "rotate(0)";
  }
}


document.querySelectorAll("button").forEach(b => {
  b.addEventListener("mouseenter", () => {
    if (!b.disabled) b.style.transform = "translateY(-3px) scale(1.05)";
  });
  b.addEventListener("mouseleave", () => {
    if (!b.disabled) b.style.transform = "translateY(0) scale(1)";
  });
});


const observer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.style.animationPlayState = "running";
      e.target.classList.add("animate-in");
    }
  });
}, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });
document.querySelectorAll(".float-up, .slide-reveal, .scale-bounce").forEach(el => observer.observe(el));


document.querySelectorAll(".form-input").forEach(input => {
  input.addEventListener("blur", function () {
    if (this.hasAttribute("required") && !this.value.trim()) {
      this.style.borderColor = "rgba(239,68,68,0.6)";
      this.style.boxShadow = "0 0 0 3px rgba(239,68,68,0.1)";
    } else if (this.type === "email" && this.value && !isValidEmail(this.value)) {
      this.style.borderColor = "rgba(239,68,68,0.6)";
      this.style.boxShadow = "0 0 0 3px rgba(239,68,68,0.1)";
    } else {
      this.style.borderColor = "rgba(34,197,94,0.6)";
      this.style.boxShadow = "0 0 0 3px rgba(34,197,94,0.1)";
    }
  });
  input.addEventListener("focus", function () {
    this.style.borderColor = "rgba(59,130,246,0.6)";
    this.style.boxShadow = "0 10px 30px rgba(59,130,246,0.2)";
  });
});
function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});
