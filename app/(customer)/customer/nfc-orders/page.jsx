import { redirect } from 'next/navigation';

export default function RedirectPage() {
    redirect('/orders?filter=NFC+Cards');
}
