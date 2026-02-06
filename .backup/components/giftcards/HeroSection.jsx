export default function HeroSection() {
    return (
        <section className="w-full bg-gradient-to-r from-blue-50 to-blue-100 border-b">
            <div className="max-w-7xl mx-auto px-6 lg:px-12 py-10">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                    Gift Card Marketplace
                </h1>
                <p className="mt-2 text-gray-600 text-sm md:text-base">
                    Browse and purchase verified gift cards at exclusive discounted prices
                </p>

                <div className="mt-6 flex flex-wrap gap-6 text-sm text-gray-700">
                    <div>
                        <strong className="font-semibold text-gray-900">100+</strong> Verified Cards
                    </div>
                    <div>
                        <strong className="font-semibold text-gray-900">24/7</strong> Support
                    </div>
                    <div>
                        <strong className="font-semibold text-gray-900">Secure</strong> Payments
                    </div>
                </div>
            </div>
        </section>
    );
}
