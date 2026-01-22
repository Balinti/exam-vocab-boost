'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PRICING_TIERS } from '@/lib/constants';
import { getEntitlement } from '@/lib/storage';
import { getCurrentUser } from '@/lib/auth';

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [entitlement, setEntitlement] = useState<{ tier: string; active: boolean }>({ tier: 'free', active: false });
  const [priceIdsAvailable, setPriceIdsAvailable] = useState(true);

  useEffect(() => {
    const currentEntitlement = getEntitlement();
    setEntitlement(currentEntitlement);

    // Check if price IDs are configured
    const tier1 = process.env.NEXT_PUBLIC_STRIPE_TIER1_PRICE_ID;
    const tier2 = process.env.NEXT_PUBLIC_STRIPE_TIER2_PRICE_ID;
    if (!tier1 && !tier2) {
      setPriceIdsAvailable(false);
    }
  }, []);

  const handlePurchase = async (tier: 'tier_1' | 'tier_2') => {
    const user = getCurrentUser();

    if (!user) {
      // Redirect to sign in
      alert('Please sign in to purchase');
      return;
    }

    setLoading(tier);
    setError(null);

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${window.AUTH_SESSION?.access_token || ''}`,
        },
        body: JSON.stringify({ tier }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(null);
    }
  };

  if (entitlement.tier !== 'free' && entitlement.active) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-white rounded-2xl shadow-sm p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">You have {entitlement.tier === 'tier_1' ? 'Full Access' : 'Full Access + Cram Mode'}</h1>
            <p className="text-gray-600 mb-6">
              Thank you for your purchase! All premium features are unlocked.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Unlock Your Full Potential
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            One-time purchase. Lifetime access. No subscriptions.
          </p>
        </div>

        {!priceIdsAvailable && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-8 text-center">
            <p className="text-yellow-800">
              Payment system is not configured. Contact support for purchasing options.
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8 text-center">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Tier 1 */}
          <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-100 p-8">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {PRICING_TIERS.TIER_1.name}
              </h2>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold text-gray-900">
                  ${PRICING_TIERS.TIER_1.price}
                </span>
                <span className="text-gray-500">one-time</span>
              </div>
            </div>

            <ul className="space-y-3 mb-8">
              {PRICING_TIERS.TIER_1.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handlePurchase('tier_1')}
              disabled={loading === 'tier_1' || !priceIdsAvailable}
              className="w-full bg-gray-900 text-white py-4 rounded-xl font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === 'tier_1' ? 'Processing...' : 'Get Full Access'}
            </button>
          </div>

          {/* Tier 2 */}
          <div className="bg-white rounded-2xl shadow-lg border-2 border-blue-500 p-8 relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="bg-blue-500 text-white text-sm font-semibold px-4 py-1 rounded-full">
                BEST VALUE
              </span>
            </div>

            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {PRICING_TIERS.TIER_2.name}
              </h2>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold text-gray-900">
                  ${PRICING_TIERS.TIER_2.price}
                </span>
                <span className="text-gray-500">one-time</span>
              </div>
            </div>

            <ul className="space-y-3 mb-8">
              {PRICING_TIERS.TIER_2.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handlePurchase('tier_2')}
              disabled={loading === 'tier_2' || !priceIdsAvailable}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === 'tier_2' ? 'Processing...' : 'Get Full Access + Cram Mode'}
            </button>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">
                Is this a subscription?
              </h3>
              <p className="text-gray-600">
                No! This is a one-time purchase. Pay once and get lifetime access to all features included in your tier.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">
                What's included in the free version?
              </h3>
              <p className="text-gray-600">
                Free users can complete the diagnostic test and get their Score Leak Report, plus one free focused drill session. Premium unlocks unlimited adaptive drills and progress tracking.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">
                What's the Cram Mode Pack?
              </h3>
              <p className="text-gray-600">
                The Cram Mode Pack includes intensive practice sessions designed for exam week, plus exam day preparation guides and downloadable study materials for offline review.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">
                Do I need an account?
              </h3>
              <p className="text-gray-600">
                Yes, you'll need to create a free account (Google sign-in) to purchase. This ensures your progress is saved and you can access your purchase from any device.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
