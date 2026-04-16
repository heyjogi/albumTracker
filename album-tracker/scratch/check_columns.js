import { supabase } from "../src/lib/supabase.js";

async function checkColumns() {
  const { data, error } = await supabase.from("purchases").select("*").limit(1);
  if (error) {
    console.error(error);
  } else {
    console.log(Object.keys(data[0] || {}));
  }
}

checkColumns();
