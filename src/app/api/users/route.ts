import { createServerSupabaseClient } from '@/lib/db/server';
import { createAdminClient } from '@/lib/db/admin';
import { emailToUsername, isValidUsername, usernameToInternalEmail } from '@/lib/auth/username';
import type { UserRole } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

type UserRow = {
  email: string;
  [key: string]: unknown;
};

type CreateUserBody = {
  username?: unknown;
  name?: unknown;
  password?: unknown;
  role?: unknown;
  permissions?: unknown;
  is_active?: unknown;
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function withUsernames(users: UserRow[]) {
  return users.map((user) => ({
    ...user,
    username: emailToUsername(user.email),
  }));
}

// GET all users (Admins only)
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    // 1. Verify user authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify user is an admin
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admins only' }, { status: 403 });
    }

    // 3. Fetch all users from public.users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (usersError) throw usersError;

    return NextResponse.json(withUsernames(users || []));
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST to create a new username/password user (Admins only)
export async function POST(request: NextRequest) {
  let createdAuthUserId: string | null = null;

  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admins only' }, { status: 403 });
    }

    const body = (await request.json()) as CreateUserBody;
    const username = String(body.username || '');
    const name = String(body.name || '').trim();
    const password = String(body.password || '');
    const role = String(body.role || 'viewer');
    const permissions = Array.isArray(body.permissions) ? body.permissions : [];
    const is_active = typeof body.is_active === 'boolean' ? body.is_active : true;

    if (!isValidUsername(username)) {
      return NextResponse.json(
        { error: 'اسم المستخدم يجب أن يكون 3 إلى 32 حرفاً بالإنجليزية أو أرقاماً أو . _ -' },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json({ error: 'اسم الموظف مطلوب' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }, { status: 400 });
    }

    if (!['admin', 'user', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'الدور غير صحيح' }, { status: 400 });
    }

    const admin = createAdminClient();
    const email = usernameToInternalEmail(username);

    const { data: existingProfile } = await admin
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json({ error: 'اسم المستخدم موجود مسبقاً' }, { status: 409 });
    }

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        username,
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Failed to create auth user');
    createdAuthUserId = authData.user.id;

    const { data: newUser, error: insertError } = await admin
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        name,
        role,
        permissions,
        is_active,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json(
      {
        ...newUser,
        username: emailToUsername(newUser.email),
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (createdAuthUserId) {
      try {
        await createAdminClient().auth.admin.deleteUser(createdAuthUserId);
      } catch (cleanupError) {
        console.error('Failed to clean up auth user:', cleanupError);
      }
    }

    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to create user') },
      { status: 400 }
    );
  }
}

// PUT to update user role, permissions, and is_active (Admins only)
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // 1. Verify user authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify user is an admin
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admins only' }, { status: 403 });
    }

    // 3. Parse request body
    const body = (await request.json()) as {
      id?: string;
      role?: UserRole;
      permissions?: string[];
      is_active?: boolean;
    };
    const { id, role, permissions, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // 4. Safety validations
    if (id === user.id) {
      if (is_active === false) {
        return NextResponse.json({ error: 'لا يمكنك تجميد حسابك الشخصي!' }, { status: 400 });
      }
      if (role !== 'admin') {
        return NextResponse.json({ error: 'لا يمكنك تغيير دورك كمدير عام!' }, { status: 400 });
      }
    }

    // 5. Update user in public.users
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        role,
        permissions,
        is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json(updatedUser);
  } catch (error: unknown) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to update user') },
      { status: 400 }
    );
  }
}
