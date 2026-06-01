import { createServerSupabaseClient } from '@/lib/db/server';
import { NextResponse } from 'next/server';
import type { User as DbUser } from '@/types';
import type { User as SupabaseUser } from '@supabase/supabase-js';

type RequireAdminSuccess = {
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  user: SupabaseUser;
  profile: DbUser;
};

type RequireAdminResult = RequireAdminSuccess | { error: NextResponse };

export async function requireAdmin(): Promise<RequireAdminResult> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || profile.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden - Admins only' }, { status: 403 }) };
  }

  return { supabase, user, profile };
}
