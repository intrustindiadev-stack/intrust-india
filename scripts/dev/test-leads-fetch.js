const { fetchTeamLeadsData } = require('./app/actions/admin-crm.js');
async function test() {
    const data = await fetchTeamLeadsData();
    console.log(JSON.stringify({
        hasTeam: !!data.team,
        teamCount: data.team?.length,
        hasLeads: !!data.leads,
        leadsCount: data.leads?.length,
        error: data.error
    }));
}
test();
