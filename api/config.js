export default function handler(req, res) {
  // Only return public-facing configurations (NEVER the service key)
  res.status(200).json({
    supabaseUrl: process.env.SUPABASE_URL || 'https://opfealrrtdfszyfvbhsj.supabase.co',
    supabaseKey: process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wZmVhbHJydGRmc3p5ZnZiaHNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NDM4NzUsImV4cCI6MjA5NjIxOTg3NX0.p3KaKulCf04iPhYLX7qqIwIekcP6Woiuj2VYt3j750c'
  });
}
