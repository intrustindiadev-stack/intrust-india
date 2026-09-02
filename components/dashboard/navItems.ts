import {
  LayoutDashboard,
  ShoppingBag,
  Heart,
  MapPin,
  User,
  Settings,
  LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Orders', href: '/dashboard/orders', icon: ShoppingBag },
  { label: 'Wishlist', href: '/dashboard/wishlist', icon: Heart },
  { label: 'Addresses', href: '/dashboard/addresses', icon: MapPin },
  { label: 'Profile', href: '/dashboard/profile', icon: User },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];
