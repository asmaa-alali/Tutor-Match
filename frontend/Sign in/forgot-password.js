// forgot-password.js
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// ✅ Initialize Supabase directly in the browser
const supabase = createClient(
  "https://tdwgbaingdbodbqisotm.supabase.co",           // ⬅️ replace with your real Supabase URL
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkd2diYWluZ2Rib2RicWlzb3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4NzIxMjIsImV4cCI6MjA3NjQ0ODEyMn0.Rw8WQiSswknrGtdD3418RASZ7okwLS4-RGr7dbjZgzs"                        // ⬅️ replace with your anon (public) key
);

document.getElementById("forgotPasswordForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();

  if (!email) {
    showNotification("Please enter your email.", "error");
    return;
  }

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "http://localhost:3000/reset-password" // 👈 the page user will go to
    });

    if (error) throw error;

    showNotification(`If an account exists for ${email}, a reset link has been sent.`, "success");
    e.target.reset();
  } catch (err) {
    console.error("Reset email error:", err);
    showNotification("Error sending reset email. Please try again later.", "error");
  }
});

// simple notification handler (reuse yours if preferred)
function showNotification(message, type = "success") {
  const notification = document.getElementById("notification");
  const text = document.getElementById("notificationText");
  text.textContent = message;
  notification.className = `notification ${type}`;
  notification.classList.remove("hidden");
  setTimeout(() => notification.classList.add("hidden"), 4000);
}
