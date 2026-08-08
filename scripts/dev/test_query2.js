const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('http://187.124.98.130:8000', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'fake');

const query = supabase.from('crm_leads').select('*', { count: 'exact', head: true }).not('assigned_to', 'is', null);
console.log(query.url.toString());
