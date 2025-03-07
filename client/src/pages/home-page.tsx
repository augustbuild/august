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
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [showProductForm, setShowProductForm] = useState(false);

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    select: (products) => {
      return [...products].sort((a, b) => {
        if (sortBy === "newest") {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        } else {
          return b.score - a.score;
        }
      });
    },
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <Select
          value={sortBy}
          onValueChange={(value: SortOption) => setSortBy(value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="top">Top Rated</SelectItem>
          </SelectContent>
        </Select>

        <Dialog open={showProductForm} onOpenChange={setShowProductForm}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Submit Product
            </Button>
          </DialogTrigger>
          <DialogContent>
            <ProductForm onSuccess={() => setShowProductForm(false)} />
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
            <div key={product.id} className="py-6 first:pt-0 last:pb-0">
              <ProductCard key={product.id} product={product} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}