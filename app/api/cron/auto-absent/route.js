import { createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date') || searchParams.get('date') || null;
    const endDate = searchParams.get('end_date') || searchParams.get('date') || null;

    // 1. Close any lingering open shifts from past dates
    const { data: closedCount, error: closeError } = await supabase.rpc('close_stale_attendance');
    if (closeError) {
      console.warn('[Auto-Absent Cron] close_stale_attendance warning:', closeError.message);
    }

    // 2. Run auto-absent for completed chargeable working days
    const rpcParams = {};
    if (startDate) rpcParams.p_start_date = startDate;
    if (endDate) rpcParams.p_end_date = endDate;
    const { data: absentResult, error: absentError } = await supabase.rpc('auto_mark_absent_attendance', rpcParams);

    if (absentError) {
      console.error('[Auto-Absent Cron] Error marking absent:', absentError);
      return NextResponse.json({
        error: absentError.message || 'Auto-absent execution failed',
        code: 'AUTO_ABSENT_FAILED',
        stale_closed: closedCount || 0
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Attendance cutoff & auto-absent completed successfully',
      stale_shifts_closed: closedCount || 0,
      auto_absent: absentResult
    }, { status: 200 });
  } catch (err) {
    console.error('[Auto-Absent Cron] Server Error:', err);
    return NextResponse.json({
      error: err.message || 'Internal Server Error',
      code: 'SERVER_ERROR'
    }, { status: 500 });
  }
}
