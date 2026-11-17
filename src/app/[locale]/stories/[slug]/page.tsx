import Screen from '../../../../screens/story';
import { getStory } from '../../../../server/services/public-catalog';
export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ locale: string; slug: string }> };
export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  const record = await getStory(slug, locale);
  return {
    title: `${record.title} · RoadToSmartBaking`,
    description: record.summary,
    openGraph: { title: record.title, description: record.summary, type: 'article' as const },
  };
}
export default async function Page({ params }: Props) {
  const { locale, slug } = await params;
  return <Screen story={await getStory(slug, locale)} />;
}
