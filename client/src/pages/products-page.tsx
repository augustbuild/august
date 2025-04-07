import { useQuery } from "@tanstack/react-query";
import type { Product } from "@shared/schema";
import ProductCard from "@/components/product-card";
import { Loader2, Package, Globe, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { materials, countries, collections } from "@/lib/category-data";
import { Link } from "wouter";
import { useState, useRef, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CategoryHighlights from "@/components/category-highlights";

type SortOption = "newest" | "top";

export default function ProductsPage() {
  const [sortBy, setSortBy] = useState<SortOption>("top");
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const productsPerPage = 12;
  
  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    select: (products) => {
      // First, separate featured and non-featured products
      const featured = products.filter(p => p.featured);
      const nonFeatured = products.filter(p => !p.featured);

      // Sort each group according to the selected sort option
      const sortFn = (a: Product, b: Product) => {
        if (sortBy === "newest") {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        } else {
          return b.score - a.score || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
      };

      // Sort each group and concatenate them
      return [...featured.sort(sortFn), ...nonFeatured.sort(sortFn)];
    },
  });
  
  // Reset pagination when sort changes
  useEffect(() => {
    setPage(1);
    if (products) {
      setDisplayedProducts(products.slice(0, productsPerPage));
      setHasMore(products.length > productsPerPage);
    }
  }, [products, sortBy]);
  
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Discover Products</h1>
      
      {/* Category Highlights */}
      <section className="mb-10">
        <CategoryHighlights />
      </section>
      
      {/* Products Section */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">All Products</h2>
        <Select
          value={sortBy}
          onValueChange={(value: SortOption) => setSortBy(value)}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="top">Top</SelectItem>
            <SelectItem value="newest">Newest</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border rounded-md p-4">
              <Skeleton className="h-48 w-full rounded-md mb-3" />
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-4" />
              <Skeleton className="h-8 w-1/3" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedProducts?.map((product, index) => {
              // Set up ref for the last product for infinite scroll
              const isLastProduct = displayedProducts.length === index + 1;
              
              return (
                <div 
                  key={product.id} 
                  ref={isLastProduct ? lastProductRef : undefined}
                  className="border rounded-md p-4 hover:shadow-md transition-shadow"
                >
                  <ProductCard 
                    product={product}
                    isFullView={false}
                  />
                </div>
              );
            })}
          </div>
          
          {loadingMore && (
            <div className="flex justify-center mt-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          
          {!hasMore && products && products.length > 0 && (
            <div className="text-center mt-8 text-muted-foreground">
              You've reached the end
            </div>
          )}
        </>
      )}
    </div>
  );
}