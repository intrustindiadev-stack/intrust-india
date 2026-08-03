import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';
import { z } from 'zod';

const profileUpdateSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters").max(100, "Full name must be under 100 characters").optional(),
  phone: z.string().max(20, "Phone number is too long").optional(),
  city: z.string().max(100, "City name is too long").optional(),
  blood_group: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', '']).optional(),
  avatar_url: z.string().url().optional().or(z.literal('')),
});

export async function PATCH(request) {
  try {
    const { user, admin } = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate the input, only allowing whitelisted fields
    const validatedData = profileUpdateSchema.parse(body);

    if (validatedData.blood_group === '') {
      validatedData.blood_group = null;
    }

    const { error } = await admin
      .from('user_profiles')
      .update(validatedData)
      .eq('id', user.id);

    if (error) {
      console.error('[API] Profile Update Error:', error);
      throw error;
    }

    return NextResponse.json({ success: true, message: 'Profile updated successfully' });
  } catch (err) {
    console.error('[API] Profile Update Route Error:', err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', issues: err.issues, code: 'VALIDATION_ERROR' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update profile', code: 'SERVER_ERROR' }, { status: 500 });
  }
}
