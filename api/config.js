export default function handler(req, res) {
  let supabaseUrl = process.env.SUPABASE_URL || 'https://opfealrrtdfszyfvbhsj.supabase.co';
  let supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wZmVhbHJydGRmc3p5ZnZiaHNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NDM4NzUsImV4cCI6MjA5NjIxOTg3NX0.p3KaKulCf04iPhYLX7qqIwIekcP6Woiuj2VYt3j750c';

  // Check if the user accidentally pasted the literal placeholder text
  if (supabaseUrl === 'your-supabase-project-url' || !supabaseUrl.startsWith('http')) {
    console.warn('Invalid SUPABASE_URL detected in environment variables. Falling back to test database.');
    supabaseUrl = 'https://opfealrrtdfszyfvbhsj.supabase.co';
    supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wZmVhbHJydGRmc3p5ZnZiaHNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NDM4NzUsImV4cCI6MjA5NjIxOTg3NX0.p3KaKulCf04iPhYLX7qqIwIekcP6Woiuj2VYt3j750c';
  }

  // Strip trailing slashes to prevent "Invalid path specified" errors
  if (supabaseUrl.endsWith('/')) {
    supabaseUrl = supabaseUrl.slice(0, -1);
  }

  res.status(200).json({ supabaseUrl, supabaseKey });
}
