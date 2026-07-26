import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const srcDir = 'C:/Users/yoges/.gemini/antigravity-ide/brain/52c8e9fb-185a-4902-9162-38104145ca31';
        const destDir = path.join(process.cwd(), 'public', 'images');
        
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }
        
        fs.copyFileSync(path.join(srcDir, 'crm_banner_illustration_1785102111153.png'), path.join(destDir, 'crm_banner_illustration.png'));
        fs.copyFileSync(path.join(srcDir, 'hrm_banner_illustration_1785102121055.png'), path.join(destDir, 'hrm_banner_illustration.png'));
        fs.copyFileSync(path.join(srcDir, 'employee_banner_illustration_1785102131830.png'), path.join(destDir, 'employee_banner_illustration.png'));
        
        return NextResponse.json({ success: true, message: 'Copied successfully!' });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
