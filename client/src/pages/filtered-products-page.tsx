import { useQuery } from "@tanstack/react-query";
import type { Product } from "@shared/schema";
import ProductCard from "@/components/product-card";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import CategoryNavigation from "@/components/category-navigation";

export default function FilteredProductsPage() {
  const [location, setLocation] = useLocation();
  const [_, type, value] = location.split('/');

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    select: (products) => {
      // Filter products based on the route type
      const filteredProducts = products.filter((product) => {
        switch (type) {
          case "materials":
            return product.material?.includes(decodeURIComponent(value));
          case "countries":
            return product.country === decodeURIComponent(value);
          case "collections":
            return product.collection === decodeURIComponent(value);
          default:
            return false;
        }
      });

      // Separate and sort featured and non-featured products
      const featured = filteredProducts.filter(p => p.featured)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const nonFeatured = filteredProducts.filter(p => !p.featured)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Combine the sorted groups
      return [...featured, ...nonFeatured];
    },
  });

  // Mapping plural route names to singular display names
  const getTypeDisplay = (type: string) => {
    switch (type) {
      case "materials":
        return "Material";
      case "countries":
        return "Country";
      case "collections":
        return "Collection";
      default:
        return type;
    }
  };

  const typeDisplay = getTypeDisplay(type);
  const valueDisplay = decodeURIComponent(value);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" onClick={() => setLocation("/")} className="p-0 h-auto">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">
          {typeDisplay}: {valueDisplay}
        </h1>
      </div>

      <div className="mb-8">
        <h2 className="text-sm font-medium text-muted-foreground mb-2">
          Browse other {type}:
        </h2>
        <CategoryNavigation
          type={type as "materials" | "countries" | "collections"}
          currentValue={value}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : products?.length === 0 ? (
        <p className="text-muted-foreground">
          No products found for this {typeDisplay.toLowerCase()}.
        </p>
      ) : (
        <div className="divide-y divide-border">
          {products?.map((product) => (
            <div key={product.id} className="py-4 first:pt-0 last:pb-0">
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