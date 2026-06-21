const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uaweddyldeotsvwulwqf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhd2VkZHlsZGVvdHN2d3Vsd3FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5ODEyNTksImV4cCI6MjA5NzU1NzI1OX0.iIch6ISBqh4-sTn_w-nPLfvcv_7UOf9NaY9Bkx9_B1k';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    const { data, error } = await supabase.from('profiles').select('email').limit(1);
    if (error) {
      console.log('Error selecting email:', error.message, error.code);
    } else {
      console.log('Successfully selected email! Column exists.', data);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

run();
