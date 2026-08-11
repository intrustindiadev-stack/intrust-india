const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('http://localhost', 'dummy');
const b1 = supabase.from('tbl').select().is('assigned_to', null);
console.log('is:', b1.url.toString());
