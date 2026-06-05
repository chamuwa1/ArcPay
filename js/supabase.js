import { createClient } from '@supabase/supabase-js';

// Fetch the dynamic configuration from Vercel Serverless Function
// This ensures the frontend uses the exact same Supabase project as the backend
let config = {};
try {
  const res = await fetch('/api/config');
  config = await res.json();
} catch (e) {
  console.warn("Failed to load dynamic config, falling back to defaults.");
  config = {
    supabaseUrl: 'https://opfealrrtdfszyfvbhsj.supabase.co',
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wZmVhbHJydGRmc3p5ZnZiaHNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NDM4NzUsImV4cCI6MjA5NjIxOTg3NX0.p3KaKulCf04iPhYLX7qqIwIekcP6Woiuj2VYt3j750c'
  };
}

export const supabase = createClient(config.supabaseUrl, config.supabaseKey);
