import { createAdminClient } from '@/lib/db/admin';
import { requireAdmin } from '@/lib/api/require-admin';
import {
  emailToUsername,
  isValidUsername,
  normalizeUsername,
  usernameToInternalEmail,
} from '@/lib/auth/username';
import type { UserRole } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    const message = error.message;
    if (message.includes('duplicate key') || message.includes('users_email')) {
      return 'اسم المستخدم أو البريد مستخدم مسبقاً';
    }
    if (message.includes('users_role_check') || message.includes('check constraint')) {
      return 'الدور غير مدعوم في قاعدة البيانات';
    }
    return message;
  }
  return fallback;
}

function withUsername<T extends { email: string }>(user: T) {
  return {
    ...user,
    username: emailToUsername(user.email),
  };
}

type RouteContext = { params: Promise<{ id: string }> };

// GET single user
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    const { id } = await context.params;
    const admin = createAdminClient();

    const { data: targetUser, error } = await admin
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !targetUser) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }

    return NextResponse.json(withUsername(targetUser));
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT update user (profile + optional password/username)
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    const { id } = await context.params;
    const body = (await request.json()) as {
      name?: unknown;
      username?: unknown;
      password?: unknown;
      role?: unknown;
      permissions?: unknown;
      is_active?: unknown;
    };

    const admin = createAdminClient();

    const { data: targetUser, error: fetchError } = await admin
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !targetUser) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }

    const name =
      body.name !== undefined ? String(body.name).trim() : targetUser.name ?? '';
    const role = (body.role !== undefined ? String(body.role) : targetUser.role) as UserRole;
    const permissions = Array.isArray(body.permissions)
      ? body.permissions
      : targetUser.permissions ?? [];
    const is_active =
      typeof body.is_active === 'boolean' ? body.is_active : targetUser.is_active ?? true;
    const password = body.password !== undefined ? String(body.password) : '';
    const usernameRaw =
      body.username !== undefined ? String(body.username) : emailToUsername(targetUser.email);

    if (!name) {
      return NextResponse.json({ error: 'اسم الموظف مطلوب' }, { status: 400 });
    }

    if (!['admin', 'user', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'الدور غير صحيح' }, { status: 400 });
    }

    if (!isValidUsername(usernameRaw)) {
      return NextResponse.json(
        { error: 'اسم المستخدم يجب أن يكون 3 إلى 32 حرفاً بالإنجليزية أو أرقاماً أو . _ -' },
        { status: 400 }
      );
    }

    if (password && password.length < 6) {
      return NextResponse.json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }, { status: 400 });
    }

    if (id === auth.user.id) {
      if (is_active === false) {
        return NextResponse.json({ error: 'لا يمكنك تجميد حسابك الشخصي!' }, { status: 400 });
      }
      if (role !== 'admin') {
        return NextResponse.json({ error: 'لا يمكنك تغيير دورك كمدير عام!' }, { status: 400 });
      }
    }

    const newEmail = usernameToInternalEmail(usernameRaw);
    const usernameChanged = normalizeUsername(usernameRaw) !== emailToUsername(targetUser.email);

    if (usernameChanged) {
      const { data: duplicate } = await admin
        .from('users')
        .select('id')
        .eq('email', newEmail)
        .neq('id', id)
        .maybeSingle();

      if (duplicate) {
        return NextResponse.json({ error: 'اسم المستخدم موجود مسبقاً' }, { status: 409 });
      }
    }

    const authUpdate: {
      email?: string;
      password?: string;
      user_metadata?: { name: string; username: string };
    } = {
      user_metadata: {
        name,
        username: normalizeUsername(usernameRaw),
      },
    };

    if (usernameChanged) authUpdate.email = newEmail;
    if (password) authUpdate.password = password;

    const { error: authUpdateError } = await admin.auth.admin.updateUserById(id, authUpdate);
    if (authUpdateError) throw authUpdateError;

    const { data: updatedUser, error: updateError } = await admin
      .from('users')
      .update({
        email: newEmail,
        name,
        role,
        permissions,
        is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json(withUsername(updatedUser));
  } catch (error: unknown) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to update user') },
      { status: 400 }
    );
  }
}

// DELETE user (auth + profile)
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    const { id } = await context.params;

    if (id === auth.user.id) {
      return NextResponse.json({ error: 'لا يمكنك حذف حسابك الشخصي!' }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: targetUser, error: fetchError } = await admin
      .from('users')
      .select('id, role')
      .eq('id', id)
      .single();

    if (fetchError || !targetUser) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }

    if (targetUser.role === 'admin') {
      const { count, error: countError } = await admin
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'admin');

      if (countError) throw countError;
      if ((count ?? 0) <= 1) {
        return NextResponse.json(
          { error: 'لا يمكن حذف آخر مدير في النظام' },
          { status: 400 }
        );
      }
    }

    const { error: authDeleteError } = await admin.auth.admin.deleteUser(id);
    if (authDeleteError) throw authDeleteError;

    await admin.from('users').delete().eq('id', id);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to delete user') },
      { status: 400 }
    );
  }
}
