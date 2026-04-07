// =============================================================================
// MISE Auth Service — Supabase Auth integration
// =============================================================================
// Handles user registration, login, logout, and session management.
// Uses Supabase Auth for authentication and the public.users table for
// application-level user data (tier, generation counts, etc.).
// Requirements: 7.1, 7.2, 7.4, 7.5, 7.6
// =============================================================================

import { createClient } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PlanTier = 'free' | 'home_cook' | 'creator' | 'brigade';

export interface UserRecord {
  id: string;
  email: string;
  tier: PlanTier;
  stripeCustomerId: string | null;
  createdAt: string;
}

export interface AuthResult<T> {
  data: T | null;
  error: string | null;
}

// Generic error message — never reveal which field was wrong
const INVALID_CREDENTIALS_ERROR = 'Invalid email or password';

// ---------------------------------------------------------------------------
// register — create Supabase auth user + public.users row
// ---------------------------------------------------------------------------

export async function register(
  email: string,
  password: string
): Promise<AuthResult<UserRecord>> {
  const supabase = await createClient();

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError || !authData.user) {
    return {
      data: null,
      error: authError?.message ?? INVALID_CREDENTIALS_ERROR,
    };
  }

  const userId = authData.user.id;

  // Insert row in public.users with free-tier defaults
  const { error: insertError } = await supabase.from('users').insert({
    id: userId,
    email,
    tier: 'free',
    generation_count_this_month: 0,
    generation_count_reset_date: new Date().toISOString().split('T')[0],
    default_complexity_mode: 'kitchen',
  });

  if (insertError) {
    return {
      data: null,
      error: insertError.message,
    };
  }

  return {
    data: {
      id: userId,
      email,
      tier: 'free',
      stripeCustomerId: null,
      createdAt: new Date().toISOString(),
    },
    error: null,
  };
}

// ---------------------------------------------------------------------------
// login — authenticate via Supabase Auth, return user record
// ---------------------------------------------------------------------------

export async function login(
  email: string,
  password: string
): Promise<AuthResult<UserRecord>> {
  const supabase = await createClient();

  const { error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    return { data: null, error: INVALID_CREDENTIALS_ERROR };
  }

  // Fetch user record from public.users
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, email, tier, stripe_customer_id, created_at')
    .single();

  if (userError || !user) {
    return { data: null, error: INVALID_CREDENTIALS_ERROR };
  }

  return {
    data: {
      id: user.id,
      email: user.email,
      tier: user.tier as PlanTier,
      stripeCustomerId: user.stripe_customer_id,
      createdAt: user.created_at,
    },
    error: null,
  };
}

// ---------------------------------------------------------------------------
// logout — sign out via Supabase Auth
// ---------------------------------------------------------------------------

export async function logout(): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  return { error: error?.message ?? null };
}

// ---------------------------------------------------------------------------
// getCurrentUser — get current session user, fetch from public.users
// ---------------------------------------------------------------------------

export async function getCurrentUser(): Promise<UserRecord | null> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, tier, stripe_customer_id, created_at')
    .eq('id', authUser.id)
    .single();

  if (error || !user) return null;

  return {
    id: user.id,
    email: user.email,
    tier: user.tier as PlanTier,
    stripeCustomerId: user.stripe_customer_id,
    createdAt: user.created_at,
  };
}
