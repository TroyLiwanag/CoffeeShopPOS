import {
  Coffee,
  Leaf,
  Cookie,
  UtensilsCrossed,
  Cake,
  CupSoda,
  IceCreamCone,
  type LucideIcon,
} from "lucide-react";

export const MENU_ICON_OPTIONS = [
  { id: "coffee", label: "Coffee" },
  { id: "tea", label: "Tea" },
  { id: "drinks", label: "Drinks" },
  { id: "snacks", label: "Snacks" },
  { id: "rice", label: "Rice meals" },
  { id: "dessert", label: "Pastry" },
  { id: "blended", label: "Iced blended" },
] as const;

export type MenuIconId = (typeof MENU_ICON_OPTIONS)[number]["id"];

const ICON_MAP: Record<string, LucideIcon> = {
  coffee: Coffee,
  tea: Leaf,
  drinks: CupSoda,
  snacks: Cookie,
  rice: UtensilsCrossed,
  dessert: Cake,
  blended: IceCreamCone,
};

export function getMenuIcon(iconId?: string | null): LucideIcon {
  return ICON_MAP[iconId || "coffee"] ?? Coffee;
}

export function getIconForCategory(categoryName: string): MenuIconId {
  const cat = (categoryName || "").toLowerCase().trim();
  if (cat.includes("coffee") && !cat.includes("non")) return "coffee";
  if (cat.includes("non") || cat.includes("drink") || cat.includes("beverage")) return "drinks";
  if (cat.includes("tea")) return "tea";
  if (cat.includes("blend") || cat.includes("ice") || cat.includes("frappe") || cat.includes("smoothie")) return "blended";
  if (cat.includes("snack") || cat.includes("finger")) return "snacks";
  if (cat.includes("rice") || cat.includes("meal") || cat.includes("food")) return "rice";
  if (cat.includes("dessert") || cat.includes("cake") || cat.includes("pastry")) return "dessert";
  return "coffee";
}

export function MenuIconDisplay({
  iconId,
  className,
}: {
  iconId?: string | null;
  className?: string;
}) {
  const Icon = getMenuIcon(iconId);
  return <Icon className={className} strokeWidth={1.75} />;
}
