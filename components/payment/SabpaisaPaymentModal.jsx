import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  CreditCard,
  Building,
  Smartphone,
  Wallet,
  ShieldCheck,
  Loader2,
  Tag,
  Gift,
} from "lucide-react";
import PaymentMethodCard from "./PaymentMethodCard";
import WalletPaymentOption from "./WalletPaymentOption";
import { submitPaymentForm } from "sabpaisa-pg-dev";
import { useWallet } from "@/hooks/useWallet";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function SabpaisaPaymentModal({
  isOpen,
  onClose,
  amount,
  user,
  productInfo,
  metadata,
}) {
  const { balance, fetchBalance, debitWallet } = useWallet();
  const router = useRouter();

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  // Wallet topup states
  const [showTopupInput, setShowTopupInput] = useState(false);
  const [topupAmount, setTopupAmount] = useState("");

  // Refresh wallet balance when modal opens
  useEffect(() => {
    if (isOpen && user) {
      fetchBalance();
    }
  }, [isOpen, user, fetchBalance]);

  // Handle Payment Selection
  const handlePayment = async (method, customAmount = null) => {
    setError(null);
    setProcessing(true);

    // Use customAmount for wallet topup, otherwise use the prop amount
    const paymentAmount = customAmount || amount;

    try {
      if (method === "WALLET") {
        // ── Wallet Integrity Check ──
        // Directly fetch latest balance from server (React state might be stale in this closure)
        const {
          data: { session: walletSession },
        } = await supabase.auth.getSession();
        if (!walletSession) throw new Error("Please log in to continue");

        const balanceRes = await fetch("/api/wallet/balance", {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${walletSession.access_token}`,
          },
        });

        if (!balanceRes.ok) throw new Error("Failed to verify wallet balance");

        const balanceData = await balanceRes.json();
        const serverBalance = parseFloat(balanceData.wallet?.balance) || 0;

        // Also refresh the UI state so the component re-renders with fresh data
        fetchBalance();

        if (serverBalance < paymentAmount) {
          setError(
            `Insufficient wallet balance. Current balance: ₹${serverBalance.toLocaleString("en-IN")}, required: ₹${paymentAmount.toLocaleString("en-IN")}`,
          );
          setProcessing(false);
          return;
        }

        if (metadata?.type === "gift_card_purchase") {
          // Wallet Payment specifically for Gift Cards
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session) throw new Error("Please log in to continue");

          const response = await fetch("/api/gift-cards/buy-wallet", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              couponId: metadata.coupon_id,
            }),
          });

          const result = await response.json();
          if (!response.ok) {
            throw new Error(
              result.error || "Failed to purchase gift card with wallet",
            );
          }

          // Success - refresh balance and redirect
          await fetchBalance();
          router.push("/my-giftcards");
        } else {
          // Default generic Wallet Payment
          const txn = await debitWallet(
            amount,
            productInfo.id, // reference_id
            "GIFT_CARD_PURCHASE", // Or generic purchase
            `Purchase of ${productInfo.title}`,
          );

          router.push("/my-giftcards");
        }
        return; // Important: Exit after successful wallet payment
      }

      // Sabpaisa Gateway Payment - App Router Flow (for Gift Card/Topup via UPI/Card/etc)
      const {
        data: { session, user: sessionUser },
      } = await supabase.auth.getSession();

      if (!session && process.env.NODE_ENV !== "development") throw new Error("Please log in to continue");

      // Ensure values are strings and formatted properly
      const formattedAmount = Number(paymentAmount).toString(); // SDK wants string or number

      let clientTxnId, udf1, udf2;
      if (method === "ADD_TO_WALLET") {
        clientTxnId = `WLT_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        udf1 = "WALLET_TOPUP";
        udf2 = "WALLET_TOPUP";
      } else {
        clientTxnId = `GC_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        udf1 = "GIFT_CARD";
        udf2 = productInfo?.id || "mock_product";
      }

      // Build Payload according to Sabpaisa NextJS Docs
      const paymentData = {
        clientCode: process.env.NEXT_PUBLIC_SABPAISA_CLIENT_CODE,
        transUserName: process.env.NEXT_PUBLIC_SABPAISA_USERNAME,
        transUserPassword: process.env.NEXT_PUBLIC_SABPAISA_PASSWORD,
        authKey: process.env.NEXT_PUBLIC_SABPAISA_AUTH_KEY,
        authIV: process.env.NEXT_PUBLIC_SABPAISA_AUTH_IV,
        callbackUrl: process.env.NEXT_PUBLIC_APP_URL + "/api/sabpaisa/callback",
        payerName: user?.user_metadata?.full_name || "Guest User",
        payerEmail: user?.email || "guest@example.com",
        payerMobile: user?.phone || "9999999999",
        clientTxnId: clientTxnId,
        amount: formattedAmount,
        channelId: "W",
        env: process.env.NEXT_PUBLIC_SABPAISA_ENV || "prod",
        udf1: udf1,
        udf2: udf2,
        udf3: "", udf4: "", udf5: "", udf6: "", udf7: "", udf8: "", udf9: "", udf10: "",
        udf11: "", udf12: "", udf13: "", udf14: "", udf15: "", udf16: "", udf17: "", udf18: "", udf19: "", udf20: "",
        payerVpa: "", modeTransfer: "", byPassFlag: "", cardHolderName: "", pan: "", cardExpMonth: "", cardExpYear: "", cardType: "", cvv: "", browserDetails: "", bankId: ""
      };

      console.log("Submitting to Sabpaisa SDK:", { ...paymentData, transUserPassword: "***", authKey: "***", authIV: "***" });

      // This SDK function creates and submits the form dynamically
      await submitPaymentForm(paymentData);

    } catch (err) {
      console.error(err);
      setError(err.message || "Payment processing failed");
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4"
        onClick={onClose}
      >
        {/* Modal */}
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="
                        w-full max-w-[900px]
                        bg-white rounded-3xl shadow-2xl
                        overflow-hidden flex flex-col md:flex-row
                        max-h-[90vh] relative
                    "
        >
          {/* ═══ LEFT PANEL: Order Summary ═══ */}
          <div
            className="
                        w-full md:w-[42%]
                        bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900
                        text-white p-7 md:p-8 flex flex-col
                        relative overflow-hidden
                    "
          >
            {/* Decorative blob */}
            <div className="absolute -top-20 -right-20 w-56 h-56 bg-indigo-400 rounded-full blur-3xl opacity-20 pointer-events-none" />
            <div className="absolute -bottom-16 -left-10 w-40 h-40 bg-purple-500 rounded-full blur-3xl opacity-20 pointer-events-none" />

            <div className="relative flex-1">
              <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
                <span className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-sm">
                  🧾
                </span>
                Order Summary
              </h2>

              {/* Product Preview Card */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/10 mb-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 bg-white/10 rounded-xl flex items-center justify-center">
                    <Gift size={20} className="text-indigo-200" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">
                      {productInfo?.title || "Gift Card"}
                    </p>
                    <p className="text-xs text-indigo-300/80">
                      Digital Gift Card
                    </p>
                  </div>
                </div>
                {metadata?.face_value && metadata.face_value !== amount && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/15 border border-emerald-400/20 rounded-lg">
                    <Tag size={12} className="text-emerald-300" />
                    <span className="text-xs font-semibold text-emerald-300">
                      ₹{metadata.face_value} value at ₹{amount} —{" "}
                      {Math.round(
                        ((metadata.face_value - amount) / metadata.face_value) *
                        100,
                      )}
                      % off
                    </span>
                  </div>
                )}
              </div>

              {/* Total Amount Card */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 border border-white/10 mb-5 shadow-inner">
                <p className="text-indigo-200 text-xs uppercase tracking-widest font-semibold mb-1">
                  Total Payable
                </p>
                <p className="text-4xl font-black leading-none tracking-tight">
                  <span className="text-indigo-300 text-2xl font-bold mr-0.5">
                    ₹
                  </span>
                  {amount?.toLocaleString("en-IN") || "0"}
                </p>
              </div>

              {/* Details */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-indigo-300/80">Product</span>
                  <span className="font-semibold text-white text-right max-w-[55%] truncate">
                    {productInfo?.title || "—"}
                  </span>
                </div>
                {metadata?.face_value && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-indigo-300/80">Face Value</span>
                    <span className="font-semibold text-white">
                      ₹{metadata.face_value?.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-indigo-300/80">Selling Price</span>
                  <span className="font-semibold text-white">
                    ₹{amount?.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-indigo-300/80">User</span>
                  <span className="font-semibold text-white text-right max-w-[55%] truncate">
                    {user?.email || "Guest"}
                  </span>
                </div>
              </div>

              <div className="h-px bg-white/10 my-4" />

              <div className="flex items-center gap-2 text-xs text-indigo-300">
                <ShieldCheck size={14} />
                <span>256-bit Secure Encryption</span>
              </div>
            </div>

            {/* Bottom branding */}
            <div className="relative mt-6 pt-4 border-t border-white/5 text-center">
              <p className="text-indigo-400 text-[11px] font-medium tracking-wide">
                Secured by{" "}
                <span className="font-bold text-indigo-300">SabPaisa</span>
              </p>
            </div>
          </div>

          {/* ═══ RIGHT PANEL: Payment Methods ═══ */}
          <div className="w-full md:w-[58%] p-5 sm:p-7 overflow-y-auto bg-gray-50 relative">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">
                Select Payment Mode
              </h3>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <X size={16} className="text-gray-500" />
              </button>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className="mb-5 overflow-hidden"
                >
                  <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium flex items-start gap-2">
                    <svg
                      className="w-4 h-4 mt-0.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>{error}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Merchant Wallet Option ── */}
            <WalletPaymentOption
              balance={balance?.balance || 0}
              requiredAmount={amount}
              onPay={() => handlePayment("WALLET")}
              onTopup={() => setShowTopupInput(true)}
            />

            {/* ── Wallet Topup Input ── */}
            <AnimatePresence>
              {showTopupInput && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mb-5"
                >
                  <div className="p-5 rounded-2xl border-2 border-indigo-200 bg-indigo-50">
                    <h4 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <span className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 text-xs">
                        �
                      </span>
                      Add Money to Wallet
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                          Enter Amount (₹)
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={topupAmount}
                          onChange={(e) => setTopupAmount(e.target.value)}
                          placeholder="Enter amount to add"
                          className="
                                                        w-full px-4 py-3 border-2 border-indigo-200 rounded-xl
                                                        focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400
                                                        text-gray-900 text-sm font-medium bg-white
                                                        placeholder-gray-400 transition-all focus:outline-none
                                                    "
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const addAmount = parseFloat(topupAmount);
                            if (addAmount && addAmount > 0) {
                              handlePayment("ADD_TO_WALLET", addAmount);
                              setShowTopupInput(false);
                            } else {
                              setError("Please enter a valid amount");
                            }
                          }}
                          disabled={processing || !topupAmount}
                          className="
                                                        flex-1 px-5 py-3
                                                        bg-gradient-to-r from-indigo-500 to-indigo-700
                                                        hover:from-indigo-600 hover:to-indigo-800
                                                        text-white rounded-xl font-bold text-sm
                                                        shadow-lg shadow-indigo-200
                                                        disabled:opacity-40 disabled:cursor-not-allowed
                                                        transition-all
                                                    "
                        >
                          {processing ? "Processing..." : "Proceed to Pay"}
                        </button>
                        <button
                          onClick={() => {
                            setShowTopupInput(false);
                            setTopupAmount("");
                          }}
                          className="px-5 py-3 bg-white border-2 border-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Other Methods ── */}
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px bg-gray-200 flex-1" />
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                Other Payment Methods
              </h4>
              <div className="h-px bg-gray-200 flex-1" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <PaymentMethodCard
                method="UPI"
                icon={<Smartphone className="w-5 h-5 text-emerald-600" />}
                onClick={() => handlePayment("UPI")}
                disabled={processing}
              />
              <PaymentMethodCard
                method="Cards"
                icon={<CreditCard className="w-5 h-5 text-blue-600" />}
                onClick={() => handlePayment("CARD")}
                disabled={processing}
              />
              <PaymentMethodCard
                method="Net Banking"
                icon={<Building className="w-5 h-5 text-indigo-600" />}
                onClick={() => handlePayment("NET_BANKING")}
                disabled={processing}
              />
              <PaymentMethodCard
                method="Wallet"
                icon={<Wallet className="w-5 h-5 text-purple-600" />}
                onClick={() => handlePayment("WALLET_PG")}
                disabled={processing}
              />
            </div>

            {/* Processing overlay */}
            <AnimatePresence>
              {processing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-10 rounded-r-3xl"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                    </div>
                    <p className="font-bold text-gray-900 text-sm">
                      Processing Secure Payment…
                    </p>
                    <p className="text-xs text-gray-400">
                      Please don&apos;t close this window
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

