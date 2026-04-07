// =============================================================================
// MISE Stripe Webhook Handler
// =============================================================================
// Handles Stripe webhook events for subscription lifecycle management.
// All handlers are idempotent — duplicate events are safely ignored.
// Requirements: 13.3, 13.4, 13.5, 13.6, 13.7, 13.8
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServiceClient } from '@/lib/supabase/server';
import { tierFromPriceId } from '@/lib/billing-service';
import { sendPaymentFailedEmail } from '@/lib/email-service';

function getStripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-03-25.dahlia',
  });
}

// ---------------------------------------------------------------------------
// POST /api/webhooks/stripe
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('[MISE] Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createServiceClient();

  try {
    switch (event.type) {
      // -----------------------------------------------------------------
      // checkout.session.completed → update tier + stripe_customer_id
      // -----------------------------------------------------------------
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const tier = session.metadata?.tier;

        if (userId && tier) {
          await supabase
            .from('users')
            .update({
              tier,
              stripe_customer_id: session.customer as string,
            })
            .eq('id', userId);
        }
        break;
      }

      // -----------------------------------------------------------------
      // customer.subscription.updated → update tier
      // -----------------------------------------------------------------
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer.id;

        const priceId = subscription.items.data[0]?.price?.id;
        if (priceId) {
          const newTier = tierFromPriceId(priceId);
          if (newTier) {
            await supabase
              .from('users')
              .update({ tier: newTier })
              .eq('stripe_customer_id', customerId);
          }
        }
        break;
      }

      // -----------------------------------------------------------------
      // customer.subscription.deleted → set tier to free at period end
      // -----------------------------------------------------------------
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer.id;

        // Subscription has ended — downgrade to free
        await supabase
          .from('users')
          .update({ tier: 'free' })
          .eq('stripe_customer_id', customerId);
        break;
      }

      // -----------------------------------------------------------------
      // invoice.payment_failed → grace period + email
      // -----------------------------------------------------------------
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === 'string'
            ? invoice.customer
            : invoice.customer?.id;

        if (customerId) {
          const { data: user } = await supabase
            .from('users')
            .select('email')
            .eq('stripe_customer_id', customerId)
            .single();

          if (user?.email) {
            // Create a portal URL for the user to update payment
            const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
            try {
              const portalSession = await stripe.billingPortal.sessions.create({
                customer: customerId,
                return_url: `${appUrl}/settings`,
              });
              await sendPaymentFailedEmail(user.email, portalSession.url);
            } catch {
              // If portal creation fails, send email with settings link
              await sendPaymentFailedEmail(user.email, `${appUrl}/settings`);
            }
          }
        }
        break;
      }

      default:
        // Unhandled event type — acknowledge receipt
        break;
    }
  } catch (err) {
    console.error(`[MISE] Webhook handler error for ${event.type}:`, err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
