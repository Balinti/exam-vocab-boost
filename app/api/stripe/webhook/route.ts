import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  if (!stripe) {
    console.log('Stripe not configured');
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  let event: Stripe.Event;

  try {
    // Verify webhook signature if secret is available
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } else {
      // Parse without verification (not recommended for production)
      event = JSON.parse(body) as Stripe.Event;
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error('Error handling webhook:', err);
  }

  // Always return 200 to acknowledge receipt
  return NextResponse.json({ received: true }, { status: 200 });
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const metadata = session.metadata || {};
  const userId = metadata.user_id;
  const tier = metadata.tier;
  const appName = metadata.app_name;

  console.log('Checkout completed:', { userId, tier, appName });

  if (!userId || appName !== 'exam-vocab-boost') {
    console.log('Skipping: no user_id or wrong app');
    return;
  }

  // Update entitlements in database
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('Supabase not configured, skipping database update');
    return;
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/entitlements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        user_id: userId,
        tier: tier,
        active: true,
        purchased_at: new Date().toISOString(),
        stripe_customer_id: session.customer as string,
        stripe_session_id: session.id,
        updated_at: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error updating entitlements:', errorText);
    } else {
      console.log('Entitlement updated successfully');
    }
  } catch (err) {
    console.error('Database update error:', err);
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  // Handle subscription updates (even though we're doing one-time purchases)
  console.log('Subscription updated:', subscription.id);

  const customerId = subscription.customer as string;
  const status = subscription.status;

  // Get customer metadata if needed
  if (stripe && customerId) {
    try {
      const customer = await stripe.customers.retrieve(customerId);
      console.log('Customer:', (customer as Stripe.Customer).email);
    } catch (err) {
      console.error('Error retrieving customer:', err);
    }
  }

  // Update database if needed
  console.log(`Subscription ${subscription.id} status: ${status}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  // Handle subscription deletion
  console.log('Subscription deleted:', subscription.id);

  // For one-time purchases, this shouldn't happen, but handle gracefully
  const customerId = subscription.customer as string;
  console.log(`Customer ${customerId} subscription deleted`);
}
