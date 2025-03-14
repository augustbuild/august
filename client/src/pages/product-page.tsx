import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import type { Product } from "@shared/schema";
import ProductCard from "@/components/product-card";
import CommentThread from "@/components/comment-thread";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArrowUp, Globe, Building2, Package, FolderOpen } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { getCountryFlag } from "@/lib/utils";

export default function ProductPage() {
  const [_, params] = useRoute<{ slug: string }>("/products/:slug");
  const { user } = useAuth();

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const product = products?.find(p => {
    const titleSlug = `${p.title}-${p.companyName}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-+/g, '-');
    return titleSlug === params?.slug;
  });

  const { data: vote } = useQuery<{ id: number; value: number }>({
    queryKey: ["/api/votes", product?.id],
    enabled: !!user && !!product?.id,
  });

  const voteMutation = useMutation({
    mutationFn: async (value: number) => {
      const res = await apiRequest("POST", "/api/votes", {
        productId: product?.id || 0,
        value,
      });
      return res.json();
    },
    onSuccess: () => {
      if (product?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/products"] });
        queryClient.invalidateQueries({ queryKey: ["/api/votes", product.id] });
      }
    },
  });

  if (!products) {
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
            <p className="text-muted-foreground">
              {product.companyName}
            </p>
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

          {/* Tags Section */}
          <div className="flex flex-wrap gap-2">
            {product.material && product.material.length > 0 && (
              <div className="flex flex-wrap gap-1 items-center">
                <Package className="h-4 w-4 text-muted-foreground" />
                {product.material.map((material) => (
                  <Link
                    key={material}
                    href={`/materials/${encodeURIComponent(material)}`}
                  >
                    <Badge
                      variant="secondary"
                      className="text-xs cursor-pointer hover:bg-secondary/80"
                    >
                      {material}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
            <div className="flex items-center gap-1">
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
              <Link href={`/collections/${encodeURIComponent(product.collection)}`}>
                <Badge
                  variant="secondary"
                  className="text-xs cursor-pointer hover:bg-secondary/80"
                >
                  {product.collection}
                </Badge>
              </Link>
            </div>
            <div className="flex items-center gap-1">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <Link href={`/countries/${encodeURIComponent(product.country)}`}>
                <Badge
                  variant="secondary"
                  className="text-xs cursor-pointer hover:bg-secondary/80"
                >
                  {getCountryFlag(product.country)} {product.country}
                </Badge>
              </Link>
            </div>
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