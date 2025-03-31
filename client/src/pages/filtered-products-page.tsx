import { useQuery } from "@tanstack/react-query";
import type { Product } from "@shared/schema";
import ProductCard from "@/components/product-card";
import { Loader2, ArrowLeft, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import CategoryNavigation from "@/components/category-navigation";
import { materials, countries, collections } from "@/components/product-form";
import { useState, useRef, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function FilteredProductsPage() {
  const [location, setLocation] = useLocation();
  const [_, type, value] = location.split('/');
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const productsPerPage = 10;

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

      // Separate and sort featured and non-featured products by score
      const featured = filteredProducts.filter(p => p.featured)
        .sort((a, b) => b.score - a.score || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const nonFeatured = filteredProducts.filter(p => !p.featured)
        .sort((a, b) => b.score - a.score || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Combine the sorted groups
      return [...featured, ...nonFeatured];
    },
  });
  
  // Reset pagination when products or route changes
  useEffect(() => {
    setPage(1);
    if (products) {
      setDisplayedProducts(products.slice(0, productsPerPage));
      setHasMore(products.length > productsPerPage);
    }
  }, [products, type, value]);
  
  const loadMoreProducts = () => {
    if (!products || loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    
    // Simulate a slight delay to show loading state
    setTimeout(() => {
      const nextPage = page + 1;
      const start = (nextPage - 1) * productsPerPage;
      const end = start + productsPerPage;
      const newProducts = products.slice(0, end);
      
      setDisplayedProducts(newProducts);
      setPage(nextPage);
      setHasMore(products.length > end);
      setLoadingMore(false);
    }, 300);
  };
  
  const observer = useRef<IntersectionObserver | null>(null);
  const lastProductRef = (node: HTMLDivElement | null) => {
    if (isLoading || loadingMore) return;
    
    if (observer.current) {
      observer.current.disconnect();
    }
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMoreProducts();
      }
    });
    
    if (node) {
      observer.current.observe(node);
    }
  };

  // Get categories for sidebar
  const { data: categoryData } = useQuery<{ name: string; count: number }[]>({
    queryKey: ["/api/products", "categories", type],
    enabled: !!products,
    select: () => {
      // If products is not available yet, return empty array
      if (!products) return [];
      
      let allItems: string[] = [];
      let referenceList: string[] = [];

      switch (type) {
        case "materials":
          referenceList = materials;
          allItems = products.flatMap(p => p.material || []);
          break;
        case "countries":
          referenceList = countries;
          allItems = products.map(p => p.country);
          break;
        case "collections":
          referenceList = collections;
          allItems = products.map(p => p.collection);
          break;
        default:
          return [];
      }

      // Count occurrences
      const counts = new Map<string, number>();
      allItems.forEach(item => {
        counts.set(item, (counts.get(item) || 0) + 1);
      });

      // Create sorted items array with only non-zero counts
      return referenceList
        .map(name => ({
          name,
          count: counts.get(name) || 0
        }))
        .filter(item => item.count > 0)
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    }
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
          items={categoryData || []}
        />
      </div>

      {isLoading ? (
        <div className="space-y-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-24 w-24 rounded-md" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-8 w-1/2 mt-4" />
              </div>
            </div>
          ))}
        </div>
      ) : products?.length === 0 ? (
        <p className="text-muted-foreground">
          No products found for this {typeDisplay.toLowerCase()}.
        </p>
      ) : (
        <>
          <div className="divide-y divide-border">
            {displayedProducts?.map((product, index) => {
              if (displayedProducts.length === index + 1) {
                return (
                  <div 
                    ref={lastProductRef}
                    key={product.id} 
                    className="py-4 first:pt-0 last:pb-0"
                  >
                    <ProductCard 
                      product={product}
                      isFullView={false}
                    />
                  </div>
                );
              } else {
                return (
                  <div key={product.id} className="py-4 first:pt-0 last:pb-0">
                    <ProductCard 
                      product={product}
                      isFullView={false}
                    />
                  </div>
                );
              }
            })}
          </div>
          
          {loadingMore && (
            <div className="py-4 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          
          {!loadingMore && hasMore && (
            <div className="py-4 flex justify-center">
              <Button 
                variant="outline" 
                onClick={loadMoreProducts}
                className="flex items-center gap-1"
              >
                Load more <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}