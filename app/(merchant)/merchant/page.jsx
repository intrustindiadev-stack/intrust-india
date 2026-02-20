'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MerchantIndexPage() {
    const router = useRouter();

    useEffect(() => {
        router.push('/merchant/dashboard');
    }, [router]);

    return null;
}
