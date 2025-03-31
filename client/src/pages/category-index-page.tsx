import { useQuery } from "@tanstack/react-query";
import type { Product } from "@shared/schema";
import { useLocation } from "wouter";
import { materials, countries, collections } from "@/lib/category-data";
import CategoryNavigation from "@/components/category-navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function CategoryIndexPage() {
  const [location, setLocation] = useLocation();
  const type = location.split('/')[1] as "materials" | "countries" | "collections";
  
  // Define title and items based on the category type
  const getTitleAndItems = () => {
    switch (type) {
      case "materials":
        return { 
          title: "Materials", 
          items: materials.map(material => ({ 
            name: material,
            count: 0 // Will be updated below
          }))
        };
      case "countries":
        return { 
          title: "Countries", 
          items: countries.map(country => ({ 
            name: country,
            count: 0 // Will be updated below
          }))
        };
      case "collections":
        return { 
          title: "Collections", 
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
  }).sort((a, b) => b.count - a.count); // Sort by count, descending

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
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <CategoryNavigation 
          type={type}
          currentValue=""
          items={itemsWithCounts}
        />
      )}
    </div>
  );
}