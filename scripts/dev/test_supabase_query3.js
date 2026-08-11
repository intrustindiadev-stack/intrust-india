const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('http://localhost', 'dummy');

const baseSelect = () => supabase.from('crm_leads').select('*', { count: 'exact', head: true })
    .is('archived_at', null)
    .neq('source', 'Users')
    .neq('source', 'App User');

const u = baseSelect().not('assigned_team_id', 'is', null).is('assigned_to', null);
console.log('unassigned url:', u.url.toString());

const a = baseSelect().not('assigned_to', 'is', null);
console.log('assigned url:', a.url.toString());
