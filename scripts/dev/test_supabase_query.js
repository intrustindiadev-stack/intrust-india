const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('http://localhost', 'dummy');
const b1 = supabase.from('tbl').select().neq('assigned_to', null);
console.log('neq:', b1.url.toString());
const b2 = supabase.from('tbl').select().not('assigned_to', 'is', null);
console.log('not.is:', b2.url.toString());
