"use client";

import React from "react";
import { 
  Package, 
  MapPin, 
  Clock, 
  ChevronLeft, 
  Store, 
  Phone, 
  CheckCircle2, 
  Truck, 
  ShoppingBag,
  HelpCircle,
  Download,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { motion } from "framer-motion";
import { generateOrderInvoice } from "@/lib/invoiceGenerator";

const OrderDetailsClient = ({ order, userId, customerProfile }) => {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const items = order.shopping_order_items || [];
  const status = order.delivery_status || 'pending';
  
  // Status check logic
  const steps = [
    { label: 'Ordered', icon: ShoppingBag, key: 'pending' },
    { label: 'Packed', icon: Package, key: 'packed' },
    { label: 'Shipped', icon: Truck, key: 'shipped' },
    { label: 'Delivered', icon: CheckCircle2, key: 'delivered' }
  ];

  const currentStepIndex = steps.findIndex(s => s.key === status);
  const isCancelled = status === 'cancelled';

  // Bill summary
  const billDetails = items.reduce((acc, item) => {
    const mrp = item.shopping_products?.mrp_paise || item.shopping_products?.suggested_retail_price_paise || item.unit_price_paise;
    acc.mrpTotal += (mrp * item.quantity);
    acc.sellingTotal += (item.unit_price_paise * item.quantity);
    return acc;
  }, { mrpTotal: 0, sellingTotal: 0 });

  const totalDiscount = billDetails.mrpTotal > billDetails.sellingTotal ? billDetails.mrpTotal - billDetails.sellingTotal : 0;
  const deliveryFee = order.delivery_fee_paise || 5000;
  const finalPayable = billDetails.sellingTotal + deliveryFee;

  return (
    <div className={`min-h-screen pb-24 pt-[12vh] sm:pt-[15vh] ${isDark ? 'bg-[#080a10] text-white' : 'bg-[#f7f8fa] text-slate-900'}`}>
      <div className="max-w-3xl mx-auto px-4">
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button 
            onClick={() => router.back()} 
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isDark ? 'bg-white/[0.04] border border-white/[0.06] text-white/50' : 'bg-white border border-slate-200 text-slate-500'}`}
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black">Order Details</h1>
            <p className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
              Order ID: {order.id.slice(0, 12)}
            </p>
          </div>
        </div>

        {/* Status Tracker */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={`rounded-2xl p-6 mb-6 ${isDark ? 'bg-[#12151c] border border-white/[0.06]' : 'bg-white border border-slate-100 shadow-sm'}`}
        >
          {isCancelled ? (
            <div className="flex items-center gap-3 text-red-500">
              <AlertCircle size={24} />
              <div>
                <h3 className="font-black text-lg">Order Cancelled</h3>
                <p className="text-xs opacity-80">This order was cancelled. Refunds are usually processed within 5-7 working days.</p>
              </div>
            </div>
          ) : (
            <div className="relative">
              <div className="flex justify-between relative z-10">
                {steps.map((step, idx) => {
                  const isActive = idx <= currentStepIndex;
                  const isCurrent = idx === currentStepIndex;
                  const Icon = step.icon;

                  return (
                    <div key={step.key} className="flex flex-col items-center gap-2 flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                        isActive 
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                          : isDark ? 'bg-white/[0.02] border-white/10 text-white/20' : 'bg-slate-50 border-slate-200 text-slate-300'
                      }`}>
                        <Icon size={18} />
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-tighter text-center ${
                        isActive ? 'text-emerald-500' : isDark ? 'text-white/20' : 'text-slate-400'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
              
              {/* Progress Line */}
              <div className={`absolute top-5 left-0 w-full h-0.5 -z-0 ${isDark ? 'bg-white/[0.05]' : 'bg-slate-100'}`} />
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
                className="absolute top-5 left-0 h-0.5 bg-emerald-500 -z-0"
              />
            </div>
          )}
        </motion.div>

        {/* Delivery Info */}
        {(status === 'shipped' || status === 'delivered') && order.tracking_number && (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={`rounded-2xl p-5 mb-6 flex flex-col sm:flex-row gap-4 justify-between sm:items-center ${isDark ? 'bg-[#12151c] border border-white/[0.06]' : 'bg-white border border-slate-100 shadow-sm'}`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-white/[0.04] text-white/50' : 'bg-violet-50 text-violet-600'}`}>
                <Truck size={18} />
              </div>
              <div>
                <h3 className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
                  Tracking Number
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="font-bold text-sm font-mono">{order.tracking_number}</p>
                  <button 
                    onClick={() => {
                        navigator.clipboard.writeText(order.tracking_number);
                        alert("Tracking number copied!");
                    }}
                    className={`text-[10px] px-2 py-1 rounded-lg font-black uppercase tracking-wider transition-all active:scale-95 ${isDark ? 'bg-white/[0.04] text-white/50 hover:bg-white/[0.08]' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
            
            {order.estimated_delivery_date && (
              <div className={`sm:text-right border-t sm:border-t-0 sm:border-l pt-3 sm:pt-0 sm:pl-5 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                <h3 className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
                  {status === 'delivered' ? 'Delivered On' : 'Estimated Delivery'}
                </h3>
                <p className={`font-black text-sm mt-0.5 ${status === 'delivered' ? 'text-emerald-500' : ''}`}>
                  {format(new Date(status === 'delivered' ? (order.updated_at || order.estimated_delivery_date) : order.estimated_delivery_date), "dd MMM yyyy")}
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Order Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <motion.div 
            initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }}
            className={`rounded-2xl p-4 ${isDark ? 'bg-[#12151c] border border-white/[0.06]' : 'bg-white border border-slate-100 shadow-sm'}`}
          >
            <h3 className={`text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2 ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
              <MapPin size={14} /> Delivery Address
            </h3>
            <div className="text-sm">
              <p className="font-bold mb-1">{order.customer_name || 'Customer'}</p>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                {order.delivery_address || 'No address provided'}
              </p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }}
            className={`rounded-2xl p-4 ${isDark ? 'bg-[#12151c] border border-white/[0.06]' : 'bg-white border border-slate-100 shadow-sm'}`}
          >
            <h3 className={`text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2 ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
              <Store size={14} /> Sold By
            </h3>
            <div className="text-sm">
              <p className="font-bold mb-1">
                {order.is_platform_order ? 'InTrust Official' : (items[0]?.merchants?.business_name || 'Merchant')}
              </p>
              {!order.is_platform_order && items[0]?.merchants?.business_address && (
                <p className={`text-xs leading-relaxed mb-2 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                  {items[0].merchants.business_address}
                </p>
              )}
              <div className="flex gap-2">
                {items[0]?.merchants?.business_phone && (
                  <a 
                    href={`tel:${items[0].merchants.business_phone}`}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1.5 transition-all ${isDark ? 'bg-white/[0.04] text-white/50 hover:bg-white/[0.08]' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                  >
                    <Phone size={10} /> {items[0].merchants.business_phone}
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Items List */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
          className={`rounded-2xl p-4 mb-6 ${isDark ? 'bg-[#12151c] border border-white/[0.06]' : 'bg-white border border-slate-100 shadow-sm'}`}
        >
          <h3 className={`text-xs font-black uppercase tracking-widest mb-4 ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
            Items ({items.length})
          </h3>
          <div className="space-y-4">
            {items.map((item) => {
              const sellingPrice = item.unit_price_paise;
              const mrp = item.shopping_products?.mrp_paise || item.shopping_products?.suggested_retail_price_paise || sellingPrice;
              const savings = mrp > sellingPrice ? mrp - sellingPrice : 0;

              return (
                <div key={item.id} className={`flex gap-3 pb-4 border-b last:border-b-0 last:pb-0 ${isDark ? 'border-white/[0.03]' : 'border-slate-50'}`}>
                  <div className={`w-14 h-14 rounded-xl overflow-hidden p-1 flex items-center justify-center ${isDark ? 'bg-black/20' : 'bg-slate-50 shadow-inner'}`}>
                    <img src={item.shopping_products?.image_url} alt="" className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold line-clamp-1">{item.shopping_products?.title}</h4>
                    <p className={`text-[10px] font-bold mt-0.5 ${isDark ? 'text-white/30' : 'text-slate-400'}`}>Qty: {item.quantity}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-sm font-black">₹{(sellingPrice / 100).toLocaleString('en-IN')}</span>
                      {savings > 0 && (
                        <span className="text-[10px] line-through opacity-30">₹{(mrp / 100).toLocaleString('en-IN')}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Bill Summary */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
          className={`rounded-2xl p-5 ${isDark ? 'bg-[#12151c] border border-white/[0.06]' : 'bg-white border border-slate-100 shadow-sm'}`}
        >
          <h3 className={`text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
            <Download size={14} /> Bill Summary
          </h3>
          
          <div className="space-y-3 text-sm font-medium">
            <div className="flex justify-between items-center">
              <span className={isDark ? 'text-white/40' : 'text-slate-500'}>Item Total (at MRP)</span>
              <span>₹{(billDetails.mrpTotal / 100).toLocaleString('en-IN')}</span>
            </div>
            
            {totalDiscount > 0 && (
              <div className="flex justify-between items-center text-emerald-500">
                <span>Product Savings</span>
                <span className="font-bold">- ₹{(totalDiscount / 100).toLocaleString('en-IN')}</span>
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <span className={isDark ? 'text-white/40' : 'text-slate-500'}>Delivery Charges</span>
              <span>₹{(deliveryFee / 100).toLocaleString('en-IN')}</span>
            </div>

            <div className={`mt-4 pt-4 border-t border-dashed ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
              <div className="flex justify-between items-end">
                <span className="text-base font-black">Total Paid</span>
                <span className="text-2xl font-black">₹{(finalPayable / 100).toLocaleString('en-IN')}</span>
              </div>
              <p className={`text-[10px] font-bold mt-1 text-right ${isDark ? 'text-white/20' : 'text-slate-400'}`}>
                Paid using InTrust Wallet
              </p>
            </div>
          </div>

          {totalDiscount > 0 && (
            <div className={`mt-5 p-3 rounded-xl flex items-center gap-3 border ${isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
              <CheckCircle2 size={18} />
              <p className="text-xs font-black italic">
                You saved ₹{(totalDiscount / 100).toLocaleString('en-IN')} on this order!
              </p>
            </div>
          )}

          <div className="mt-8 flex gap-3">
            <button 
              onClick={() => {
                const items = order.shopping_order_items || [];
                const merchant = items[0]?.merchants;
                generateOrderInvoice({
                  order: order,
                  items: items,
                  seller: order.is_platform_order
                    ? {
                        name: 'Intrust Financial Services (India) Pvt. Ltd.',
                        address: 'TF-312/MM09, Ashima Mall, Narmadapuram Rd, Danish Naga, Bhopal, MP 462026',
                        phone: '18002030052',
                        gstin: '23AAFC14866A1ZV',
                      }
                    : {
                        name: merchant?.business_name || 'Merchant',
                        address: merchant?.business_address || '',
                        phone: merchant?.business_phone || '',
                        gstin: merchant?.gst_number || 'Unregistered',
                      },
                  customer: {
                    name: customerProfile?.full_name || order.customer_name || 'Customer',
                    phone: customerProfile?.phone || order.customer_phone || '',
                    address: order.delivery_address || '',
                  },
                  type: 'shopping',
                });
              }}
              className={`flex-1 py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all active:scale-95 ${isDark ? 'bg-white/[0.04] hover:bg-white/[0.08]' : 'bg-slate-50 hover:bg-slate-100'}`}
            >
              <Download size={14} /> Download Invoice
            </button>
            {status === 'pending' ? (
              <Link 
                href="/contact"
                className={`flex-1 py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all active:scale-95 ${isDark ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
              >
                <HelpCircle size={14} /> Contact to Cancel
              </Link>
            ) : (
              <Link 
                href="/contact"
                className={`flex-1 py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all active:scale-95 ${isDark ? 'bg-white/[0.04] hover:bg-white/[0.08]' : 'bg-slate-50 hover:bg-slate-100'}`}
              >
                <HelpCircle size={14} /> Support
              </Link>
            )}
          </div>
        </motion.div>

        {/* Safe Area Spacer for Bottom Nav */}
        <div className="h-10 md:hidden" />
      </div>
    </div>
  );
};

export default OrderDetailsClient;
