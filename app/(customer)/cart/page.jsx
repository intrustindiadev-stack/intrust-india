import { redirect } from 'next/navigation';

export default function CustomerCartRedirect() {
    redirect('/shop/cart');
}
