import { CookingPot, Drill, Hammer, Package, Shovel, SprayCan, Tent, type LucideIcon } from "lucide-react";

const ICONS: Record<string, { icon: LucideIcon; tone: string }> = {
  power_tools: { icon: Drill, tone: "bg-orange-50 text-orange-700" },
  hand_tools: { icon: Hammer, tone: "bg-amber-50 text-amber-700" },
  garden: { icon: Shovel, tone: "bg-lime-50 text-lime-700" },
  kitchen: { icon: CookingPot, tone: "bg-rose-50 text-rose-700" },
  camping: { icon: Tent, tone: "bg-sky-50 text-sky-700" },
  cleaning: { icon: SprayCan, tone: "bg-violet-50 text-violet-700" },
  other: { icon: Package, tone: "bg-stone-100 text-stone-600" },
};

export function CategoryIcon({ category, size = "md" }: { category: string; size?: "sm" | "md" }) {
  const { icon: Icon, tone } = ICONS[category] ?? ICONS.other;
  const box = size === "sm" ? "h-8 w-8" : "h-11 w-11";
  const glyph = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-xl ${box} ${tone}`}>
      <Icon className={glyph} aria-hidden />
    </span>
  );
}
