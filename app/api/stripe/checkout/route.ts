import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!stripe) {
      return NextResponse.json(
        { error: 'Payment system not configured. Please contact support.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { tier } = body;

    // Get price ID based on tier
    let priceId: string | undefined;
    if (tier === 'tier_1') {
      priceId = process.env.NEXT_PUBLIC_STRIPE_TIER1_PRICE_ID;
    } else if (tier === 'tier_2') {
      priceId = process.env.NEXT_PUBLIC_STRIPE_TIER2_PRICE_ID;
    }

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price not configured for this tier. Please contact support.' },
        { status: 400 }
      );
    }

    // Get user from authorization header if present
    const authHeader = request.headers.get('Authorization');
    let userId: string | undefined;
    let userEmail: string | undefined;

    if (authHeader?.startsWith('Bearer ')) {
      // Verify token with shared Supabase auth
      const token = authHeader.slice(7);
      try {
        const response = await fetch('https://api.srv936332.hstgr.cloud/auth/v1/user', {
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UiLAogICJpYXQiOiAxNzM2NjIyNDAwLAogICJleHAiOiAxODk0Mzg4ODAwCn0.FyT4wqGqgkMOlnPr-W4I3xZcvPsOsqdMqOgflJhdBWo',
          },
        });

        if (response.ok) {
          const userData = await response.json();
          userId = userData.id;
          userEmail = userData.email;
        }
      } catch (err) {
        console.error('Error verifying token:', err);
      }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/checkout/cancel`,
      customer_email: userEmail,
      metadata: {
        app_name: 'exam-vocab-boost',
        tier,
        user_id: userId || '',
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
