import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { materials, countries, collections } from "./product-form";
import { getCountryFlag } from "@/lib/utils";

interface CategoryNavigationProps {
  type: "materials" | "countries" | "collections";
  currentValue: string;
}

export default function CategoryNavigation({ type, currentValue }: CategoryNavigationProps) {
  let items: string[] = [];
  switch (type) {
    case "materials":
      items = materials;
      break;
    case "countries":
      items = countries;
      break;
    case "collections":
      items = collections.sort();
      break;
  }

  return (
    <ScrollArea className="w-full whitespace-nowrap pb-4">
      <div className="flex gap-2">
        {items.map((item) => {
          const isSelected = item === decodeURIComponent(currentValue);
          return (
            <Link
              key={item}
              href={`/${type}/${encodeURIComponent(item)}`}
            >
              <Badge
                variant={isSelected ? "default" : "secondary"}
                className={`cursor-pointer hover:bg-secondary/80 ${
                  isSelected ? "" : "hover:bg-primary/80"
                }`}
              >
                {type === "countries" && getCountryFlag(item)} {item}
              </Badge>
            </Link>
          );
        })}
      </div>
    </ScrollArea>
  );
}
