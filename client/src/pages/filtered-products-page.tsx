import { useQuery } from "@tanstack/react-query";
import type { Product } from "@shared/schema";
import ProductCard from "@/components/product-card";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

type FilterType = "material" | "country" | "collection";

export default function FilteredProductsPage() {
  const [location, setLocation] = useLocation();
  const params = new URLSearchParams(location.split("?")[1]);
  const filterType = params.get("type") as FilterType;
  const value = params.get("value");

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    select: (products) => {
      return products.filter((product) => {
        switch (filterType) {
          case "material":
            return product.material?.includes(value!);
          case "country":
            return product.country === value;
          case "collection":
            return product.collection === value;
          default:
            return false;
        }
      });
    },
  });

  const filterTypeDisplay = filterType.charAt(0).toUpperCase() + filterType.slice(1);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" onClick={() => setLocation("/")} className="p-0 h-auto">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">
          {filterTypeDisplay}: {value}
        </h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : products?.length === 0 ? (
        <p className="text-muted-foreground">
          No products found for this {filterType}.
        </p>
      ) : (
        <div className="divide-y divide-border">
          {products?.map((product) => (
            <div key={product.id} className="py-6 first:pt-0 last:pb-0">
              <ProductCard
                product={product}
                isFullView={false}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
