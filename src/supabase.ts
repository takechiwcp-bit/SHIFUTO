import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fmcyyjrlooptmaintgbo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtY3l5anJsb29wdG1haW50Z2JvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNTAzNjQsImV4cCI6MjEwMTYyNjM2NH0.7dko0ZhaeeFzM8ExuHcdrz3ann2LuZoOOC-_wV1o6lk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
