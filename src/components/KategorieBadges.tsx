import { Badge } from "@/components/ui/badge";
import { KATEGORIEN, parseKategorien } from "@/lib/kategorien";
import { cn } from "@/lib/utils";

interface Props {
  value: string | null | undefined;
  size?: "xs" | "sm";
  className?: string;
}

/**
 * Zeigt Auftragskategorien als kleine Chips an.
 * Format: "01 Service".
 */
export function KategorieBadges({ value, size = "sm", className }: Props) {
  const ids = parseKategorien(value);
  if (ids.length === 0) return <span className="text-muted-foreground">—</span>;

  const labelById = new Map(KATEGORIEN.map((k) => [k.id, k.label]));
  const sizeCls = size === "xs" ? "text-[9px] px-1 py-0 h-4" : "text-[10px] px-1.5 py-0 h-5";

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {ids.map((id) => (
        <Badge
          key={id}
          variant="secondary"
          className={cn("font-mono gap-1 leading-none", sizeCls)}
        >
          <span className="text-muted-foreground">{id}</span>
          <span>{labelById.get(id) ?? ""}</span>
        </Badge>
      ))}
    </div>
  );
}
