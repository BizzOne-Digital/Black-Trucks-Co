import { redirect } from 'next/navigation';

/** Vehicle selection + full checkout removed — customers book via inquiry at /book */
export default function VehiclesPage() {
  redirect('/book');
}
