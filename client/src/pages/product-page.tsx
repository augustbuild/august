import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import type { Product } from "@shared/schema";
import ProductCard from "@/components/product-card";
import CommentThread from "@/components/comment-thread";
import { Loader2 } from "lucide-react";

export default function ProductPage() {
  const [match, params] = useRoute<{ id: string }>("/products/:id");
  
  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ["/api/products", params.id],
    enabled: !!params.id,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!product) {
    return <div>Product not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <ProductCard product={product} showComments={false} />
      <div className="mt-8">
        <CommentThread productId={product.id} />
      </div>
    </div>
  );
}
