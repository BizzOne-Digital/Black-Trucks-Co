import Link from 'next/link';
import { ArrowLeft, CreditCard } from 'lucide-react';

export default function PaymentCancelledPage() {
  return (
    <div className="min-h-screen bg-gray-50 pt-12 flex flex-col items-center justify-center px-4 pb-20">
      <div className="max-w-md w-full bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden text-center">
        <div className="bg-gray-100 px-6 py-10">
          <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Checkout cancelled</h1>
          <p className="text-sm text-gray-600">
            No worries — you haven&apos;t been charged. When you&apos;re ready, you can return to checkout and pay securely with Stripe.
          </p>
        </div>
        <div className="px-6 py-8 space-y-3">
          <Link
            href="/checkout"
            className="flex items-center justify-center gap-2 w-full bg-black hover:bg-gray-800 text-white py-3 rounded-lg text-sm font-semibold transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to checkout
          </Link>
          <Link
            href="/booking"
            className="block w-full border border-gray-300 hover:border-gray-500 text-gray-800 py-3 rounded-lg text-sm font-medium transition-colors"
          >
            Start a new booking
          </Link>
        </div>
      </div>
    </div>
  );
}
