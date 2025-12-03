import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { prefetchUserDataForOffline } from '../services/offlineDataService';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, phone: string) => Promise<{ user: User | null; error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ user: User | null; error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Prefetch data for offline use if user is logged in
      if (session?.user && navigator.onLine) {
        prefetchUserDataForOffline(session.user.id).catch(console.error);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Prefetch data when user signs in
      if (_event === 'SIGNED_IN' && session?.user && navigator.onLine) {
        prefetchUserDataForOffline(session.user.id).catch(console.error);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, phone: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          phone
        }
      }
    });

    if (data.user && !error) {
      setUser(data.user);
      setSession(data.session);
      
      // Prefetch data for the new user
      if (navigator.onLine) {
        prefetchUserDataForOffline(data.user.id).catch(console.error);
      }
    }

    return { user: data.user, error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (data.user && !error) {
      setUser(data.user);
      setSession(data.session);
      
      // Prefetch data for offline use immediately after login
      if (navigator.onLine) {
        console.log('📦 Prefetching user data for offline access...');
        prefetchUserDataForOffline(data.user.id).catch(console.error);
      }
    }

    return { user: data.user, error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
