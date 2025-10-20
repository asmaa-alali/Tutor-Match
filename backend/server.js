
// backend/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import { supabaseServer } from './supabaseServerClient.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());          // allow cross-origin requests from your frontend
app.use(express.json());  // parse JSON bodies

// Health check
app.get('/', (req, res) => res.send('Backend is working'));

// Forgot Password endpoint
app.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  try {
    // Ask Supabase to send a reset password email
    const { error } = await supabaseServer.auth.resetPasswordForEmail(email, {
      redirectTo: 'http://127.0.0.1:5500/frontend/forgot-password/forgot-password.html' 
      // update URL to where you want the user redirected after clicking the email link
    });

    if (error) {
      // surface Supabase error message
      return res.status(400).json({ message: error.message || 'Supabase error' });
    }

    return res.json({ message: 'If your email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
