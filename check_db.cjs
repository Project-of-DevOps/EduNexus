// check_db.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config(); // Load your .env file

// Connect to Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;


// Use Service Role Key if available to bypass RLS for this admin check
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function viewData() {
  console.log("🔍 Checking Supabase Data...");

  // 1. Check Profiles Table
  const { data: profiles, error: err1 } = await supabase.from('profiles').select('*');
  if (err1) console.error("Error fetching profiles:", err1.message);
  else {
    console.log("\n--- 👥 PROFILES TABLE ---");
    console.table(profiles); // Prints a nice table
  }

  // 2. Check Organizations Table
  const { data: orgs, error: err2 } = await supabase.from('organizations').select('*');
  if (err2) console.error("Error fetching orgs:", err2.message);
  else {
    console.log("\n--- 🏫 ORGANIZATIONS TABLE ---");
    console.table(orgs);
  }
}

viewData();
