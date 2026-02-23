import { sprintVerify } from '@/lib/sprintVerify';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const ocr = await sprintVerify._callVerificationAPI('/verification/ocr_doc', {}, data => data);
        const face = await sprintVerify._callVerificationAPI('/verification/face_match', {}, data => data);

        return NextResponse.json({ ocr, face });
    } catch (e) {
        return NextResponse.json({ error: e.message });
    }
}
