'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function RatingPromptModal() {
    const [pendingRatingOrder, setPendingRatingOrder] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [feedback, setFeedback] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        const checkPendingRatings = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;

            const { data: orders, error } = await supabase
                .from('shopping_order_groups')
                .select(`
                    id, 
                    merchant_id, 
                    delivered_at,
                    merchants:merchant_id(business_name),
                    merchant_ratings(id)
                `)
                .eq('customer_id', session.user.id)
                .eq('delivery_status', 'delivered')
                .order('delivered_at', { ascending: false })
                .limit(5);

            if (error || !orders || orders.length === 0) return;

            const dismissedOrderId = sessionStorage.getItem('dismissedRatingOrderId');
            
            const pendingOrder = orders.find(order => 
                order.id !== dismissedOrderId && (!order.merchant_ratings || order.merchant_ratings.length === 0)
            );

            if (pendingOrder) {
                setPendingRatingOrder(pendingOrder);
                setIsVisible(true);
            }
        };

        checkPendingRatings();
    }, []);

    const handleDismiss = () => {
        if (pendingRatingOrder) {
            sessionStorage.setItem('dismissedRatingOrderId', pendingRatingOrder.id);
        }
        setIsVisible(false);
    };

    const handleSubmit = async () => {
        if (!rating || !pendingRatingOrder) return;
        setIsSubmitting(true);

        const { data: { session } } = await supabase.auth.getSession();
        
        try {
            const { error } = await supabase
                .from('merchant_ratings')
                .insert({
                    merchant_id: pendingRatingOrder.merchant_id,
                    customer_id: session.user.id,
                    rating_value: rating,
                    feedback_text: feedback,
                    shopping_order_group_id: pendingRatingOrder.id
                });
            
            if (error) throw error;

            toast.success("Thank you for your feedback!");
            setIsVisible(false);
        } catch (err) {
            console.error('Error submitting rating:', err);
            toast.error(err.message || 'Failed to submit rating');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isVisible || !pendingRatingOrder) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 50, scale: 0.95 }}
                className="fixed bottom-28 left-4 right-4 z-50 pointer-events-auto"
            >
                <div className="bg-white dark:bg-[#191c1e] rounded-2xl p-5 shadow-[0_12px_40px_rgba(25,28,30,0.12)] border border-gray-100 dark:border-white/5 relative overflow-hidden">
                    
                    {/* Background Glow */}
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-500/10 to-transparent pointer-events-none" />

                    <button 
                        onClick={handleDismiss}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors z-10"
                    >
                        <X size={20} />
                    </button>

                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">Rate your experience</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        How was your recent order from <span className="font-semibold text-gray-800 dark:text-gray-200">{pendingRatingOrder.merchants?.business_name || 'the merchant'}</span>?
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 italic">
                        Note: Your contact info may be shared with the merchant for feedback follow-up.
                    </p>

                    <div className="flex gap-2 justify-center mt-5 mb-4">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                onMouseEnter={() => setHoverRating(star)}
                                onMouseLeave={() => setHoverRating(0)}
                                className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
                            >
                                <Star 
                                    size={36} 
                                    className={`${
                                        star <= (hoverRating || rating)
                                            ? 'fill-yellow-400 text-yellow-400' 
                                            : 'text-gray-200 dark:text-gray-700'
                                    } transition-colors`}
                                />
                            </button>
                        ))}
                    </div>

                    <AnimatePresence>
                        {rating > 0 && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="flex flex-col gap-3"
                            >
                                <textarea 
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                    placeholder="Tell us what you liked (optional)"
                                    className="w-full bg-gray-50 dark:bg-[#2d3133] border border-gray-200 dark:border-white/10 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-gray-400 dark:text-white resize-none"
                                    rows={2}
                                />
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl py-3 text-sm transition-colors disabled:opacity-70 flex justify-center items-center"
                                >
                                    {isSubmitting ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        'Submit Rating'
                                    )}
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
