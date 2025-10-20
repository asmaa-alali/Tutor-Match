// backend/supabaseServerClient.js
import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY; // anon key is fine for resetPasswordForEmail

export const supabaseServer = createClient(SUPABASE_URL, SUPABASE_KEY);
