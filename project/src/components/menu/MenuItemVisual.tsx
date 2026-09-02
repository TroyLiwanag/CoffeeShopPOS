import { menuImageUrl } from "@/lib/menu-api";
import { MenuIconDisplay } from "@/lib/menu-icons";
import { cn } from "@/lib/utils";

type Props = {
  image?: string | null;
  icon?: string | null;
  name: string;
  className?: string;
  iconClassName?: string;
};

export function MenuItemVisual({ image, icon, name, className, iconClassName }: Props) {
  const src = menuImageUrl(image);

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn("w-full h-full object-cover animate-fade-in", className)}
        loading="lazy"
      />
    );
  }

  return (
    <div
      className={cn(
        "w-full h-full flex items-center justify-center text-primary/70",
        className,
      )}
      style={{ background: "var(--cream)" }}
    >
      <MenuIconDisplay iconId={icon} className={cn("w-12 h-12 sm:w-14 sm:h-14", iconClassName)} />
    </div>
  );
}
