import RazorpayButton from '@/components/RazorpayButton';

export default function PaymentTestPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-lg text-center">
                <h1 className="text-2xl font-bold mb-4">Razorpay Payment Integration</h1>
                <p className="text-gray-600 mb-6">
                    Click the button below to test the payment flow in Test Mode.
                </p>
                <RazorpayButton amount={500} />
            </div>
        </div>
    );
}
