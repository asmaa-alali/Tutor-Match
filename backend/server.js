
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
// -------------------- LOGIN (STUDENT + TUTOR) --------------------
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1) Try to sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data?.user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const user = data.user;

    // 2) Block unverified accounts
    if (!user.email_confirmed_at) {
      return res.status(403).json({ error: "Please verify your email first." });
    }

    // 3) Read role from metadata
    const role = user.user_metadata?.role || "unknown";

    // 4) Send role + id for redirect on frontend
    res.status(200).json({
      message: "Login successful!",
      role,
      userId: user.id,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
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
cron.schedule("* * * * *", () => {
  console.log("Running cleanup job for unverified users...");
  deleteUnverifiedUsers();
});
