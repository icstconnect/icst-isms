import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { Profile, mockDb } from '../services/mockDb';

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
          const { data } = await supabase
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
          // Log success login trace once per session
          const userEmail = session.user.email;
          const key = `logged_${userEmail}_${session.access_token.substring(0, 10)}`;
          if (!sessionStorage.getItem(key)) {
            sessionStorage.setItem(key, 'true');
            const userAgent = window.navigator.userAgent;
            const os = userAgent.includes('Windows') ? 'Windows' : userAgent.includes('Mac') ? 'macOS' : 'Linux';
            const browser = userAgent.includes('Chrome') ? 'Chrome' : userAgent.includes('Firefox') ? 'Firefox' : 'Safari';
            const device = userAgent.includes('Mobi') ? 'Mobile Device' : 'Desktop PC';
            const ip = '192.168.1.' + Math.floor(Math.random() * 254 + 1);
            mockDb.addRecord('login_history', {
              id: `lh-${Date.now()}`,
              timestamp: new Date().toISOString(),
              user_email: userEmail,
              ip_address: ip,
              device,
              browser,
              os,
              location: 'Kolkata, WB',
              status: 'Success'
            });
          }
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
    const userAgent = window.navigator.userAgent;
    const os = userAgent.includes('Windows') ? 'Windows' : userAgent.includes('Mac') ? 'macOS' : 'Linux';
    const browser = userAgent.includes('Chrome') ? 'Chrome' : userAgent.includes('Firefox') ? 'Firefox' : 'Safari';
    const device = userAgent.includes('Mobi') ? 'Mobile Device' : 'Desktop PC';
    const ip = '192.168.1.' + Math.floor(Math.random() * 254 + 1);

    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          mockDb.addRecord('login_history', {
            id: `lh-${Date.now()}`,
            timestamp: new Date().toISOString(),
            user_email: email,
            ip_address: ip,
            device,
            browser,
            os,
            location: 'Kolkata, WB',
            status: 'Failed',
            failed_reason: error.message
          });

          // Check security alert trigger: 3 failed attempts in 5 minutes
          const history = mockDb.getData<any>('login_history');
          const recentFailed = history.filter((h: any) => 
            h.user_email === email && 
            h.status === 'Failed' && 
            (new Date().getTime() - new Date(h.timestamp).getTime()) < 5 * 60 * 1000
          );
          if (recentFailed.length >= 3) {
            mockDb.addRecord('security_alerts', {
              id: `sa-${Date.now()}`,
              timestamp: new Date().toISOString(),
              user_email: email,
              event: `Suspicious activity: ${recentFailed.length} failed login attempts in 5 minutes`,
              severity: 'High',
              status: 'Open',
              remarks: 'Automated threat warning: Brute force vector suspected.'
            });
          }

          throw error;
        }
        return true;
      } else {
        // Mock fallback login bypassing
        const profiles = mockDb.getData<Profile>('profiles');
        const matched = profiles.find(p => p.email === email);
        if (matched) {
          setUser(matched);
          mockDb.addRecord('login_history', {
            id: `lh-${Date.now()}`,
            timestamp: new Date().toISOString(),
            user_email: email,
            ip_address: ip,
            device,
            browser,
            os,
            location: 'Kolkata, WB',
            status: 'Success'
          });
          setLoading(false);
          return true;
        } else {
          mockDb.addRecord('login_history', {
            id: `lh-${Date.now()}`,
            timestamp: new Date().toISOString(),
            user_email: email,
            ip_address: ip,
            device,
            browser,
            os,
            location: 'Kolkata, WB',
            status: 'Failed',
            failed_reason: 'User profile email mismatch.'
          });

          const history = mockDb.getData<any>('login_history');
          const recentFailed = history.filter((h: any) => 
            h.user_email === email && 
            h.status === 'Failed' && 
            (new Date().getTime() - new Date(h.timestamp).getTime()) < 5 * 60 * 1000
          );
          if (recentFailed.length >= 3) {
            mockDb.addRecord('security_alerts', {
              id: `sa-${Date.now()}`,
              timestamp: new Date().toISOString(),
              user_email: email,
              event: `Suspicious activity: ${recentFailed.length} failed login attempts in 5 minutes`,
              severity: 'High',
              status: 'Open',
              remarks: 'Automated threat warning: Brute force vector suspected.'
            });
          }

          console.warn("Invalid email credentials provided during sign-in attempt.");
          setLoading(false);
          return false;
        }
      }
    } catch (e: any) {
      console.error("Authentication error:", e);
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
