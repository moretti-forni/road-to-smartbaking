import Screen from '../../../../screens/restaurant';
import { getShop } from '../../../../server/services/public-catalog';
export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ locale: string; slug: string }> };
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const record = await getShop(slug);
  return { title: `${record.name} · RoadToSmartBaking` };
}
export default async function Page({ params }: Props) {
  const { slug } = await params;
  return <Screen restaurant={await getShop(slug)} />;
}
