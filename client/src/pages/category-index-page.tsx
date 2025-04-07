import { useQuery } from "@tanstack/react-query";
import type { Product } from "@shared/schema";
import { Link, useLocation } from "wouter";
import { materials, countries, collections } from "@/lib/category-data";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getCountryFlag } from "@/lib/utils";

export default function CategoryIndexPage() {
  const [location, setLocation] = useLocation();
  const type = location.split('/')[1] as "materials" | "countries" | "collections";
  
  // Define title and items based on the category type
  const getTitleAndItems = () => {
    switch (type) {
      case "materials":
        return { 
          title: "Browse by Material", 
          items: materials.map(material => ({ 
            name: material,
            count: 0 // Will be updated below
          }))
        };
      case "countries":
        return { 
          title: "Browse by Country", 
          items: countries.map(country => ({ 
            name: country,
            count: 0 // Will be updated below
          }))
        };
      case "collections":
        return { 
          title: "Browse by Collection", 
          items: collections.map(collection => ({ 
            name: collection,
            count: 0 // Will be updated below
          }))
        };
      default:
        return { title: "", items: [] };
    }
  };

  const { title, items } = getTitleAndItems();

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Calculate counts for each category item
  const itemsWithCounts = items.map(item => {
    if (!products) return item;
    
    const count = products.filter(product => {
      switch (type) {
        case "materials":
          return product.material?.includes(item.name);
        case "countries":
          return product.country === item.name;
        case "collections":
          return product.collection === item.name;
        default:
          return false;
      }
    }).length;
    
    return { ...item, count };
  }).filter(item => item.count > 0) // Only show items with products
    .sort((a, b) => b.count - a.count); // Sort by count, descending

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/")}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {itemsWithCounts.map(item => (
            <Link key={item.name} href={`/${type}/${encodeURIComponent(item.name)}`}>
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="py-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {type === "countries" && <span>{getCountryFlag(item.name)}</span>}
                    {item.name}
                  </CardTitle>
                  <CardDescription>{item.count} product{item.count !== 1 ? 's' : ''}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}