
import dotenv from "dotenv";
dotenv.config();



// backend/server.js
import multer from "multer";
import fs from "fs";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";

import { createClient } from "@supabase/supabase-js";
import cron from "node-cron";
import nodemailer from "nodemailer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 3000;

// -------------------- SUPABASE --------------------
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TUTOR_UPLOAD_BUCKET = "tutor_uploads";
const LOCAL_PROFILE_DIR = path.join(__dirname, "uploads", "profile");

app.use(express.json());
app.use(cors());
const upload = multer({ dest: "uploads/" });
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    fallthrough: true,
  })
);
app.use("/", express.static(path.join(__dirname, "../frontend")));

// -------------------- ADMIN MIDDLEWARE --------------------
// Admin authentication middleware - use on admin-only routes
function requireAdmin(req, res, next) {
  try {
    const bodyEmail = (req.body && typeof req.body === 'object' && req.body.email) || null;
    const queryEmail = (req.query && typeof req.query === 'object' && req.query.email) || null;
    const headerEmail = req.headers && req.headers['x-user-email'] ? String(req.headers['x-user-email']).trim() : null;
    
    const email = bodyEmail || queryEmail || headerEmail || '';
    
    if (!email || email !== "admintm01@proton.me") {
      return res.status(403).json({
        error: "Access denied. Admin privileges required."
      });
    }
    
    next();
  } catch (err) {
    console.error('requireAdmin error:', err);
    return res.status(500).json({ error: 'Server error checking admin privileges' });
  }
}

// -------------------- MAILER --------------------
function createMailer() {
  try {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;
    if (!user || !pass) {
      console.warn("Email credentials not configured; emails will not be sent.");
      return null;
    }
    return nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
  } catch (e) {
    console.warn("Failed to initialize mailer:", e?.message || e);
    return null;
  }
}

async function sendAdminEmail(to, subject, html, textFallback) {
  const transporter = createMailer();
  if (!transporter) return;
  const mailOptions = {
    from: `"Tutor Match" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
    text: textFallback || "",
  };
  try {
    await transporter.sendMail(mailOptions);
  } catch (e) {
    console.warn("Email send failed:", e?.message || e);
  }
}

// Export for use in routes
// Example usage: app.get("/api/admin/users", requireAdmin, async (req, res) => { ... });

// -------------------- ADMIN API ROUTES --------------------
// Returns a list of users (protected)
app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    // Use Supabase admin API to list auth users
    const { data: allUsers, error } = await supabase.auth.admin.listUsers();
    if (error) {
      console.error('Error listing users:', error);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    // allUsers has shape { users: [...] }
    const rawUsers = allUsers.users || [];

    // Map to the frontend-friendly shape
    const users = rawUsers.map((u) => ({
      id: u.id,
      email: u.email,
      username: (u.user_metadata && (u.user_metadata.username || u.user_metadata.name)) || (u.email ? u.email.split('@')[0] : ''),
      role: (u.user_metadata && u.user_metadata.role) || 'user',
      created_at: u.created_at,
      email_confirmed_at: u.email_confirmed_at,
      raw: u,
    }));

    return res.json({ users });
  } catch (err) {
    console.error('Admin users route error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Delete a user (protected - admin only)
app.delete('/api/admin/delete-user', requireAdmin, async (req, res) => {
  try {
    const { userEmail } = req.body;

    if (!userEmail) {
      return res.status(400).json({ error: 'User email is required' });
    }

    // Prevent deleting the admin user
    if (userEmail === 'admintm01@proton.me') {
      return res.status(403).json({ error: 'Cannot delete admin user' });
    }

    // Find user in Supabase Auth
    const { data: allUsers, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error('Error listing users:', listError);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    const userToDelete = (allUsers.users || []).find(u => u.email === userEmail);
    if (!userToDelete) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = userToDelete.id;
    const userRole = userToDelete.user_metadata?.role || 'user';

    // Try to delete from role-specific tables (if they exist)
    try {
      if (userRole === 'student') {
        await supabase.from('students').delete().eq('id', userId);
      } else if (userRole === 'tutor') {
        await supabase.from('tutors').delete().eq('id', userId);
      }
    } catch (tableErr) {
      console.warn('Warning: Could not delete from role tables:', tableErr.message);
      // Continue anyway - the auth user will still be deleted
    }

    // Try to delete from users table (if it exists)
    try {
      await supabase.from('users').delete().eq('id', userId);
    } catch (tableErr) {
      console.warn('Warning: Could not delete from users table:', tableErr.message);
      // Continue anyway
    }

    // Delete from Supabase Auth (this is the critical part)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error('Error deleting user from auth:', deleteError);
      return res.status(500).json({ error: 'Failed to delete user: ' + deleteError.message });
    }

    console.log(`✅ User ${userEmail} deleted successfully`);
    return res.json({
      success: true,
      message: `User ${userEmail} has been deleted`
    });
  } catch (err) {
    console.error('Delete user error:', err);
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// List verified tutor requests for admin review
app.get('/api/admin/tutor-requests', requireAdmin, async (req, res) => {
  try {
    const { data: allUsers, error } = await supabase.auth.admin.listUsers();
    if (error) return res.status(500).json({ error: 'Failed to fetch users' });

    const tutors = (allUsers?.users || []).filter((u) => {
      const role = u.user_metadata?.role;
      return role === 'tutor' && !!(u.email_confirmed_at || u.raw_user_meta_data?.email_confirmed_at);
    });

    const tutorIds = tutors.map((t) => t.id);
    let tutorRows = [];
    if (tutorIds.length) {
      try {
        const { data: rows } = await supabase.from('tutors').select('*').in('id', tutorIds);
        tutorRows = rows || [];
      } catch (_) {
        tutorRows = [];
      }
    }

    const rowsById = Object.fromEntries(tutorRows.map((r) => [r.id, r]));
    const payload = tutors.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.user_metadata?.firstName || null,
      lastName: u.user_metadata?.lastName || null,
      submittedAt: u.email_confirmed_at || u.created_at,
      profile: rowsById[u.id] || null,
    }));

    res.json({ requests: payload });
  } catch (err) {
    console.error('tutor-requests error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reject a tutor request (delete from tables + auth)
app.post('/api/admin/tutor-requests/reject', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    // Fetch email and name first
    let toEmail = null, firstName = '';
    try {
      const { data: listData } = await supabase.auth.admin.listUsers();
      const authUser = (listData?.users || []).find(u => u.id === userId);
      toEmail = authUser?.email || null;
      firstName = authUser?.user_metadata?.firstName || '';
    } catch (_) {}

    // Send rejection email before deletion
    if (toEmail) {
      const subj = 'Tutor Match Application Update';
      const html = `
        <div style="font-family:Inter,system-ui,Segoe UI,Roboto,sans-serif;line-height:1.6">
          <h2 style=\"margin:0 0 8px;color:#111827\">Application Update</h2>
          <p>Dear ${firstName || 'Applicant'},</p>
          <p>Thank you for your interest in joining Tutor Match as a tutor. After careful review, we’re unable to move forward with your application at this time.</p>
          <p>We truly appreciate the time you took to apply. You’re welcome to strengthen your profile and reapply in the future.</p>
          <p>Wishing you all the best,<br/>Tutor Match Team</p>
        </div>`;
      const text = `Dear ${firstName || 'Applicant'},\n\nThank you for your interest in joining Tutor Match. After review, we’re unable to move forward at this time.\n\nWe appreciate your time. You’re welcome to reapply in the future.\n\nBest regards,\nTutor Match Team`;
      await sendAdminEmail(toEmail, subj, html, text);
    }

    // Delete from tables + auth
    try { await supabase.from('tutors').delete().eq('id', userId); } catch (_) {}
    try { await supabase.from('users').delete().eq('id', userId); } catch (_) {}
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) return res.status(500).json({ error: 'Failed to delete auth user: ' + error.message });

    res.json({ success: true });
  } catch (err) {
    console.error('reject tutor error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Accept a tutor request (mark as approved in auth metadata; optional no-op)
app.post('/api/admin/tutor-requests/accept', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    try {
      const { error } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: { tutorApproved: true },
      });
      if (error) console.warn('Failed to set tutorApproved metadata:', error.message);
    } catch (e) {
      console.warn('Could not update auth metadata for approval:', e?.message || e);
    }

    // Best-effort: also reflect in app tables if column exists
    try { await supabase.from('tutors').update({ approved: true }).eq('id', userId); } catch (_) {}
    try { await supabase.from('users').update({ approved: true }).eq('id', userId); } catch (_) {}

    // Send approval email with login link
    try {
      const { data: listData } = await supabase.auth.admin.listUsers();
      const authUser = (listData?.users || []).find(u => u.id === userId);
      const toEmail = authUser?.email || null;
      const firstName = authUser?.user_metadata?.firstName || '';
      if (toEmail) {
        const subj = 'Welcome to Tutor Match — Application Approved';
        const signinUrl = 'http://localhost:3000/Sign%20in/signin.html';
        const html = `
          <div style="font-family:Inter,system-ui,Segoe UI,Roboto,sans-serif;line-height:1.6">
            <h2 style=\"margin:0 0 8px;color:#111827\">Congratulations!</h2>
            <p>Dear ${firstName || 'Tutor'},</p>
            <p>Your tutor application has been approved. You can now log in and access your account.</p>
            <p><a href=\"${signinUrl}\" style=\"display:inline-block;background:#2563eb;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none\">Log In</a></p>
            <p>We’re excited to have you on board!<br/>Tutor Match Team</p>
          </div>`;
        const text = `Dear ${firstName || 'Tutor'},\n\nYour tutor application has been approved. You can now log in at: ${signinUrl}\n\nWelcome aboard!\nTutor Match Team`;
        await sendAdminEmail(toEmail, subj, html, text);
      }
    } catch (e) {
      console.warn('Approval email failed:', e?.message || e);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('accept tutor error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin dashboard stats: total users and unverified users
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    // Count directly from Auth to avoid drift with app tables
    const { data: allUsers } = await supabase.auth.admin.listUsers();
    const all = (allUsers?.users || []);
    const totalUsers = all.length;
    const blockedUsers = all.filter(u => u.user_metadata?.blocked === true).length;

    res.json({ totalUsers, blockedUsers, totalPosts: 0, removedPosts: 0 });
  } catch (err) {
    console.error('stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// -------------------- ADMIN: BLOCK / UNBLOCK USER --------------------
// Block a user account (prevent sign-in) and mark metadata
app.post('/api/admin/block-user', requireAdmin, async (req, res) => {
  try {
    const { userEmail, reason } = req.body || {};
    if (!userEmail || typeof userEmail !== 'string') {
      return res.status(400).json({ error: 'Missing userEmail' });
    }
    const targetEmail = userEmail.trim().toLowerCase();

    // Find auth user by email
    const { data: listData, error: listErr } = await supabase.auth.admin.listUsers();
    if (listErr) return res.status(500).json({ error: 'Failed to query users' });
    const authUser = (listData?.users || []).find(u => String(u.email || '').toLowerCase() === targetEmail);
    if (!authUser) return res.status(404).json({ error: 'User not found' });

    // Merge metadata and set blocked flag
    const newMeta = {
      ...(authUser.user_metadata || {}),
      blocked: true,
      blocked_reason: typeof reason === 'string' && reason.trim() ? reason.trim() : undefined,
      blocked_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase.auth.admin.updateUserById(authUser.id, {
      // Rely on user_metadata.flag and app-level checks for blocking
      user_metadata: newMeta,
    });
    if (updateError) {
      console.error('block-user update error:', updateError);
      return res.status(500).json({ error: 'Unable to block user' });
    }

    // Best-effort mirror to app table if present
    try { await supabase.from('users').update({ blocked: true, blocked_reason: newMeta.blocked_reason, blocked_at: newMeta.blocked_at }).eq('id', authUser.id); } catch (_) {}

    return res.json({ success: true });
  } catch (err) {
    console.error('block-user error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Unblock a user account
app.post('/api/admin/unblock-user', requireAdmin, async (req, res) => {
  try {
    const { userEmail } = req.body || {};
    if (!userEmail || typeof userEmail !== 'string') {
      return res.status(400).json({ error: 'Missing userEmail' });
    }
    const targetEmail = userEmail.trim().toLowerCase();

    const { data: listData, error: listErr } = await supabase.auth.admin.listUsers();
    if (listErr) return res.status(500).json({ error: 'Failed to query users' });
    const authUser = (listData?.users || []).find(u => String(u.email || '').toLowerCase() === targetEmail);
    if (!authUser) return res.status(404).json({ error: 'User not found' });

    const newMeta = { ...(authUser.user_metadata || {}) };
    // Explicitly clear flags. Some GoTrue versions ignore deleted keys.
    newMeta.blocked = false;
    newMeta.blocked_reason = null;
    newMeta.blocked_at = null;

    const { error: updateError } = await supabase.auth.admin.updateUserById(authUser.id, {
      user_metadata: newMeta,
    });
    if (updateError) {
      console.error('unblock-user update error:', updateError);
      return res.status(500).json({ error: 'Unable to unblock user' });
    }

    // Mirror to app table
    try { await supabase.from('users').update({ blocked: false, blocked_reason: null, blocked_at: null }).eq('id', authUser.id); } catch (_) {}

    return res.json({ success: true });
  } catch (err) {
    console.error('unblock-user error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Delete the currently logged-in user's account (self-service)
app.post('/api/account/delete', async (req, res) => {
  try {
    const { userId } = req.body || {};
    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      return res.status(400).json({ error: 'Missing or invalid userId' });
    }

    // Best-effort delete from app tables
    try {
      await supabase.from('students').delete().eq('id', userId);
    } catch (e) {
      console.warn('Warning: Could not delete from students table:', e?.message || e);
    }
    try {
      await supabase.from('tutors').delete().eq('id', userId);
    } catch (e) {
      console.warn('Warning: Could not delete from tutors table:', e?.message || e);
    }
    try {
      await supabase.from('users').delete().eq('id', userId);
    } catch (e) {
      console.warn('Warning: Could not delete from users table:', e?.message || e);
    }

    // Delete from Supabase Auth (critical)
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) {
      console.error('Error deleting auth user:', error);
      return res.status(500).json({ error: 'Failed to delete account: ' + error.message });
    }

    return res.json({ success: true, message: 'Account deleted' });
  } catch (err) {
    console.error('Self account delete error:', err);
    return res.status(500).json({ error: 'Server error: ' + (err?.message || String(err)) });
  }
});

// Lightweight status endpoint for clients to verify if account is blocked
app.get('/api/account/status', async (req, res) => {
  try {
    const userId = (req.query?.userId || '').toString().trim();
    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error || !data?.user) return res.status(404).json({ error: 'User not found' });
    const u = data.user;
    const blocked = u.user_metadata?.blocked === true;
    const reason = u.user_metadata?.blocked_reason || null;
    return res.json({ blocked, reason });
  } catch (err) {
    console.error('account status error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

const ensureDirectory = async (dirPath) => {
  try {
    await fs.promises.mkdir(dirPath, { recursive: true });
  } catch (err) {
    if (err && err.code !== "EEXIST") {
      throw err;
    }
  }
};

const savePhotoLocally = async (buffer, originalName) => {
  await ensureDirectory(LOCAL_PROFILE_DIR);

  const rawName = path.basename(originalName, path.extname(originalName));
  const safeBase = rawName.replace(/[^a-z0-9_-]/gi, "") || "avatar";
  const ext = (path.extname(originalName) || ".png").toLowerCase();
  const filename = `${Date.now()}_${safeBase}${ext}`;
  const destinationPath = path.join(LOCAL_PROFILE_DIR, filename);

  await fs.promises.writeFile(destinationPath, buffer);
  return `/uploads/profile/${filename}`;
};

const deleteLocalProfilePhoto = async (avatarPath) => {
  if (
    !avatarPath ||
    typeof avatarPath !== "string" ||
    !avatarPath.startsWith("/uploads/profile/")
  ) {
    return;
  }

  const filePart = avatarPath.replace("/uploads/profile/", "");
  if (!filePart) return;

  const safePart = filePart.replace(/[^a-zA-Z0-9._-]/g, "");
  if (!safePart) return;

  const absolutePath = path.join(LOCAL_PROFILE_DIR, safePart);
  try {
    await fs.promises.unlink(absolutePath);
  } catch (err) {
    if (err && err.code !== "ENOENT") {
      console.warn("Failed to delete previous local profile photo:", err);
    }
  }
};

// Upload a local temp file (multer) to Supabase Storage and return a public or fallback URL
async function uploadToSupabaseStorage(file, folder) {
  const buffer = fs.readFileSync(file.path);
  const originalName = file.originalname || "upload.bin";
  const sanitizedOriginal = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const safeOriginal = sanitizedOriginal || "upload.bin";
  const uniqueName = `${folder}/${Date.now()}_${safeOriginal}`;

  const attemptSupabaseUpload = async () => {
    const result = await supabase.storage
      .from(TUTOR_UPLOAD_BUCKET)
      .upload(uniqueName, buffer, {
        contentType: file.mimetype || "application/octet-stream",
        upsert: false,
      });

    if (result.error) {
      return { success: false, error: result.error };
    }

    const { data: publicUrl, error: urlError } = supabase.storage
      .from(TUTOR_UPLOAD_BUCKET)
      .getPublicUrl(uniqueName);

    if (urlError || !publicUrl?.publicUrl) {
      return { success: false, error: urlError };
    }

    return { success: true, url: publicUrl.publicUrl };
  };

  try {
    let uploadResult = await attemptSupabaseUpload();

    if (!uploadResult.success) {
      const message = (uploadResult.error?.message || "").toLowerCase();

      if (message.includes("bucket") && message.includes("not found")) {
        const { error: createError } = await supabase.storage.createBucket(
          TUTOR_UPLOAD_BUCKET,
          { public: true }
        );

        if (
          createError &&
          !/(already exists|exists)/i.test(createError.message || "")
        ) {
          throw uploadResult.error || createError;
        }

        uploadResult = await attemptSupabaseUpload();
      }
    }

    if (uploadResult.success) {
      return uploadResult.url;
    }

    throw uploadResult.error;
  } catch (err) {
    console.warn(
      "Supabase storage upload failed, falling back to local storage:",
      err
    );
    return await savePhotoLocally(buffer, safeOriginal);
  } finally {
    try {
      fs.unlinkSync(file.path);
    } catch (_) {}
  }
}

// -------------------- ROUTES --------------------
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "../frontend/Homepage/home.html")));
app.get("/verified", (req, res) => res.sendFile(path.join(__dirname, "../frontend/verified.html")));
// Tutor verification landing page (pending review)
app.get("/tutor-review", (req, res) =>
  res.sendFile(path.join(__dirname, "../frontend/Tutor Page/pending-review.html"))
);
// ✅ RESET PASSWORD PAGE
app.get("/reset-password", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/reset-password.html"));
});
// ✅ Check if tutor exists by email
app.get("/api/tutor-exists", async (req, res) => {
  const email = req.query.email;
  if (!email) return res.json({ found: false });

  const { data, error } = await supabase
    .from("tutors")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (error || !data) return res.json({ found: false });
  res.json({ found: true });
});
// ❌ Delete unauthorized Google user (requires service_role on server)
app.post("/api/delete-auth-user", async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "Missing user ID" });

    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) throw error;

    res.json({ message: "Unauthorized user deleted" });
  } catch (err) {
    console.error("Auth user deletion failed:", err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});


// ✅ 1) Start Google OAuth
app.get("/auth/google", (req, res) => {
  const redirectTo = "http://localhost:3000/auth/callback";
  const prompt = req.query.prompt || "none"; // default = none
  const url = `${process.env.SUPABASE_URL}/auth/v1/authorize?provider=google&prompt=${prompt}&redirect_to=${encodeURIComponent(redirectTo)}`;
  console.log("Redirecting to:", url);
  res.redirect(url);
});

// ✅ 2) Serve the callback page
app.get("/auth/callback", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/auth-callback.html"));
});

// -------------------- STUDENT SIGNUP --------------------
app.post("/api/signup/student", async (req, res) => {
  try {
    const { email, password, firstName, lastName, birthdate, phone, studentId, currentYear, major, gpa } = req.body;

    // 1️⃣ Create Auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role: "student", firstName, lastName, birthdate, phone, studentId, currentYear, major, gpa },
        emailRedirectTo: "http://localhost:3000/verified",
      },
    });

    if (authError) return res.status(400).json({ error: authError.message });

    const userId = authData.user?.id;
    if (!userId) return res.status(500).json({ error: "User ID not returned from Supabase Auth" });

    // 2️⃣ Insert into users table
    const { error: userError } = await supabase.from("users").insert([
      { id: userId, email, role: "student", firstName, lastName, birthdate, phone },
    ]);
    if (userError) console.error("❌ Error inserting into users table:", userError);

    // 3️⃣ Insert into students table
    const { error: studentError } = await supabase.from("students").insert([
      { id: userId, studentId, currentYear, major, gpa, firstName, lastName, birthdate, phone },
    ]);
    if (studentError) console.error("❌ Error inserting into students table:", studentError);

    res.status(200).json({ message: "Student account created. Check your email to verify.", data: authData });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// -------------------- TUTOR SIGNUP --------------------
app.post(
  "/api/signup/tutor",
  upload.fields([{ name: "passportPhoto" }, { name: "certificate" }]),
  async (req, res) => {
    try {
      // ✅ Text fields (multipart -> strings)
      const {
        email,
        password,
        firstName,
        lastName,
        birthdate,
        phone,
        major,
        degree,
        gpa,
        experience,
        motivation,
        format,
        availability,
      } = req.body;

      // ✅ Parse subjects from JSON string
      let subjects = [];
      try {
        subjects = JSON.parse(req.body.subjects || "[]");
      } catch {}

      // ✅ Handle uploaded files
      const passportFile = req.files?.passportPhoto?.[0];
      const certificateFile = req.files?.certificate?.[0];

      if (!passportFile || !certificateFile) {
        return res.status(400).json({ error: "Passport and certificate are required." });
      }

      // ✅ 1️⃣ Create Auth user in Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: "tutor",
            firstName,
            lastName,
            birthdate,
            phone,
            major,
            degree,
            gpa,
            subjects,
            experience,
            motivation,
            format,
            availability,
          },
          // After verifying email, send tutors to a pending review page
          emailRedirectTo: "http://localhost:3000/tutor-review",
        },
      });

      if (error) return res.status(400).json({ error: error.message });

      const userId = data.user?.id;
      if (!userId)
        return res.status(500).json({ error: "User ID not returned from Supabase Auth" });

      // ✅ 2️⃣ Upload files to Supabase Storage
      let passportUrl = null;
      let certificateUrl = null;

      try {
        passportUrl = await uploadToSupabaseStorage(passportFile, "passport");
        certificateUrl = await uploadToSupabaseStorage(certificateFile, "certificate");
      } catch (uploadErr) {
        console.error("Upload error:", uploadErr);
        return res.status(500).json({ error: "File upload failed." });
      }

      // ✅ 3️⃣ Insert into users table
      const { error: userError } = await supabase.from("users").insert([
        {
          id: userId,
          email,
          role: "tutor",
          firstName,
          lastName,
          birthdate,
          phone,
        },
      ]);
      if (userError) console.error("❌ Error inserting into users table:", userError);

      // ✅ 4️⃣ Insert into tutors table with file URLs
      const { error: tutorError } = await supabase.from("tutors").insert([
        {
          id: userId,
          email,
          major,
          degree,
          gpa: gpa || null,
          subjects,
          experience: experience || null,
          motivation,
          format,
          availability,
          firstName,
          lastName,
          birthdate,
          phone,
          passportPhoto: passportUrl,  // ✅ Save URLs
          certificate: certificateUrl, // ✅ Save URLs
          approved: false,            // ✅ start as pending
        },
      ]);
      if (tutorError) console.error("❌ Error inserting into tutors table:", tutorError);

      // ✅ Success response
      res.status(200).json({
        message: "Tutor account created. Check your email to verify.",
        data,
      });
    } catch (err) {
      console.error("Signup error:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);
// -------------------- LOGIN (ADMIN + STUDENT + TUTOR) --------------------
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1️⃣ Try to sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data?.user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const user = data.user;

    // 2️⃣ ADMIN SHORTCUT
    if (user.email === "admintm01@proton.me") {
      return res.status(200).json({
        message: "Admin login successful",
        role: "admin",
        userId: user.id,
        email: user.email,
      });
    }

    // 3️⃣ Block unverified non-admin accounts
    if (!user.email_confirmed_at) {
      return res.status(403).json({ error: "Please verify your email first." });
    }

    // 4️⃣ Normal user (tutor/student)
    // Blocked account check
    if (user.user_metadata && user.user_metadata.blocked === true) {
      const reason = user.user_metadata.blocked_reason || "Your account has been blocked by an administrator.";
      return res.status(403).json({ error: reason });
    }
    const role = user.user_metadata?.role || "unknown";

    // ✅ Tutors must be approved by admin first
if (role === "tutor" && user.user_metadata?.tutorApproved !== true) {
  return res.status(403).json({ error: "Your tutor application is pending admin approval." });
}


    res.status(200).json({
      message: "Login successful!",
      role,
      userId: user.id,
      email: user.email,
      passwordUpdatedAt: user.password_updated_at || null,
      profile: {
        firstName: user.user_metadata?.firstName || "",
        lastName: user.user_metadata?.lastName || "",
        birthdate: user.user_metadata?.birthdate || "",
        phone: user.user_metadata?.phone || "",
        studentId: user.user_metadata?.studentId || "",
        currentYear: user.user_metadata?.currentYear || "",
        major: user.user_metadata?.major || "",
        gpa: user.user_metadata?.gpa || "",
        degree: user.user_metadata?.degree || "",
        subjects: user.user_metadata?.subjects || [],
        motivation: user.user_metadata?.motivation || "",
        format: user.user_metadata?.format || "",
        availability: user.user_metadata?.availability || "",
        avatarUrl: user.user_metadata?.avatarUrl || "",
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// -------------------- CHANGE PASSWORD --------------------
app.post("/api/change-password", async (req, res) => {
  const { userId, email, currentPassword, newPassword } = req.body || {};

  if (
    !userId ||
    !email ||
    typeof currentPassword !== "string" ||
    typeof newPassword !== "string"
  ) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  if (newPassword.length < 8) {
    return res
      .status(400)
      .json({ error: "Password must be at least 8 characters long." });
  }

  if (currentPassword === newPassword) {
    return res
      .status(400)
      .json({ error: "New password must be different from current password." });
  }

  const authClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  try {
    const { error: verifyError } = await authClient.auth.signInWithPassword({
      email,
      password: currentPassword,
    });

    if (verifyError) {
      return res
        .status(401)
        .json({ error: "Current password is incorrect." });
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Password update failed:", updateError);
      return res.status(500).json({ error: "Unable to update password." });
    }

    const passwordUpdatedAt = new Date().toISOString();

    return res.json({
      message: "Password updated successfully.",
      passwordUpdatedAt,
    });
  } catch (err) {
    console.error("change-password error:", err);
    return res
      .status(500)
      .json({ error: "Server error while updating password." });
  } finally {
    try {
      await authClient.auth.signOut();
    } catch (signOutErr) {
      console.warn(
        "Unable to clear auth session after password change",
        signOutErr
      );
    }
  }
});

// Simpler password change (no current password required) for logged-in users
app.post("/api/change-password/simple", async (req, res) => {
  try {
    const { userId, newPassword } = req.body || {};
    if (!userId || typeof newPassword !== "string") {
      return res.status(400).json({ error: "Missing required fields." });
    }
    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters long." });
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Password update failed:", updateError);
      return res.status(500).json({ error: "Unable to update password." });
    }

    const passwordUpdatedAt = new Date().toISOString();
    return res.json({ message: "Password updated successfully.", passwordUpdatedAt });
  } catch (err) {
    console.error("simple change-password error:", err);
    return res.status(500).json({ error: "Server error while updating password." });
  }
});

// Update phone number for either student or tutor
app.post("/api/profile/phone", async (req, res) => {
  try {
    const { userId, email, phone } = req.body || {};
    if (!userId || !email || typeof phone !== "string") {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const trimmedPhone = phone.trim();
    if (!trimmedPhone) return res.status(400).json({ error: "Invalid phone number." });

    // Fetch user to determine role
    const { data: userLookup, error: lookupErr } = await supabase.auth.admin.getUserById(userId);
    if (lookupErr || !userLookup?.user) return res.status(404).json({ error: "User not found" });
    const role = userLookup.user.user_metadata?.role;

    // Update auth metadata
    const updatedMetadata = { ...(userLookup.user.user_metadata || {}), phone: trimmedPhone };
    const { error: authErr } = await supabase.auth.admin.updateUserById(userId, {
      email,
      user_metadata: updatedMetadata,
    });
    if (authErr) return res.status(500).json({ error: "Failed to update auth profile" });

    // Update users table
    try { await supabase.from('users').update({ phone: trimmedPhone }).eq('id', userId); } catch (_) {}

    // Update role table
    if (role === 'student') {
      try { await supabase.from('students').update({ phone: trimmedPhone }).eq('id', userId); } catch (_) {}
    } else if (role === 'tutor') {
      try { await supabase.from('tutors').update({ phone: trimmedPhone }).eq('id', userId); } catch (_) {}
    }

    return res.json({ success: true, phone: trimmedPhone });
  } catch (err) {
    console.error('update phone error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// -------------------- UPDATE STUDENT PROFILE PHOTO --------------------
app.post(
  "/api/students/profile/photo",
  upload.single("photo"),
  async (req, res) => {
    try {
      const userId = (req.body?.userId || "").trim();
      if (!userId) {
        return res.status(400).json({ error: "Missing user ID." });
      }

      const photoFile = req.file;
      if (!photoFile) {
        return res.status(400).json({ error: "No photo provided." });
      }

      if (!photoFile.mimetype || !photoFile.mimetype.startsWith("image/")) {
        return res
          .status(400)
          .json({ error: "Only image uploads are supported." });
      }

      const { data: userLookup, error: lookupError } =
        await supabase.auth.admin.getUserById(userId);
      if (lookupError || !userLookup?.user) {
        console.error("Unable to fetch user for photo update:", lookupError);
        return res.status(404).json({ error: "Student not found." });
      }

      const authUser = userLookup.user;
      const metadata = authUser.user_metadata || {};
      const previousAvatar =
        typeof metadata.avatarUrl === "string" ? metadata.avatarUrl.trim() : "";
      if (metadata.role && metadata.role !== "student") {
        return res
          .status(403)
          .json({ error: "Only students can update this photo." });
      }

      let photoUrl;
      try {
        photoUrl = await uploadToSupabaseStorage(photoFile, `students/${userId}`);
      } catch (uploadErr) {
        console.error("Photo upload failed:", uploadErr);
        return res.status(500).json({ error: "Unable to store profile photo." });
      }

      const updatedMetadata = {
        ...metadata,
        avatarUrl: photoUrl,
      };

      const { error: updateError } = await supabase.auth.admin.updateUserById(
        userId,
        { user_metadata: updatedMetadata }
      );

      if (updateError) {
        console.error("Failed to persist photo metadata:", updateError);
        return res
          .status(500)
          .json({ error: "Unable to update profile photo metadata." });
      }

      if (previousAvatar && previousAvatar !== photoUrl) {
        try {
          await deleteLocalProfilePhoto(previousAvatar);
        } catch (cleanupErr) {
          console.warn(
            "Unable to clean up previous local profile photo:",
            cleanupErr
          );
        }
      }

      return res.json({
        message: "Profile photo updated successfully.",
        photoUrl,
      });
    } catch (err) {
      console.error("Profile photo update error:", err);
      return res
        .status(500)
        .json({ error: "Unexpected error while updating photo." });
    }
  }
);

// -------------------- GENERATE AND SEND LOGIN OTP --------------------
import crypto from "crypto";

const otpStore = new Map(); // temp in-memory store (email -> code)

app.post("/api/login-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });

    // Generate random 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(email, code);
    setTimeout(() => otpStore.delete(email), 5 * 60 * 1000); // expire after 5 min

    // Configure mailer
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Tutor Match" <${process.env.EMAIL_USER}>`,
      to: email,
     subject: "Tutor Match Login Verification Code",
     text: `Hello!\n\nYour login code is ${code}. It expires in 5 minutes.\n\nIf you didn’t request this, please ignore this email.\n\n– Tutor Match Team`,

    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "Code sent successfully" });
    console.log(`✅ Code sent to ${email}: ${code}`);

  } catch (err) {
    console.error("OTP send error:", err);
    res.status(500).json({ error: "Failed to send code" });
  }
});

// -------------------- VERIFY LOGIN OTP --------------------
app.post("/api/verify-otp", (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: "Missing fields" });

  const stored = otpStore.get(email);
  if (!stored) return res.status(400).json({ error: "Code expired or not found" });
  if (stored !== code) return res.status(401).json({ error: "Incorrect code" });

  otpStore.delete(email);
  res.status(200).json({ message: "OTP verified" });
});

// -------------------- FETCH STUDENT PROFILE --------------------
app.get("/api/students/profile/:userId", async (req, res) => {
  try {
    const userId = (req.params.userId || "").trim();
    if (!userId) {
      return res.status(400).json({ error: "Missing user ID." });
    }

    const { data: userLookup, error: userLookupError } = await supabase.auth.admin.getUserById(userId);
    if (userLookupError || !userLookup?.user) {
      console.error("Failed to fetch auth user for profile lookup:", userLookupError);
      return res.status(404).json({ error: "Student not found." });
    }

    const authUser = userLookup.user;
    const metadata = authUser.user_metadata || {};

    if (metadata.role && metadata.role !== "student") {
      return res.status(403).json({ error: "Only students can access this profile." });
    }

    const { data: userRow, error: userRowError } = await supabase
      .from("users")
      .select("firstName,lastName,birthdate,phone")
      .eq("id", userId)
      .maybeSingle();

    if (userRowError) {
      console.warn("Unable to read users table for profile:", userRowError);
    }

    const { data: studentRow, error: studentRowError } = await supabase
      .from("students")
      .select("studentId,currentYear,major,gpa,phone,firstName,lastName,birthdate")
      .eq("id", userId)
      .maybeSingle();

    if (studentRowError) {
      console.warn("Unable to read students table for profile:", studentRowError);
    }

    const pickFirstString = (...values) => {
      for (const value of values) {
        if (typeof value === "string" && value.trim()) {
          return value.trim();
        }
      }
      return "";
    };

    const resolveGpa = () => {
      const candidates = [metadata.gpa, studentRow?.gpa];
      for (const value of candidates) {
        if (value === null || value === undefined) continue;
        if (typeof value === "number") return value;
        if (typeof value === "string" && value.trim()) {
          const parsed = Number(value);
          return Number.isNaN(parsed) ? value.trim() : parsed;
        }
      }
      return "";
    };

    const normalizeSubjects = Array.isArray(metadata.subjects)
      ? metadata.subjects
          .map((subject) => (typeof subject === "string" ? subject.trim() : ""))
          .filter(Boolean)
      : [];

    const profile = {
      firstName: pickFirstString(metadata.firstName, studentRow?.firstName, userRow?.firstName),
      lastName: pickFirstString(metadata.lastName, studentRow?.lastName, userRow?.lastName),
      birthdate: pickFirstString(metadata.birthdate, studentRow?.birthdate, userRow?.birthdate),
      phone: pickFirstString(metadata.phone, studentRow?.phone, userRow?.phone),
      studentId: pickFirstString(metadata.studentId, studentRow?.studentId),
      currentYear: pickFirstString(metadata.currentYear, studentRow?.currentYear),
      major: pickFirstString(metadata.major, studentRow?.major),
      university: pickFirstString(metadata.university),
      gpa: resolveGpa(),
      subjects: normalizeSubjects,
      avatarUrl: pickFirstString(metadata.avatarUrl),
    };

    return res.status(200).json({
      userId,
      email: authUser.email,
      passwordUpdatedAt: authUser.password_updated_at || null,
      profile,
    });
  } catch (err) {
    console.error("Unexpected error fetching student profile:", err);
    res.status(500).json({ error: "Failed to load student profile." });
  }
});

// -------------------- UPDATE STUDENT PROFILE --------------------
app.put("/api/students/profile", async (req, res) => {
  try {
    const {
      userId,
      email,
      firstName,
      lastName,
      phone,
      university,
      major,
      currentYear,
      studentId,
      subjects,
    } = req.body || {};

    if (!userId) {
      return res.status(401).json({ error: "Missing user ID." });
    }

    const trimmedEmail = typeof email === "string" ? email.trim() : "";
    if (!trimmedEmail) {
      return res.status(400).json({ error: "Email is required." });
    }

    const resolvedFirst = typeof firstName === "string" ? firstName.trim() : "";
    const resolvedLast = typeof lastName === "string" ? lastName.trim() : "";
    if (!resolvedFirst) {
      return res.status(400).json({ error: "First name is required." });
    }

    const { data: existingUser, error: fetchError } = await supabase.auth.admin.getUserById(userId);
    if (fetchError || !existingUser?.user) {
      console.error("Unable to fetch user before update:", fetchError);
      return res.status(404).json({ error: "Student not found." });
    }

    const currentMetadata = existingUser.user.user_metadata || {};
    if (currentMetadata.role && currentMetadata.role !== "student") {
      return res.status(403).json({ error: "Only students can update this profile." });
    }

    const normalizedSubjects = Array.isArray(subjects)
      ? Array.from(
          new Set(
            subjects
              .map((subj) => (typeof subj === "string" ? subj.trim() : ""))
              .filter(Boolean)
          )
        )
      : [];

    const updatedMetadata = {
      ...currentMetadata,
      firstName: resolvedFirst,
      lastName: resolvedLast,
      phone: typeof phone === "string" ? phone.trim() : currentMetadata.phone || "",
      university: typeof university === "string" ? university.trim() : currentMetadata.university || "",
      major: typeof major === "string" ? major.trim() : currentMetadata.major || "",
      currentYear: typeof currentYear === "string" ? currentYear.trim() : currentMetadata.currentYear || "",
      studentId: typeof studentId === "string" ? studentId.trim() : currentMetadata.studentId || "",
      subjects: normalizedSubjects,
    };

    const adminPayload = {
      email: trimmedEmail,
      user_metadata: updatedMetadata,
    };

    const { error: adminError } = await supabase.auth.admin.updateUserById(userId, adminPayload);
    if (adminError) {
      console.error("Failed to update auth user:", adminError);
      return res.status(500).json({ error: "Failed to update authentication profile." });
    }

    const userUpdates = {};
    if (trimmedEmail) userUpdates.email = trimmedEmail;
    if (resolvedFirst) userUpdates.firstName = resolvedFirst;
    userUpdates.lastName = resolvedLast;
    if (typeof phone === "string") userUpdates.phone = phone.trim();

    if (Object.keys(userUpdates).length > 0) {
      const { error: userTableError } = await supabase.from("users").update(userUpdates).eq("id", userId);
      if (userTableError) {
        console.error("Failed to update users table:", userTableError);
        return res.status(500).json({ error: "Failed to update user record." });
      }
    }

    const studentUpdates = {};
    if (resolvedFirst) studentUpdates.firstName = resolvedFirst;
    studentUpdates.lastName = resolvedLast;
    if (typeof phone === "string") studentUpdates.phone = phone.trim();
    if (typeof major === "string") studentUpdates.major = major.trim();
    if (typeof currentYear === "string") studentUpdates.currentYear = currentYear.trim();
    if (typeof studentId === "string" && studentId.trim()) {
      studentUpdates.studentId = studentId.trim();
    }

    if (Object.keys(studentUpdates).length > 0) {
      const { error: studentTableError } = await supabase.from("students").update(studentUpdates).eq("id", userId);
      if (studentTableError) {
        console.error("Failed to update students table:", studentTableError);
        return res.status(500).json({ error: "Failed to update academic record." });
      }
    }

    const mergedProfile = {
      firstName: updatedMetadata.firstName || "",
      lastName: updatedMetadata.lastName || "",
      phone: updatedMetadata.phone || "",
      university: updatedMetadata.university || "",
      major: updatedMetadata.major || "",
      currentYear: updatedMetadata.currentYear || "",
      studentId: updatedMetadata.studentId || "",
      subjects: updatedMetadata.subjects || [],
      birthdate: updatedMetadata.birthdate || "",
      gpa: updatedMetadata.gpa || "",
      avatarUrl: updatedMetadata.avatarUrl || "",
    };

    return res.status(200).json({
      message: "Profile updated successfully.",
      userId,
      email: trimmedEmail,
      profile: mergedProfile,
    });
  } catch (err) {
    console.error("Unexpected profile update error:", err);
    res.status(500).json({ error: "Unexpected server error." });
  }
});

// ✅✅✅ ADD THIS BLOCK — PUBLIC TUTORS BROWSING (students) ✅✅✅

// PUBLIC: list tutors with optional filters (subjects as jsonb array)
app.get('/api/tutors', async (req, res) => {
  try {
    const { subject, search } = req.query;

let q = supabase.from('tutors').select('*');

// ✅ Only show approved tutors publicly
q = q.eq('approved', true);

    // If you have an 'approved' column and want to show only approved tutors:
    // q = q.eq('approved', true);

    // SUBJECT filter (expects tutors.subjects to be jsonb array)
    if (subject && String(subject).trim()) {
      q = q.contains('subjects', [String(subject).trim()]);
    }

    const { data, error } = await q;
    if (error) return res.status(400).json({ error: error.message });

    let tutors = data || [];

    // free-text search over name or subjects
    if (search && String(search).trim()) {
      const s = String(search).trim().toLowerCase();
      tutors = tutors.filter(t => {
        const name = `${t.firstName || ''} ${t.lastName || ''}`.toLowerCase();
        const subs = Array.isArray(t.subjects)
          ? t.subjects.join(', ').toLowerCase()
          : String(t.subjects || '').toLowerCase();
        return name.includes(s) || subs.includes(s);
      });
    }

    res.json({ tutors });
  } catch (err) {
    console.error('list tutors error:', err);
    return res.status(500).json({ error: 'Failed to load tutors' });
  }
});


// GET /api/tutors/:id -> tutor profile details
app.get('/api/tutors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('tutors')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return res.status(404).json({ error: 'Tutor not found' });

    res.json({ tutor: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load tutor' });
  }
});

// -------------------- FETCH TUTOR PROFILE --------------------
app.get("/api/tutors/profile/:userId", async (req, res) => {
  try {
    const userId = (req.params.userId || "").trim();
    if (!userId) return res.status(400).json({ error: "Missing user ID." });

    const { data, error } = await supabase
      .from("tutors")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) {
      console.error("Tutor lookup error:", error);
      return res.status(404).json({ error: "Tutor not found." });
    }

    res.status(200).json({ tutor: data });
  } catch (err) {
    console.error("Error fetching tutor profile:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// -------------------- EMAIL VERIFIED WEBHOOK --------------------
app.post("/api/webhook/auth", async (req, res) => {
  try {
    const event = req.body;
    console.log("Webhook received:", event);

    if (event.type === "USER_UPDATED" && event.user?.email_confirmed_at) {
      const user = event.user;
      const meta = user.user_metadata;
      const role = meta.role;

      // Insert into users table
      const { error: userError } = await supabase.from("users").upsert([
        {
          id: user.id,
          email: user.email,
          role,
          firstName: meta.firstName,
          lastName: meta.lastName,
          birthdate: meta.birthdate,
          phone: meta.phone,
        },
      ]);
      if (userError) console.error("❌ Error inserting into users:", userError);

      // Role-specific inserts
      const commonData = {
        id: user.id,
        firstName: meta.firstName,
        lastName: meta.lastName,
        birthdate: meta.birthdate,
        phone: meta.phone,
      };

      if (role === "student") {
        const { error } = await supabase.from("students").upsert([
          {
            ...commonData,
            studentId: meta.studentId,
            currentYear: meta.currentYear,
            major: meta.major,
            gpa: meta.gpa,
          },
        ]);
        if (error) console.error("❌ Error inserting student:", error);
      }

      if (role === "tutor") {
        const { error } = await supabase.from("tutors").upsert([
          {
            ...commonData,
            email: user.email,
            major: meta.major,
            degree: meta.degree,
            gpa: meta.gpa,
            subjects: meta.subjects,
            experience: meta.experience,
            motivation: meta.motivation,
            format: meta.format,
            availability: meta.availability,
          },
        ]);
        if (error) console.error("❌ Error inserting tutor:", error);
      }
    }

    res.status(200).json({ message: "Webhook processed successfully" });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`)); 




// -------------------- CLEANUP UNVERIFIED USERS --------------------
async function deleteUnverifiedUsers() {
  try {
    // Fetch all users via admin API
    const { data: allUsers, error } = await supabase.auth.admin.listUsers();
    if (error) {
      console.error("Error fetching users:", error);
      return;
    }

    // Filter unverified users older than 1 minute (for testing)
    const unverifiedUsers = allUsers.users.filter(
      user =>
        !user.email_confirmed_at &&
        new Date(user.created_at) < new Date(Date.now() - 1 * 60 * 1000)
    );

    console.log("Unverified users to delete:", unverifiedUsers);

    for (const user of unverifiedUsers) {
      const role = user.user_metadata?.role;

      // Delete role-specific table rows
      if (role === "student") await supabase.from("students").delete().eq("id", user.id);
      if (role === "tutor") await supabase.from("tutors").delete().eq("id", user.id);

      // Delete from users table
      await supabase.from("users").delete().eq("id", user.id);

      // Delete from Supabase Auth
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
      if (deleteError) console.error("Error deleting user from auth:", deleteError);
      else console.log("Deleted user from auth:", user.email);
    }
  } catch (err) {
    console.error("Error deleting unverified users:", err);
  }
}

// Schedule to run every minute (for testing)
cron.schedule("0 * * * *", () => {
  console.log("Running cleanup job for unverified users...");
  deleteUnverifiedUsers();
});
