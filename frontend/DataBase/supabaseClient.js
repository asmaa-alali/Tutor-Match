import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://adwpdhshvsoheyplijqr.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkd3BkaHNodnNvaGV5cGxpanFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzOTY2MDAsImV4cCI6MjA3NDk3MjYwMH0.2GwLyTteLw5lFaQRZMJSq3DgFmbeh0Is7EV7FXD1Y-o"

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
