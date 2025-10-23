// backend/server.js
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Serve each frontend folder as static
// Serve entire frontend at root so relative links to CSS/JS work
app.use('/', express.static(path.join(__dirname, '../frontend'), { maxAge: 0 }));

// keep legacy /static alias
app.use('/static', express.static(path.join(__dirname, '../frontend'), { maxAge: 0 }));

// HTML routes
app.get("/", (req, res) => res.sendFile(path.join(__dirname, '../frontend/Homepage/home.html')));
app.get("/Homepage/home.html", (req, res) => 
  res.sendFile(path.join(__dirname, '../frontend/Homepage/home.html')));
app.get("/signin", (req, res) => res.sendFile(path.join(__dirname, '../frontend/Sign in/signin.html')));
app.get("/forgot-password", (req, res) => res.sendFile(path.join(__dirname, '../frontend/Sign in/forgot-password.html')));
app.get("/sign-up", (req, res) => res.sendFile(path.join(__dirname, '../frontend/Sign Up/sign-up.html')));
app.get("/student-account", (req, res) => res.sendFile(path.join(__dirname, '../frontend/Sign Up/student-account.html')));
app.get("/tutor-signup", (req, res) => res.sendFile(path.join(__dirname, '../frontend/Sign Up/tutorsignup.html')));
app.get("/FindTutor", (req, res) => res.sendFile(path.join(__dirname, '../frontend/FindTutor/find-tutor.html')));
app.get("/Contact", (req, res) => res.sendFile(path.join(__dirname, "../frontend/Contact/contact.html"))
);


// Add more routes as needed...

// Start server
app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
