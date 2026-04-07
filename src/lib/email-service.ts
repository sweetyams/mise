// =============================================================================
// MISE Email Service — Resend integration
// =============================================================================
// Transactional email using Resend. All copy in Canadian English.
// Requirements: 18.1, 18.2, 18.3
// =============================================================================

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'MISE <noreply@mise.cooking>';

// ---------------------------------------------------------------------------
// sendWelcomeEmail
// ---------------------------------------------------------------------------

export async function sendWelcomeEmail(
  email: string,
  name: string
): Promise<{ error: string | null }> {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Welcome to MISE — Your Culinary Development Engine',
      html: `
        <h1>Welcome to MISE, ${name}!</h1>
        <p>We're thrilled to have you on board. MISE is your personal culinary development engine — a place where AI meets real cooking knowledge to help you create restaurant-quality recipes tailored to your taste.</p>
        <p>Here's what you can do right away:</p>
        <ul>
          <li>Generate your first recipe with our 4-layer prompt architecture</li>
          <li>Choose a Chef Fingerprint to match your favourite cooking style</li>
          <li>Build your Chef Brain — it learns your preferences over time</li>
        </ul>
        <p>Your free tier includes 10 generations per month. When you're ready for unlimited access, check out our <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://mise.cooking'}/pricing">pricing plans</a>.</p>
        <p>Happy cooking!</p>
        <p>— The MISE Team</p>
      `,
    });
    return { error: null };
  } catch (err) {
    console.error('[MISE] Failed to send welcome email:', err);
    return { error: err instanceof Error ? err.message : 'Failed to send email' };
  }
}

// ---------------------------------------------------------------------------
// sendPaymentFailedEmail
// ---------------------------------------------------------------------------

export async function sendPaymentFailedEmail(
  email: string,
  portalUrl: string
): Promise<{ error: string | null }> {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'MISE — Payment Issue with Your Subscription',
      html: `
        <h1>We had trouble processing your payment</h1>
        <p>Your most recent payment for your MISE subscription didn't go through. Don't worry — your account is still active for now, but we'll need to sort this out within the next 7 days.</p>
        <p>Please update your payment details to keep your subscription running smoothly:</p>
        <p><a href="${portalUrl}" style="display:inline-block;padding:12px 24px;background:#1a1a1a;colour:#fff;color:#fff;text-decoration:none;border-radius:6px;">Update Payment Details</a></p>
        <p>If you have any questions, just reply to this email.</p>
        <p>— The MISE Team</p>
      `,
    });
    return { error: null };
  } catch (err) {
    console.error('[MISE] Failed to send payment failed email:', err);
    return { error: err instanceof Error ? err.message : 'Failed to send email' };
  }
}

// ---------------------------------------------------------------------------
// sendGracePeriodReminderEmail
// ---------------------------------------------------------------------------

export async function sendGracePeriodReminderEmail(
  email: string,
  daysRemaining: number,
  portalUrl: string
): Promise<{ error: string | null }> {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `MISE — ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left to update your payment`,
      html: `
        <h1>Your grace period is ending soon</h1>
        <p>You have <strong>${daysRemaining} day${daysRemaining === 1 ? '' : 's'}</strong> remaining to update your payment details before your MISE subscription is downgraded to the Free tier.</p>
        <p>If your subscription lapses, you'll lose access to:</p>
        <ul>
          <li>Unlimited recipe generations</li>
          <li>Your recipe library and saved favourites</li>
          <li>All Chef Fingerprints</li>
          <li>Export and sharing features</li>
        </ul>
        <p>Update your payment now to keep everything running:</p>
        <p><a href="${portalUrl}" style="display:inline-block;padding:12px 24px;background:#1a1a1a;colour:#fff;color:#fff;text-decoration:none;border-radius:6px;">Update Payment Details</a></p>
        <p>— The MISE Team</p>
      `,
    });
    return { error: null };
  } catch (err) {
    console.error('[MISE] Failed to send grace period email:', err);
    return { error: err instanceof Error ? err.message : 'Failed to send email' };
  }
}
