import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ijpsusjvwelluqnbnduw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqcHN1c2p2d2VsbHVxbmJuZHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzOTY3OTgsImV4cCI6MjA3NTk3Mjc5OH0.3yV5cufjcxe78GPm7B4eZG4T0OuJxwXPwRzPmC0Uijg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
