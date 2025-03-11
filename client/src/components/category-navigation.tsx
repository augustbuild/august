import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { materials, countries, collections } from "./product-form";
import { getCountryFlag } from "@/lib/utils";

interface CategoryNavigationProps {
  type: "materials" | "countries" | "collections";
  currentValue: string;
  items: { name: string; count: number }[];
}

export default function CategoryNavigation({ type, currentValue, items }: CategoryNavigationProps) {
  return (
    <ScrollArea className="w-full whitespace-nowrap pb-4">
      <div className="flex gap-2">
        {items.map((item) => {
          const isSelected = item.name === decodeURIComponent(currentValue);
          return (
            <Link
              key={item.name}
              href={`/${type}/${encodeURIComponent(item.name)}`}
            >
              <Badge
                variant={isSelected ? "default" : "secondary"}
                className={`cursor-pointer hover:bg-secondary/80 ${
                  isSelected ? "" : "hover:bg-primary/80"
                }`}
              >
                {type === "countries" && getCountryFlag(item.name)} {item.name} ({item.count})
              </Badge>
            </Link>
          );
        })}
      </div>
    </ScrollArea>
  );
}