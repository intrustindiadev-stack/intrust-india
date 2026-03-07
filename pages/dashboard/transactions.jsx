export async function getServerSideProps() {
    return {
        redirect: {
            destination: '/transactions',
            permanent: true,
        },
    }
}

export default function TransactionsDashboard() { return null; }
