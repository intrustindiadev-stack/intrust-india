import QuickActionsDesktop from './QuickActionsDesktop';
import QuickActionsMobile from './QuickActionsMobile';
import { getQuickActions } from './quickActionsData';

export { QuickActionsDesktop, QuickActionsMobile, getQuickActions };

export default function QuickActions({ shoppingStats, className = '' }) {
    return (
        <>
            <QuickActionsDesktop shoppingStats={shoppingStats} className={className} />
            <QuickActionsMobile shoppingStats={shoppingStats} />
        </>
    );
}
