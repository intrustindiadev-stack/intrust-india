import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import PaymentForm from '../../components/payment/PaymentForm';
import PaymentSummary from '../../components/payment/PaymentSummary';
import { useRouter } from 'next/router';

const CheckoutPage = () => {
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // In a real app, amount/product would come from query params, cart, or context
    // Hardcoded for demonstration
    const amount = '100.00';
    const productDescription = 'Test Product Payment';

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                // Redirect to login if not authenticated
                router.push('/login?redirect=/payment/checkout'); // Adjust login route as needed
                return;
            }

            // Ideally fetch full profile from DB if metadata not enough
            setUserProfile({
                email: user.email,
                full_name: user.user_metadata?.full_name,
                phone: user.user_metadata?.phone
            });
            setLoading(false);
        };
        checkUser();
    }, [router]);

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading Checkout...</div>;

    return (
        <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">Secure Checkout</h1>

                <div className="md:grid md:grid-cols-2 md:gap-6">
                    <div className="md:col-span-1 mb-6 md:mb-0">
                        <PaymentSummary
                            amount={amount}
                            description={productDescription}
                            items={[{ name: 'Test Item', price: amount }]}
                        />
                    </div>

                    <div className="md:col-span-1">
                        <PaymentForm
                            amount={amount}
                            productDescription={productDescription}
                            userProfile={userProfile}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CheckoutPage;
