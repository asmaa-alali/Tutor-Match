import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "https://tdwgbaingdbodbqisotm.supabase.co", // replace
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkd2diYWluZ2Rib2RicWlzb3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4NzIxMjIsImV4cCI6MjA3NjQ0ODEyMn0.Rw8WQiSswknrGtdD3418RASZ7okwLS4-RGr7dbjZgzs" // replace
);

const form = document.getElementById("forgotPasswordForm");
const btn = document.getElementById("sendButton");
const notification = document.getElementById("notification");
const notificationText = document.getElementById("notificationText");

let cooldownActive = false;
let cooldownTimer = null;

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (cooldownActive) return showNotification("⏳ Please wait before requesting again.", "error");

  const email = document.getElementById("email").value.trim();
  if (!email) return showNotification("Please enter your email.", "error");

  btn.disabled = true;
  btn.textContent = "Sending...";

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "http://localhost:3000/reset-password"
    });
    if (error) throw error;

    showNotification(`✅ Reset link sent to ${email}`, "success");
    startCooldown(120); // 120 seconds = 2 minutes
    form.reset();
  } catch (err) {
    console.error(err);
    showNotification("❌ Error sending reset link. Try again.", "error");
    btn.disabled = false;
    btn.textContent = "Send Reset Link";
  }
});

// Cooldown logic
function startCooldown(seconds) {
  cooldownActive = true;
  let remaining = seconds;
  btn.textContent = `Wait ${remaining}s`;
  btn.disabled = true;

  cooldownTimer = setInterval(() => {
    remaining--;
    btn.textContent = `Wait ${remaining}s`;
    if (remaining <= 0) {
      clearInterval(cooldownTimer);
      cooldownActive = false;
      btn.disabled = false;
      btn.textContent = "Send Reset Link";
    }
  }, 1000);
}

// Simple notification popup
function showNotification(message, type) {
  notificationText.textContent = message;
  notification.style.backgroundColor = type === "error" ? "#dc2626" : "#16a34a";
  notification.classList.remove("opacity-0");
  setTimeout(() => notification.classList.add("opacity-0"), 3000);
}
