import { useQuery } from "@tanstack/react-query";
import type { Product } from "@shared/schema";
import { materials, countries, collections } from "@/lib/category-data";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Package, Globe, FolderOpen } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { getCountryFlag } from "@/lib/utils";

interface CategorySection {
  title: string;
  icon: typeof Package;
  type: "materials" | "countries" | "collections";
  items: { name: string; count: number }[];
}

export default function CategoryHighlights() {
  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Function to count items and sort by frequency
  const getTopCategories = (
    type: "materials" | "countries" | "collections",
    referenceList: string[]
  ) => {
    let allItems: string[] = [];

    switch (type) {
      case "materials":
        allItems = products?.flatMap((p) => p.material || []) || [];
        break;
      case "countries":
        allItems = products?.map((p) => p.country) || [];
        break;
      case "collections":
        allItems = products?.map((p) => p.collection) || [];
        break;
    }

    // Count occurrences
    const counts = new Map<string, number>();
    allItems.forEach((item) => {
      counts.set(item, (counts.get(item) || 0) + 1);
    });

    // Create sorted items array
    return referenceList
      .map((name) => ({
        name,
        count: counts.get(name) || 0,
      }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 10); // Show top 10 categories
  };

  const sections: CategorySection[] = [
    {
      title: "Popular Materials",
      icon: Package,
      type: "materials",
      items: getTopCategories("materials", materials),
    },
    {
      title: "Popular Collections",
      icon: FolderOpen,
      type: "collections",
      items: getTopCategories("collections", collections),
    },
    {
      title: "Popular Countries",
      icon: Globe,
      type: "countries",
      items: getTopCategories("countries", countries),
    },
  ];

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div key={section.type}>
          <div className="flex items-center gap-2 mb-3">
            <section.icon className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-medium">{section.title}</h2>
          </div>
          <ScrollArea className="w-full">
            <div className="flex gap-2 pb-4">
              {section.items.map((item) => (
                <Link
                  key={item.name}
                  href={`/${section.type}/${encodeURIComponent(item.name)}`}
                >
                  <Badge
                    variant="secondary"
                    className="cursor-pointer whitespace-nowrap hover:bg-secondary/80 hover:text-secondary-foreground"
                  >
                    {section.type === "countries" && getCountryFlag(item.name)}{" "}
                    {item.name} ({item.count})
                  </Badge>
                </Link>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      ))}
    </div>
  );
}
