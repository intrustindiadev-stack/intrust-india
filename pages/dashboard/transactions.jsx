import Head from 'next/head';

export async function getServerSideProps() {
    return {
        redirect: {
            destination: '/transactions',
            permanent: true,
        },
    }
}

export default function TransactionsDashboard() {
    return (
        <>
            <Head>
                <title>Transactions — InTrust India</title>
                <meta name="robots" content="noindex, nofollow" />
                <link rel="canonical" href="https://www.intrustindia.com/transactions" />
            </Head>
            <div />
        </>
    );
}
