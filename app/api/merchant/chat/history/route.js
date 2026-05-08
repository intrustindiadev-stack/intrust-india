import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';

export async function GET(req) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();

    // Role gate
    const { data: userProfile } = await admin
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const allowedRoles = ['merchant', 'admin', 'super_admin'];
    if (!userProfile || !allowedRoles.includes(userProfile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit')) || 50, 100);
    const before = searchParams.get('before');

    // Find the most recent session
    const { data: session } = await admin
      .from('webchat_sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('audience', 'merchant')
      .order('last_active_at', { ascending: false })
      .limit(1)
      .single();

    if (!session) {
      return NextResponse.json({ messages: [], sessionId: null });
    }

    let query = admin
      .from('webchat_messages')
      .select('id, role, content, created_at')
      .eq('session_id', session.id)
      .eq('audience', 'merchant')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data: messagesData, error: msgError } = await query;

    if (msgError) {
      throw msgError;
    }

    // Since we queried with order by desc for limit/pagination, we should reverse to return chronological order
    const messages = messagesData.reverse();

    return NextResponse.json({
      messages,
      sessionId: session.id,
      hasMore: messages.length === limit,
    });

  } catch (err) {
    console.error('[merchant/chat/history] Unhandled error:', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
