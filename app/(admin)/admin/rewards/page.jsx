import { RewardsAdminShell } from '@/components/admin/rewards/RewardsAdminShell';

export const metadata = {
    title: 'Reward Configuration | Admin',
    description: 'Configure and manage reward engine rules',
};

export default function RewardsAdminPage() {
    return <RewardsAdminShell />;
}
