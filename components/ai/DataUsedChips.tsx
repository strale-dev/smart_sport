import { Badge } from "@/components/ui/badge";

type DataUsedChipsProps = {
  items: string[];
  className?: string;
};

export function DataUsedChips({ items, className }: DataUsedChipsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
        Data used in this analysis
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <li key={item}>
            <Badge variant="secondary" className="font-normal">
              {item}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}
