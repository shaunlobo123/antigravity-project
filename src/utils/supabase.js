import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Replace these with your actual Supabase Project URL and Anon Key.
// 
// Recommended: Use Expo Environment Variables!
// Create a .env file in the root of your project:
// EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
// EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
// Then, you can reference them below using process.env.EXPO_PUBLIC_SUPABASE_URL etc.
const supabaseUrl = 'https://uaweddyldeotsvwulwqf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhd2VkZHlsZGVvdHN2d3Vsd3FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5ODEyNTksImV4cCI6MjA5NzU1NzI1OX0.iIch6ISBqh4-sTn_w-nPLfvcv_7UOf9NaY9Bkx9_B1k';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
