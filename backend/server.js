
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 3000;

// -------------------- SUPABASE --------------------
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY )

app.use(express.json());
app.use(cors());
const upload = multer({ dest: "uploads/" });
app.use("/", express.static(path.join(__dirname, "../frontend")));
// Upload a local temp file (multer) to Supabase Storage and return a public URL
async function uploadToSupabaseStorage(file, folder) {
  const buffer = fs.readFileSync(file.path);
  const uniqueName = `${folder}/${Date.now()}_${file.originalname}`;

  const { data, error } = await supabase
    .storage
    .from("tutor_uploads")          // <-- make sure this bucket exists
    .upload(uniqueName, buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  // remove temp file regardless of upload success
  try { fs.unlinkSync(file.path); } catch (e) {}

  if (error) throw error;

  const { data: publicUrl } = supabase
    .storage
    .from("tutor_uploads")
    .getPublicUrl(uniqueName);

  return publicUrl.publicUrl; // string
}

// -------------------- ROUTES --------------------
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "../frontend/Homepage/home.html")));
app.get("/verified", (req, res) => res.sendFile(path.join(__dirname, "../frontend/verified.html")));
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
          emailRedirectTo: "http://localhost:3000/verified",
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
    const role = user.user_metadata?.role || "unknown";

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

// -------------------- GENERATE AND SEND LOGIN OTP --------------------
import crypto from "crypto";
import nodemailer from "nodemailer";

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
