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
  
  // Get all user votes
  const { data: allUserVotes, isSuccess: allVotesSuccess } = useQuery<Array<{ id: number; productId: number; value: number }>>({
    queryKey: ["/api/votes"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user, // Only fetch for authenticated users
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    gcTime: 0
  });
  
  // Individual vote data as fallback
  const { data: vote, isSuccess } = useQuery<{ id: number; value: number } | null>({
    queryKey: ["/api/votes", product?.id],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!product?.id && !allVotesSuccess, // Only fetch if bulk votes aren't available
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true, 
    refetchOnReconnect: true,
    gcTime: 0
  });
  
  // Debug vote data
  useEffect(() => {
    console.log(`[ProductPage] User authenticated:`, !!user);
    console.log(`[ProductPage] Product ID ${product?.id} - Vote data:`, vote);
  }, [vote, user, product?.id]);
  
  // Initialize upvote state from API data when component mounts or vote data changes
  useEffect(() => {
    if (!product) return;
    
    // First check if we have bulk user votes available
    if (allVotesSuccess && allUserVotes && allUserVotes.length > 0) {
      // Find the vote for this specific product
      const userVoteForProduct = allUserVotes.find(v => v.productId === product.id);
      
      if (userVoteForProduct && userVoteForProduct.value === 1) {
        console.log(`[ProductPage] Setting hasUpvoted to TRUE based on bulk vote data for product ${product.id}`);
        setHasUpvoted(true);
        return;
      }
    }
    
    // Fall back to individual vote data if bulk data doesn't have this product's vote
    if (isSuccess && vote) {
      if (vote.value === 1) {
        console.log(`[ProductPage] Setting hasUpvoted to TRUE based on individual API vote for product ${product.id}`);
        setHasUpvoted(true);
      } else {
        console.log(`[ProductPage] Setting hasUpvoted to FALSE for product ${product.id}`);
        setHasUpvoted(false);
      }
    } else {
      // If no vote found or user is not authenticated, ensure upvote is not shown
      setHasUpvoted(false);
    }
  }, [vote, allUserVotes, product, isSuccess, allVotesSuccess]);

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
        queryClient.invalidateQueries({ queryKey: ["/api/votes"] }); // Invalidate bulk votes
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
    
    try {
      // Send the API request to persist the vote
      await voteMutation.mutateAsync(newVoteValue);
      
      // Show success message
      toast({
        title: newVoteValue === 1 ? "Product upvoted" : "Upvote removed",
        description: newVoteValue === 1 ? "Thank you for your vote!" : "Your upvote has been removed",
        variant: "default"
      });
    } catch (error: any) {
      // Revert visual state if the API request fails
      setHasUpvoted(!newUpvotedState);
      console.error('[ProductPage] Failed to update vote on server:', error);
      
      toast({
        title: "Vote update failed",
        description: error.message || "Failed to update vote",
        variant: "destructive"
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
            {user && product.userId === user.id ? (
              <Button
                variant="default"
                size="sm"
                disabled={true}
                className={cn(
                  "h-9 px-4 flex items-center gap-2",
                  "bg-[#FFD700] border-[#FFD700] text-black hover:bg-[#FFCC00] hover:text-black hover:border-[#FFCC00]"
                )}
              >
                <ArrowUp className="h-4 w-4 text-black" />
                <span className="font-medium">{product.score}</span>
              </Button>
            ) : (
              <Button
                variant={hasUpvoted ? "default" : "outline"}
                size="sm"
                onClick={handleUpvote}
                disabled={voteMutation.isPending}
                className={cn(
                  "h-9 px-4 flex items-center gap-2",
                  hasUpvoted && "bg-[#FFD700] border-[#FFD700] text-black hover:bg-[#FFCC00] hover:text-black hover:border-[#FFCC00]"
                )}
              >
                <ArrowUp className={cn("h-4 w-4", hasUpvoted && "text-black")} />
                <span className="font-medium">{product.score}</span>
              </Button>
            )}

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
                      className="text-xs cursor-pointer hover:bg-secondary/80 hover:text-secondary-foreground"
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
                  className="text-xs cursor-pointer hover:bg-secondary/80 hover:text-secondary-foreground"
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
                  className="text-xs cursor-pointer hover:bg-secondary/80 hover:text-secondary-foreground"
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