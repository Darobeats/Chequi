
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type UserRole = Database['public']['Enums']['user_role'];

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  attendee_id: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const SupabaseAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = async (userId: string, retryCount = 0) => {
    try {
      console.log(`Attempting to fetch profile for user: ${userId} (attempt ${retryCount + 1})`);
      
      // First check if the profile exists at all
      const { data: profileExists, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking if profile exists:', checkError);
        throw checkError;
      }

      if (!profileExists) {
        console.log('Profile does not exist for user, creating one...');
        // Profile doesn't exist, this shouldn't happen due to trigger but let's create it
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              email: userData.user.email || '',
              full_name: userData.user.user_metadata?.full_name || userData.user.email || '',
              role: 'attendee' as UserRole
            });
          
          if (insertError) {
            console.error('Error creating profile:', insertError);
            throw insertError;
          }
          
          console.log('Profile created successfully, fetching again...');
        }
      }

      // Now fetch the complete profile
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        
        // If it's a PGRST116 error (no rows returned), retry a few times
        if (error.code === 'PGRST116' && retryCount < 3) {
          console.log('No profile found, retrying in 1 second...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          return fetchProfile(userId, retryCount + 1);
        }
        
        throw error;
      }

      console.log('Profile fetched successfully:', data);
      return data as Profile;
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      throw error;
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          try {
            console.log('User found, fetching profile...');
            const userProfile = await fetchProfile(session.user.id);
            if (isMounted) {
              console.log('Setting profile:', userProfile);
              setProfile(userProfile);
            }
          } catch (error) {
            console.error('Failed to fetch profile:', error);
            if (isMounted) {
              setProfile(null);
            }
          }
        } else {
          console.log('No user, clearing profile');
          setProfile(null);
        }
        
        if (isMounted) {
          setLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.email);
      
      if (!isMounted) return;

      if (session) {
        setSession(session);
        setUser(session.user);
        
        try {
          console.log('Initial session found, fetching profile...');
          const userProfile = await fetchProfile(session.user.id);
          if (isMounted) {
            console.log('Setting initial profile:', userProfile);
            setProfile(userProfile);
          }
        } catch (error) {
          console.error('Failed to fetch initial profile:', error);
          if (isMounted) {
            setProfile(null);
          }
        }
      }
      
      if (isMounted) {
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      setLoading(true);
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName || email
          }
        }
      });
      
      return { error };
    } catch (error) {
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      return { error };
    } catch (error) {
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (!error && profile) {
        setProfile({ ...profile, ...updates });
      }

      return { error };
    } catch (error) {
      return { error };
    }
  };

  return (
    <AuthContext.Provider 
      value={{
        user,
        session,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useSupabaseAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
  }
  return context;
};
