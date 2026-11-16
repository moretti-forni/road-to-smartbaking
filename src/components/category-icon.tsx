import { Pizza, UtensilsCrossed, Sandwich, Croissant, Hotel, Store } from 'lucide-react';
export const categoryColors: Record<string, string> = {
  pizza: '#ef786b',
  restaurant: '#cda66d',
  qsr: '#c3b56f',
  bakery: '#9db48f',
  hotel: '#a89bc8',
};
export function CategoryIcon({ kind }: { kind: string }) {
  const Icon =
    (
      {
        pizza: Pizza,
        restaurant: UtensilsCrossed,
        qsr: Sandwich,
        bakery: Croissant,
        hotel: Hotel,
      } as Record<string, typeof Pizza>
    )[kind] ?? Store;
  return <Icon size={15} aria-hidden="true" />;
}
