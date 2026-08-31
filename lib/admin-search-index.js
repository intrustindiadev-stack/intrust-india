import {
  LayoutDashboard, Users, Store, Sprout, Wallet,
  CreditCard, MessageSquare, Settings, Activity
} from 'lucide-react';

export const NAV_ITEMS = [
  { id: 'nav-dashboard', label: 'Dashboard', href: '/admin', icon: LayoutDashboard, keywords: 'home overview stats' },
  { id: 'nav-users', label: 'Users', href: '/admin/users', icon: Users, keywords: 'customers accounts people' },
  { id: 'nav-merchants', label: 'Merchants', href: '/admin/merchants', icon: Store, keywords: 'business sellers vendors kyc' },
  { id: 'nav-ai-grow', label: 'AI Grow', href: '/admin/investments', icon: Sprout, keywords: 'investment grow yield merchants' },
  { id: 'nav-wallets', label: 'AI Grow Wallets', href: '/admin/ai-grow/wallets', icon: Wallet, keywords: 'balance adjust investment wallet' },
  { id: 'nav-store-status', label: 'Store Status', href: '/admin/store-status', icon: Activity, keywords: 'store status health' },
  { id: 'nav-store-credit', label: 'Store Credit', href: '/admin/merchants/udhari', icon: CreditCard, keywords: 'credit ledger balance' },
  { id: 'nav-whatsapp', label: 'WhatsApp Health', href: '/admin/whatsapp-health', icon: MessageSquare, keywords: 'whatsapp messages delivery health alerts' },
  { id: 'nav-settings', label: 'Settings', href: '/admin/settings', icon: Settings, keywords: 'config preferences' },
];

export const QUICK_ACTIONS = [
  { id: 'act-pending-merchants', label: 'Review pending merchants', href: '/admin/merchants?status=pending', keywords: 'approve kyc pending' },
  { id: 'act-adjust-wallet', label: 'Adjust an AI Grow wallet', href: '/admin/ai-grow/wallets', keywords: 'credit debit override balance' },
  { id: 'act-whatsapp-alerts', label: 'Check WhatsApp delivery alerts', href: '/admin/whatsapp-health', keywords: 'failed messages alerts' },
];
