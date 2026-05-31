import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/db/client';
import { usernameToInternalEmail } from '@/lib/auth/username';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { User as DbUser } from '@/types';

async function loadProfile(
  supabase: ReturnType<typeof createClient>,
  currentUser: SupabaseUser
): Promise<DbUser> {
  const { data: currentProfile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', currentUser.id)
    .single();

  if (profileError) {
    console.error('Profile fetch error:', profileError);
    return {
      id: currentUser.id,
      email: currentUser.email || '',
      name: currentUser.user_metadata?.name || 'مستخدم جديد',
      role: 'viewer',
      permissions: [],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  return currentProfile;
}

export function useAuth() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<DbUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const routerRef = useRef(router);
  const supabase = useMemo(() => createClient(), []);

  routerRef.current = router;

  useEffect(() => {
    let active = true;

    const applySession = (sessionUser: SupabaseUser | null) => {
      if (!active) return;
      setUser(sessionUser);

      if (!sessionUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setLoading(false);
    };

    const syncProfile = async (sessionUser: SupabaseUser) => {
      try {
        const currentProfile = await loadProfile(supabase, sessionUser);
        if (!active) return;

        setProfile(currentProfile);

        if (currentProfile.is_active === false) {
          await supabase.auth.signOut();
          routerRef.current.push('/auth/login?suspended=true');
        }
      } catch (error) {
        console.error('Profile error:', error);
      }
    };

    const initAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!active) return;

        const sessionUser = session?.user ?? null;
        applySession(sessionUser);

        if (!sessionUser) {
          routerRef.current.push('/auth/login');
          return;
        }

        void syncProfile(sessionUser);
      } catch (error) {
        console.error('Auth error:', error);
        if (active) {
          setUser(null);
          setProfile(null);
          setLoading(false);
          routerRef.current.push('/auth/login');
        }
      }
    };

    void initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!active) return;

      const sessionUser = session?.user ?? null;
      applySession(sessionUser);

      if (!sessionUser) {
        if (event === 'SIGNED_OUT') {
          routerRef.current.push('/auth/login');
        }
        return;
      }

      void syncProfile(sessionUser);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  return { user, profile, loading };
}

export async function signIn(username: string, password: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: usernameToInternalEmail(username),
    password,
  });

  if (error) throw error;
  return data;
}

export async function signUp(email: string, password: string, name: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
    },
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function resetPassword(email: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
  });

  if (error) throw error;
}
