import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { getSupabase, supabaseEnabled } from '../lib/supabase';

export interface Profile {
  id: string;
  display_name: string;
  created_at: string;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  needsDisplayName: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  setDisplayName: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('id, display_name, created_at')
    .eq('id', userId)
    .single();
  if (error || !data) return null;
  return data as Profile;
}

const noop = async () => {};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(supabaseEnabled);
  const [needsDisplayName, setNeedsDisplayName] = useState(false);

  const loadProfile = useCallback(async (u: User | null) => {
    if (!u) {
      setProfile(null);
      setNeedsDisplayName(false);
      return;
    }
    const p = await fetchProfile(u.id);
    setProfile(p);
    setNeedsDisplayName(!p);
  }, []);

  // Initialize session on mount (only if Supabase is configured)
  useEffect(() => {
    if (!supabaseEnabled) return;

    const supabase = getSupabase();

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      loadProfile(s?.user ?? null).finally(() => setLoading(false));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        setSession(s);
        setUser(s?.user ?? null);
        loadProfile(s?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await getSupabase().auth.signUp({ email, password });
    if (error) throw error;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw error;
  }, []);

  const signInWithApple = useCallback(async () => {
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await getSupabase().auth.signOut();
    if (error) throw error;
  }, []);

  const setDisplayName = useCallback(async (name: string) => {
    if (!user) throw new Error('Not signed in');

    const { data, error } = await getSupabase()
      .from('profiles')
      .upsert({ id: user.id, display_name: name })
      .select('id, display_name, created_at')
      .single();

    if (error) throw error;
    setProfile(data as Profile);
    setNeedsDisplayName(false);
  }, [user]);

  // If Supabase isn't configured, provide a no-op context so the app still works
  if (!supabaseEnabled) {
    return (
      <AuthContext.Provider
        value={{
          user: null, session: null, profile: null,
          loading: false, needsDisplayName: false,
          signInWithEmail: noop, signUpWithEmail: noop,
          signInWithGoogle: noop, signInWithApple: noop,
          signOut: noop, setDisplayName: noop,
        }}
      >
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        needsDisplayName,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signInWithApple,
        signOut,
        setDisplayName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
