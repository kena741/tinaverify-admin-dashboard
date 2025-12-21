import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// This route requires server-side execution with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { userId, phone } = await request.json();

    if (!userId || !phone) {
      return NextResponse.json(
        { error: 'User ID and phone number are required' },
        { status: 400 }
      );
    }

    // Create admin client with service role key (server-side only)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Update user's phone number in auth.users table
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      phone: phone,
    });

    if (error) {
      console.error('Error updating phone:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to update phone number' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Phone number updated successfully',
      user: data.user 
    });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

