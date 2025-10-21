// backend/server.js
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import { supabaseServer } from './supabaseServerClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

// Serve all static assets (CSS, JS, images, etc.)
app.use('/static', express.static(path.join(__dirname, '../frontend')));

// -------- ROUTES TO HTML PAGES --------

// Homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/Homepage/home.html'));
});

// Sign in + Forgot password
app.get('/signin', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/Sign in/signin.html'));
});

app.get('/forgot-password', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/Sign in/forgot-password.html'));
});

// Sign up
app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/Sign up/signup.html'));
});

// Tutor profile
app.get('/tutor-profile', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/Tutor Profile/tutor-profile.html'));
});

// Find tutor
app.get('/find-tutor', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/Find Tutor/find-tutor.html'));
});

// Dashboard
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/Dashboard/dashboard.html'));
});

// Contact
app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/Contact/contact.html'));
});

// Admin page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/Admin page/admin.html'));
});

// -------- API ENDPOINTS --------

// Forgot Password API
app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  try {
    const { error } = await supabaseServer.auth.resetPasswordForEmail(email, {
      redirectTo: 'http://localhost:3000/forgot-password'
    });

    if (error) return res.status(400).json({ message: error.message });

    return res.json({ message: 'If your email exists, a reset link has been sent.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
