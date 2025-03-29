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
import { cn, getCountryFlag } from "@/lib/utils";
import { useState, useEffect } from "react";

// Reference to the global map in product-card.tsx
declare const upvotedProducts: Map<number, boolean>;

export default function ProductPage() {
  const [_, params] = useRoute<{ slug: string }>("/products/:slug");
  const { user } = useAuth();
  const [hasUpvoted, setHasUpvoted] = useState(false);

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

  // Get vote data from the API
  const { data: vote } = useQuery<{ id: number; value: number }>({
    queryKey: ["/api/votes", product?.id],
    enabled: !!user && !!product?.id,
  });

  // Initialize from API data, localStorage, or global map on component mount
  useEffect(() => {
    if (!product) return;
    
    // First prioritize data from the API if user is logged in
    if (vote) {
      const isUpvoted = vote.value === 1;
      setHasUpvoted(isUpvoted);
      // Update the global map
      if (typeof upvotedProducts !== 'undefined') {
        upvotedProducts.set(product.id, isUpvoted);
      }
      // Also update localStorage for offline persistence
      try {
        const upvotedItems = localStorage.getItem('upvotedProducts') || '[]';
        const upvotedIds = JSON.parse(upvotedItems);
        
        if (isUpvoted && !upvotedIds.includes(product.id)) {
          upvotedIds.push(product.id);
          localStorage.setItem('upvotedProducts', JSON.stringify(upvotedIds));
        } else if (!isUpvoted && upvotedIds.includes(product.id)) {
          const newUpvotedIds = upvotedIds.filter((id: number) => id !== product.id);
          localStorage.setItem('upvotedProducts', JSON.stringify(newUpvotedIds));
        }
      } catch (e) {
        console.error('Error updating localStorage', e);
      }
      return;
    }
    
    // Otherwise check global map
    if (typeof upvotedProducts !== 'undefined' && upvotedProducts.has(product.id)) {
      setHasUpvoted(upvotedProducts.get(product.id) || false);
      return;
    }
    
    // Finally check localStorage
    try {
      const upvotedItems = localStorage.getItem('upvotedProducts');
      if (upvotedItems) {
        const upvotedIds = JSON.parse(upvotedItems);
        const isUpvoted = upvotedIds.includes(product.id);
        setHasUpvoted(isUpvoted);
        // Update the global map if it exists
        if (typeof upvotedProducts !== 'undefined') {
          upvotedProducts.set(product.id, isUpvoted);
        }
      }
    } catch (e) {
      console.error('Error reading from localStorage', e);
    }
  }, [product, vote, user]);

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
  
  const handleUpvote = async () => {
    if (!user || !product) {
      return;
    }

    // Don't allow self-voting
    if (product.userId === user.id) {
      return;
    }

    try {
      // Toggle upvoted state immediately for visual feedback
      const newUpvoteState = !hasUpvoted;
      setHasUpvoted(newUpvoteState);
      
      // Update global map if it exists
      if (typeof upvotedProducts !== 'undefined') {
        upvotedProducts.set(product.id, newUpvoteState);
      }
      
      // Update localStorage
      try {
        const upvotedItems = localStorage.getItem('upvotedProducts') || '[]';
        const upvotedIds = JSON.parse(upvotedItems);
        
        let newUpvotedIds;
        if (newUpvoteState) {
          // Add this product ID if it doesn't exist
          if (!upvotedIds.includes(product.id)) {
            newUpvotedIds = [...upvotedIds, product.id];
          } else {
            newUpvotedIds = upvotedIds;
          }
        } else {
          // Remove this product ID
          newUpvotedIds = upvotedIds.filter((id: number) => id !== product.id);
        }
        
        localStorage.setItem('upvotedProducts', JSON.stringify(newUpvotedIds));
      } catch (e) {
        console.error('Error updating localStorage', e);
      }
      
      // Send the API request
      const newValue = newUpvoteState ? 1 : 0;
      await voteMutation.mutateAsync(newValue);
    } catch (error: any) {
      // Revert the visual state if the API request fails
      setHasUpvoted(!hasUpvoted);
      console.error('Failed to update vote', error);
    }
  };

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
              onClick={handleUpvote}
              disabled={voteMutation.isPending || !user}
              className={cn(
                "h-9 px-4 flex items-center gap-2",
                hasUpvoted && "bg-[#FFD700] border-[#FFD700] text-black hover:bg-[#FFCC00] hover:text-black hover:border-[#FFCC00]"
              )}
            >
              <ArrowUp className={cn("h-4 w-4", hasUpvoted && "text-black")} />
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
            {product.material && Array.isArray(product.material) && product.material.length > 0 && (
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