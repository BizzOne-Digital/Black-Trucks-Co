import { redirect } from 'next/navigation';

/** Legacy URL — booking is now inquiry-based at /book */
export default function BookingPage() {
  redirect('/book');
}
