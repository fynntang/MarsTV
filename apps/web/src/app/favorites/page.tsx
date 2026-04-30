import { requirePagePassword } from '@/lib/site-password-guard';
import FavoritesClientPage from './client-page';

export const dynamic = 'force-dynamic';

export default async function FavoritesPage() {
  await requirePagePassword('/favorites');
  return <FavoritesClientPage />;
}
