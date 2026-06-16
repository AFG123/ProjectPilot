import { useState } from 'react';
import { Lock, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Loads Razorpay's checkout script once and caches it on window.
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

// Self-contained ₹49 unlock button. Used on GeneratePage, SavedPage and the
// locked DeepDivePage. On success it flips isPaid via setPaidUser, so the next
// deep dive opens fully (no reload) and the paywall CTAs disappear.
export default function UnlockButton({ label = 'Unlock all deep dives · ₹49', subtext = 'One-time · Instant access' }) {
  const { user, setPaidUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleUnlock() {
    setError('');
    setLoading(true);
    try {
      const ok = await loadRazorpayScript();
      if (!ok) throw new Error('Could not load the payment gateway. Check your connection.');

      // 1. Backend creates the order (price is fixed server-side).
      const orderRes = await fetch(`${import.meta.env.VITE_API_URL}/api/payment/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // sends the auth cookie
      });
      const order = await orderRes.json();
      if (!orderRes.ok) throw new Error(order.error || 'Could not start payment.');

      // 2. Open Razorpay's checkout popup. Razorpay handles card/UPI itself.
      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: 'ProjectPilot',
        description: 'Unlock all project deep dives',
        prefill: { name: user?.name, email: user?.email },
        theme: { color: '#6366f1' },
        // 3 + 4. Razorpay hands back the signed receipt → we verify server-side.
        handler: async (response) => {
          try {
            const verifyRes = await fetch(`${import.meta.env.VITE_API_URL}/api/payment/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include', // sends the auth cookie; server resets it with isPaid=true
              body: JSON.stringify(response),
            });
            const data = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(data.error || 'Payment verification failed.');
            setPaidUser(data.user); // isPaid → true, cards unlock now
          } catch (err) {
            setError(err.message);
          } finally {
            setLoading(false);
          }
        },
        // User closed the popup without paying — re-enable the button.
        modal: { ondismiss: () => setLoading(false) },
      });

      rzp.on('payment.failed', (resp) => {
        setError(resp.error?.description || 'Payment failed. Please try again.');
        setLoading(false);
      });

      rzp.open();
      // Note: do NOT reset loading here — the popup is now open and its
      // callbacks (handler / ondismiss / payment.failed) own the reset.
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="text-center py-4">
      <button
        onClick={handleUnlock}
        disabled={loading}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-brand-500/30"
      >
        {loading ? <><Loader2 size={14} className="animate-spin" /> Processing…</> : <><Lock size={14} /> {label}</>}
      </button>
      {error
        ? <p className="text-xs text-red-400 mt-2">{error}</p>
        : <p className="text-xs text-slate-600 mt-2">{subtext}</p>}
    </div>
  );
}
