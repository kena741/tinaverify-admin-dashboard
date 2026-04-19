import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL! || "https://tovvoeffgngoxcvjoktu.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvdnZvZWZmZ25nb3hjdmpva3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMjA3NTYsImV4cCI6MjA4MTg5Njc1Nn0.R7b1oiiScdwHqULwIu39dHIR0jF17Pme5RTeFUkO3m4";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
