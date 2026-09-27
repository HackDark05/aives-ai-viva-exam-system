import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  inverted = false,
}: {
  className?: string;
  inverted?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-lg font-serif text-lg leading-none tracking-tight",
        inverted
          ? "bg-amber-200/15 text-amber-100 ring-1 ring-amber-100/20"
          : "bg-primary text-primary-foreground",
        className,
      )}
    >
      A
    </span>
  );
}
