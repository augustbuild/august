import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import ProductCard from "@/components/product-card";
import ProductForm from "@/components/product-form";
import NewsletterForm from "@/components/newsletter-form";
import { useQuery } from "@tanstack/react-query";
import type { Product } from "@shared/schema";
import { Loader2, Plus, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

type SortOption = "newest" | "top";

export default function HomePage() {
  const [sortBy, setSortBy] = useState<SortOption>("top");
  const [showProductForm, setShowProductForm] = useState(false);
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const productsPerPage = 10;
  
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
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
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

        <Dialog open={showProductForm} onOpenChange={setShowProductForm}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Submit Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] flex flex-col">
            <div className="overflow-y-auto pr-2">
              <ProductForm onSuccess={() => setShowProductForm(false)} />
            </div>
          </DialogContent>
        </Dialog>
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
      ) : (
        <>
          <div className="divide-y divide-border">
            {displayedProducts?.map((product, index) => {
              // Insert newsletter form after the 3rd product
              const newsletterAfterThisItem = index === 2;
              
              // Set up ref for the last product for infinite scroll
              const isLastProduct = displayedProducts.length === index + 1;
              
              return (
                <div key={product.id}>
                  <div 
                    ref={isLastProduct ? lastProductRef : undefined}
                    className="py-4 first:pt-0"
                  >
                    <ProductCard 
                      product={product}
                      isFullView={false}
                    />
                  </div>
                  
                  {/* Insert newsletter form after the 3rd product */}
                  {newsletterAfterThisItem && (
                    <div className="py-6 my-2 border-y bg-accent/20">
                      <div className="py-2">
                        <div className="mb-4">
                          <h3 className="text-xl font-semibold mb-1">Discover Extraordinary Products</h3>
                          <p className="text-muted-foreground text-sm">
                            Get extraordinary product recommendations from the August community each week.
                          </p>
                        </div>
                        <NewsletterForm 
                          variant="inline" 
                          showFirstName={false}
                          source="homepage_inline" 
                          className="w-full mx-auto"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
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