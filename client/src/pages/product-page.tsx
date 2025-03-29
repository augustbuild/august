import { useQuery, QueryFunction } from "@tanstack/react-query";
import { useRoute } from "wouter";
import type { Product } from "@shared/schema";
import ProductCard from "@/components/product-card";
import CommentThread from "@/components/comment-thread";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArrowUp, Globe, Building2, Package, FolderOpen } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { cn, getCountryFlag } from "@/lib/utils";
import { useState, useEffect } from "react";

export default function ProductPage() {
  const [_, params] = useRoute<{ slug: string }>("/products/:slug");
  const { user } = useAuth();
  const { toast } = useToast();
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
  const { data: vote, isSuccess } = useQuery<{ id: number; value: number } | null>({
    queryKey: ["/api/votes", product?.id],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!product?.id,  // Enable for all users with product ID
    staleTime: 0, // Never mark as stale to ensure fresh data on reload
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: true, // Refetch when component mounts
    refetchOnReconnect: true, // Refetch on network reconnect
    gcTime: 0, // Don't cache in garbage collection
  });
  
  // Debug vote data
  useEffect(() => {
    console.log(`[ProductPage] User authenticated:`, !!user);
    console.log(`[ProductPage] Product ID ${product?.id} - Vote data:`, vote);
  }, [vote, user, product?.id]);
  
  // Initialize upvote state from API data and localStorage when component mounts or vote changes
  useEffect(() => {
    if (!product) return;

    // Check if this product was upvoted in localStorage
    const localUpvotes = localStorage.getItem('product_upvotes');
    const upvotedProducts = localUpvotes ? JSON.parse(localUpvotes) : [];
    const isUpvotedLocally = upvotedProducts.includes(product.id);
    
    // First, check if we have API vote data (for authenticated users)
    if (isSuccess && product) {
      if (vote && vote.value === 1) {
        console.log(`[ProductPage] Setting hasUpvoted to TRUE based on API vote for product ${product.id}`);
        setHasUpvoted(true);
        
        // Also store in localStorage for persistence
        if (!isUpvotedLocally) {
          localStorage.setItem('product_upvotes', JSON.stringify([...upvotedProducts, product.id]));
        }
      } else if (isUpvotedLocally) {
        // If not upvoted in API but upvoted in localStorage, maintain the localStorage state
        console.log(`[ProductPage] Setting hasUpvoted to TRUE based on localStorage for product ${product.id}`);
        setHasUpvoted(true);
      } else {
        // Neither API nor localStorage shows an upvote
        console.log(`[ProductPage] Setting hasUpvoted to FALSE for product ${product.id}`);
        setHasUpvoted(false);
      }
    } else {
      // If no API data, fall back to localStorage
      if (isUpvotedLocally) {
        console.log(`[ProductPage] Setting hasUpvoted to TRUE based on localStorage for product ${product.id}`);
        setHasUpvoted(true);
      }
    }
  }, [vote, product, isSuccess]);

  const voteMutation = useMutation({
    mutationFn: async (value: number) => {
      try {
        const res = await apiRequest("POST", "/api/votes", {
          productId: product?.id || 0,
          value,
        });
        return res.json();
      } catch (error) {
        // Log the error for debugging purposes
        console.error("[ProductPage VoteMutation] Error:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("[ProductPage VoteMutation] Success:", data);
      if (product?.id) {
        // Invalidate relevant queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["/api/products"] });
        queryClient.invalidateQueries({ queryKey: ["/api/votes", product.id] });
      }
    },
    onError: (error) => {
      console.error("[ProductPage VoteMutation] Error handler:", error);
      toast({
        title: "Vote failed",
        description: error instanceof Error ? error.message : "Failed to update vote",
        variant: "destructive",
      });
    },
  });
  
  const handleUpvote = async () => {
    if (!user || !product) {
      toast({
        title: "Authentication required",
        description: "Please log in to vote on products",
        variant: "default"
      });
      return;
    }

    // Don't allow self-voting
    if (product.userId === user.id) {
      toast({
        title: "Cannot vote on your own product",
        description: "You can't upvote products you've created",
        variant: "default"
      });
      return;
    }

    // Toggle the upvoted state immediately for visual feedback
    const newUpvotedState = !hasUpvoted;
    setHasUpvoted(newUpvotedState);
    const newVoteValue = newUpvotedState ? 1 : 0;
    
    // Update localStorage to persist the upvote state
    const localUpvotes = localStorage.getItem('product_upvotes');
    const upvotedProducts = localUpvotes ? JSON.parse(localUpvotes) : [];
    
    if (newUpvotedState) {
      // Add to upvoted products if not already there
      if (!upvotedProducts.includes(product.id)) {
        const updatedUpvotes = [...upvotedProducts, product.id];
        localStorage.setItem('product_upvotes', JSON.stringify(updatedUpvotes));
        console.log(`[ProductPage] Added product ${product.id} to localStorage upvotes`);
      }
    } else {
      // Remove from upvoted products
      const updatedUpvotes = upvotedProducts.filter((id: number) => id !== product.id);
      localStorage.setItem('product_upvotes', JSON.stringify(updatedUpvotes));
      console.log(`[ProductPage] Removed product ${product.id} from localStorage upvotes`);
    }
    
    try {
      // Send the API request in the background for authenticated users
      await voteMutation.mutateAsync(newVoteValue);
      
      // Show success message
      toast({
        title: newVoteValue === 1 ? "Product upvoted" : "Upvote removed",
        description: newVoteValue === 1 ? "Thank you for your vote!" : "Your upvote has been removed",
        variant: "default"
      });
    } catch (error: any) {
      // Do not revert the visual state if the API request fails
      // since we're using localStorage as the source of truth
      console.error('[ProductPage] Failed to update vote on server:', error);
      
      toast({
        title: "Vote update on server failed",
        description: "Your vote preference was saved locally",
        variant: "default"
      });
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