import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { mockDb, Profile } from '../services/mockDb';

interface AuthContextType {
  user: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  switchRole: (role: Profile['role']) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial Auth State
    if (isSupabaseConfigured && supabase) {
      // Supabase Auth Listeners (handled if configured)
      const fetchProfile = async (sessionUser: any) => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', sessionUser.id)
            .single();

          if (data) {
            setUser(data);
          } else {
            // fallback profile
            setUser({
              id: sessionUser.id,
              name: sessionUser.email.split('@')[0],
              role: 'Viewer',
              contact_number: '',
              designation: 'Staff',
              joining_date: new Date().toISOString().split('T')[0],
              photo_url: null,
              status: 'Active',
              email: sessionUser.email
            });
          }
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      };

      supabase.auth.getSession().then(({ data: { session } }: any) => {
        if (session?.user) {
          fetchProfile(session.user);
        } else {
          setLoading(false);
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
        if (session?.user) {
          fetchProfile(session.user);
        } else {
          setUser(null);
          setLoading(false);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    } else {
      setUser(null);
      setLoading(false);
    }
  }, []);

  const signIn = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return true;
      } else {
        alert("Supabase integration is required. Please configure your .env file to enable authentication.");
        setLoading(false);
        return false;
      }
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Authentication failed.");
      setLoading(false);
      return false;
    }
  };

  const signOut = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
  };

  const switchRole = (role: Profile['role']) => {
    // Switch role locally only for debug purposes if logged in
    if (user) {
      setUser({ ...user, role });
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
