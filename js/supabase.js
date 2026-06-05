import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://opfealrrtdfszyfvbhsj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wZmVhbHJydGRmc3p5ZnZiaHNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NDM4NzUsImV4cCI6MjA5NjIxOTg3NX0.p3KaKulCf04iPhYLX7qqIwIekcP6Woiuj2VYt3j750c';

export const supabase = createClient(supabaseUrl, supabaseKey);
