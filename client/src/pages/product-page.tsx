import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import type { Product } from "@shared/schema";
import ProductCard from "@/components/product-card";
import CommentThread from "@/components/comment-thread";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArrowUp, Globe, Building2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

export default function ProductPage() {
  const [_, params] = useRoute<{ id: string }>("/products/:id");
  const { user } = useAuth();

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: [`/api/products/${params?.id}`],
    enabled: !!params?.id,
  });

  const { data: vote } = useQuery<{ id: number; value: number }>({
    queryKey: ["/api/votes", params?.id],
    enabled: !!user && !!params?.id,
  });

  const voteMutation = useMutation({
    mutationFn: async (value: number) => {
      const res = await apiRequest("POST", "/api/votes", {
        productId: parseInt(params?.id || "0"),
        value,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/products/${params?.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/votes", params?.id] });
    },
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

  const hasUpvoted = vote?.value === 1;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Image Section */}
        <div>
          <img
            src={product.imageUrl}
            alt={product.title}
            className="w-full aspect-square object-cover rounded-lg shadow-lg"
          />
        </div>

        {/* Details Section */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{product.title}</h1>
            <div className="flex items-center space-x-4 text-muted-foreground">
              <div className="flex items-center">
                <Building2 className="h-4 w-4 mr-1" />
                {product.companyName}
              </div>
              <div className="flex items-center">
                <Globe className="h-4 w-4 mr-1" />
                {product.country}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={hasUpvoted ? "default" : "outline"}
              size="sm"
              onClick={() => {
                const newValue = vote?.value === 1 ? 0 : 1;
                voteMutation.mutate(newValue);
              }}
              disabled={voteMutation.isPending}
              className="h-9 px-4 flex items-center gap-2"
            >
              <ArrowUp className="h-4 w-4" />
              <span className="font-medium">{product.score}</span>
            </Button>

            <a
              href={product.link}
              target="_blank"
              rel="noopener noreferrer"
              className="no-underline"
            >
              <Button size="sm" className="h-9">
                Visit Website
              </Button>
            </a>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">About this product</h2>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {product.description}
            </p>
          </div>
        </div>
      </div>

      {/* Comments Section */}
      <div className="pt-8 border-t">
        <h2 className="text-lg font-semibold mb-6">Discussion</h2>
        <CommentThread productId={product.id} />
      </div>
    </div>
  );
}