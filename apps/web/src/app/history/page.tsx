import { requirePagePassword } from '@/lib/site-password-guard';
import HistoryClientPage from './client-page';

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
  await requirePagePassword('/history');
  return <HistoryClientPage />;
}
