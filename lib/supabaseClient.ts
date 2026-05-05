import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  "https://rfbslgtfwytognrakenu.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmYnNsZ3Rmd3l0b2ducmFrZW51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2MDc2NDgsImV4cCI6MjA5MzE4MzY0OH0.BRXlOxbwMXu59veqLxmbWq1F-ZyxqgKTe0k7d02DN-s"
);