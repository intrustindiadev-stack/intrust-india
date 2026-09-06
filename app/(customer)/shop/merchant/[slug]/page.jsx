import { redirect } from 'next/navigation';

export default async function MerchantAliasPage({ params, searchParams }) {
    const resolvedParams = await params;
    const slug = resolvedParams?.slug;
    const searchParamsObj = searchParams ? await searchParams : {};
    const qs = new URLSearchParams(searchParamsObj).toString();
    redirect(`/shop/${slug}${qs ? `?${qs}` : ''}`);
}
