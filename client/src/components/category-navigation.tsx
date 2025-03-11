import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { materials, countries, collections } from "./product-form";
import { getCountryFlag } from "@/lib/utils";

interface CategoryNavigationProps {
  type: "materials" | "countries" | "collections";
  currentValue: string;
  items: { name: string; count: number }[];
}

export default function CategoryNavigation({ type, currentValue, items }: CategoryNavigationProps) {
  return (
    <ScrollArea className="w-full">
      <div className="flex gap-2 pb-4">
        {items.map((item) => {
          const isSelected = item.name === decodeURIComponent(currentValue);
          return (
            <Link
              key={item.name}
              href={`/${type}/${encodeURIComponent(item.name)}`}
            >
              <Badge
                variant={isSelected ? "default" : "secondary"}
                className={`cursor-pointer whitespace-nowrap inline-flex items-center hover:bg-secondary/80 ${
                  isSelected ? "" : "hover:bg-primary/80"
                }`}
              >
                {type === "countries" && getCountryFlag(item.name)}{" "}
                {item.name} {item.count}
              </Badge>
            </Link>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}