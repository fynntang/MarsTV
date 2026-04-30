import { requirePagePassword } from '@/lib/site-password-guard';
import SubscriptionsClientPage from './client-page';

export const dynamic = 'force-dynamic';

export default async function SubscriptionsPage() {
  await requirePagePassword('/subscriptions');
  return <SubscriptionsClientPage />;
}
