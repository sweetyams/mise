// =============================================================================
// MISE Billing Service — Stripe integration
// =============================================================================
// Manages subscriptions, checkout sessions, and tier management.
// Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8
// =============================================================================

import Stripe from 'stripe';
import { createServiceClient } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PlanTier = 'free' | 'home_cook' | 'creator' | 'brigade';

export interface SubscriptionPlan {
  tier: PlanTier;
  stripePriceId: string;
  price: number;
  features: string[];
}

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

export const PLANS: SubscriptionPlan[] = [
  {
    tier: 'free',
    stripePriceId: '',
    price: 0,
    features: ['10 generations/month', '1 fingerprint'],
  },
  {
    tier: 'home_cook',
    stripePriceId: 'price_home_cook',
    price: 9,
    features: ['Unlimited generations', 'All fingerprints', 'Library', 'Export'],
  },
  {
    tier: 'creator',
    stripePriceId: 'price_creator',
    price: 19,
    features: [
      'Unlimited generations',
      'All fingerprints',
      'Library',
      'Export with branding',
      'Custom fingerprints',
      'Collections',
    ],
  },
  {
    tier: 'brigade',
    stripePriceId: 'price_brigade',
    price: 49,
    features: [
      'Unlimited generations',
      'All fingerprints',
      'Library',
      'Export with branding',
      'Custom fingerprints',
      'Collections',
      'Team workspace',
      'API access',
    ],
  },
];

// ---------------------------------------------------------------------------
// Stripe client
// ---------------------------------------------------------------------------

function getStripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-03-25.dahlia',
  });
}

// ---------------------------------------------------------------------------
// createCheckoutSession
// ---------------------------------------------------------------------------

export async function createCheckoutSession(
  userId: string,
  tier: PlanTier
): Promise<{ url: string | null; error: string | null }> {
  const plan = PLANS.find((p) => p.tier === tier);
  if (!plan || plan.tier === 'free') {
    return { url: null, error: 'Invalid plan selected' };
  }

  const stripe = getStripe();
  const supabase = createServiceClient();

  // Get or create Stripe customer
  const { data: user } = await supabase
    .from('users')
    .select('email, stripe_customer_id')
    .eq('id', userId)
    .single();

  if (!user) {
    return { url: null, error: 'User not found' };
  }

  let customerId = user.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId },
    });
    customerId = customer.id;

    await supabase
      .from('users')
      .update({ stripe_customer_id: customerId })
      .eq('id', userId);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    success_url: `${appUrl}/settings?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/pricing`,
    metadata: { userId, tier },
  });

  return { url: session.url, error: null };
}

// ---------------------------------------------------------------------------
// getUserBillingInfo
// ---------------------------------------------------------------------------

export async function getUserBillingInfo(userId: string): Promise<{
  tier: PlanTier;
  nextBillingDate: string | null;
  portalUrl: string | null;
  error: string | null;
}> {
  const supabase = createServiceClient();

  const { data: user } = await supabase
    .from('users')
    .select('tier, stripe_customer_id')
    .eq('id', userId)
    .single();

  if (!user) {
    return { tier: 'free', nextBillingDate: null, portalUrl: null, error: 'User not found' };
  }

  const tier = user.tier as PlanTier;
  let nextBillingDate: string | null = null;
  let portalUrl: string | null = null;

  if (user.stripe_customer_id) {
    const stripe = getStripe();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    try {
      // Get active subscription
      const subscriptions = await stripe.subscriptions.list({
        customer: user.stripe_customer_id,
        status: 'active',
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        const sub = subscriptions.data[0];
        const item = sub.items.data[0];
        if (item?.current_period_end) {
          nextBillingDate = new Date(item.current_period_end * 1000).toISOString();
        }
      }

      // Create portal session
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: user.stripe_customer_id,
        return_url: `${appUrl}/settings`,
      });
      portalUrl = portalSession.url;
    } catch (err) {
      console.error('[MISE] Stripe billing info error:', err);
    }
  }

  return { tier, nextBillingDate, portalUrl, error: null };
}

// ---------------------------------------------------------------------------
// Tier mapping from Stripe price ID
// ---------------------------------------------------------------------------

export function tierFromPriceId(priceId: string): PlanTier | null {
  const plan = PLANS.find((p) => p.stripePriceId === priceId);
  return plan?.tier ?? null;
}
