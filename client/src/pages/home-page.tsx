import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import ProductCard from "@/components/product-card";
import ProductForm from "@/components/product-form";
import { useQuery } from "@tanstack/react-query";
import type { Product } from "@shared/schema";
import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SortOption = "newest" | "top";

export default function HomePage() {
  const [sortBy, setSortBy] = useState<SortOption>("top"); // Changed default to "top"
  const [showProductForm, setShowProductForm] = useState(false);

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
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="divide-y divide-border">
          {products?.map((product) => (
            <div key={product.id} className="py-4 first:pt-0 last:pb-0">
              <ProductCard 
                key={product.id} 
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