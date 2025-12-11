/**
 * =============================================================================
 * TOMO CRM - Authentication Module
 * =============================================================================
 * 
 * CURRENT STATE: Mock authentication using localStorage
 * 
 * PRODUCTION WIRING - FIREBASE AUTH:
 * 
 * 1. INSTALL FIREBASE:
 *    npm install firebase
 * 
 * 2. INITIALIZE FIREBASE (create src/lib/firebase.ts):
 *    ```
 *    import { initializeApp } from 'firebase/app';
 *    import { getAuth } from 'firebase/auth';
 *    
 *    const firebaseConfig = {
 *      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
 *      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
 *      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
 *      // ... other config
 *    };
 *    
 *    export const app = initializeApp(firebaseConfig);
 *    export const auth = getAuth(app);
 *    ```
 * 
 * 3. REPLACE THESE FUNCTIONS WITH FIREBASE:
 *    - getSession() → auth.currentUser
 *    - setSession() → handled by Firebase automatically
 *    - clearSession() → signOut(auth)
 *    - useSession() → onAuthStateChanged listener
 * 
 * 4. AUTH PROVIDERS TO ENABLE:
 *    - Email/Password (for email login)
 *    - Google (for "Continue with Google")
 *    - Microsoft (for "Continue with Microsoft 365")
 * 
 * 5. POST-AUTH FLOW:
 *    - On successful Firebase auth, get user.uid
 *    - Check if user exists in Supabase `users` table
 *    - If not, create user record with uid, email, default plan
 *    - Fetch onboardingComplete status from Supabase
 *    - Redirect to /onboarding or /home accordingly
 * 
 * 6. SUPABASE USER RECORD:
 *    - id: Firebase uid (string, primary key)
 *    - email: string
 *    - display_name: string
 *    - plan: 'individual' | 'team'
 *    - stripe_customer_id: string
 *    - onboarding_complete: boolean
 *    - created_at, updated_at: timestamp
 * =============================================================================
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SessionState } from "./types";
import { readFromStorage, writeToStorage } from "./storage";

/** LocalStorage key for session - will be removed in production */
const KEY = "tomo-session";

/**
 * Get current session from localStorage
 * 
 * PRODUCTION: Replace with Firebase auth.currentUser
 * ```
 * import { auth } from './firebase';
 * export function getSession() {
 *   const user = auth.currentUser;
 *   if (!user) return null;
 *   // Fetch additional data from Supabase if needed
 *   return { email: user.email, uid: user.uid, ... };
 * }
 * ```
 */
export function getSession(): SessionState | null {
  return readFromStorage<SessionState | null>(KEY, null);
}

/**
 * Save session to localStorage
 * 
 * PRODUCTION: Firebase handles session persistence automatically
 * You'll store user preferences in Supabase instead
 * ```
 * import { supabase } from './supabase';
 * export async function updateUserPreferences(uid: string, data: Partial<UserProfile>) {
 *   await supabase.from('users').update(data).eq('id', uid);
 * }
 * ```
 */
export function setSession(session: SessionState) {
  writeToStorage(KEY, session);
}

/**
 * Clear session (logout)
 * 
 * PRODUCTION: Use Firebase signOut
 * ```
 * import { signOut } from 'firebase/auth';
 * import { auth } from './firebase';
 * 
 * export async function clearSession() {
 *   await signOut(auth);
 *   // Optionally clear any cached data
 * }
 * ```
 */
export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

/**
 * React hook for session state
 * 
 * PRODUCTION: Use Firebase onAuthStateChanged
 * ```
 * import { onAuthStateChanged, User } from 'firebase/auth';
 * import { auth } from './firebase';
 * 
 * export function useSession() {
 *   const [user, setUser] = useState<User | null>(null);
 *   const [loading, setLoading] = useState(true);
 *   
 *   useEffect(() => {
 *     const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
 *       if (firebaseUser) {
 *         // Fetch additional user data from Supabase
 *         const { data } = await supabase
 *           .from('users')
 *           .select('*')
 *           .eq('id', firebaseUser.uid)
 *           .single();
 *         setUser({ ...firebaseUser, ...data });
 *       } else {
 *         setUser(null);
 *       }
 *       setLoading(false);
 *     });
 *     return unsubscribe;
 *   }, []);
 *   
 *   return { session: user, ready: !loading };
 * }
 * ```
 */
export function useSession() {
  const initialSession = typeof window !== "undefined" ? readFromStorage<SessionState | null>(KEY, null) : null;
  const [session, setSession] = useState<SessionState | null>(initialSession);
  const ready = typeof window !== "undefined";

  const updateSession = (payload: SessionState | null) => {
    if (payload) {
      setSession(payload);
      writeToStorage(KEY, payload);
    } else {
      clearSession();
      setSession(null);
    }
  };

  return { session, ready, setSession: updateSession };
}

/**
 * React hook that requires authentication
 * Redirects to /auth if not logged in, /onboarding if not complete
 * 
 * PRODUCTION: Same pattern but with Firebase
 * Add loading state while checking auth
 */
export function useRequireSession() {
  const router = useRouter();
  const { session, ready, setSession: updateSession } = useSession();

  useEffect(() => {
    if (!ready) return;
    if (!session) {
      router.replace("/auth");
    } else if (!session.onboardingComplete) {
      router.replace("/onboarding");
    }
  }, [ready, session, router]);

  return { session, ready, setSession: updateSession };
}
