import fs from 'fs';
import path from 'path';

export async function GET(request) {
    const crmProfile = path.join(process.cwd(), 'app', '(crm)', 'crm', 'profile');
    const hrmProfile = path.join(process.cwd(), 'app', '(hrm)', 'hrm', 'profile');

    let results = [];

    try {
        if (fs.existsSync(crmProfile)) {
            fs.rmSync(crmProfile, { recursive: true, force: true });
            results.push('Deleted CRM profile');
        }
        if (fs.existsSync(hrmProfile)) {
            fs.rmSync(hrmProfile, { recursive: true, force: true });
            results.push('Deleted HRM profile');
        }
        return new Response(JSON.stringify({ success: true, results }), { status: 200 });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
    }
}
