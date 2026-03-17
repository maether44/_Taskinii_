const supabase_js = require("@supabase/supabase-js");

const supabase = supabase_js.createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = supabase;