import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUp, MessageSquare, ShoppingBag, MoreVertical, Pencil, Trash2, Package, Globe, FolderOpen } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { type Product } from "@shared/schema";
import { useMutation, useQuery, QueryFunction } from "@tanstack/react-query";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { cn, generateSlug, getCountryFlag } from "@/lib/utils";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ProductForm from "./product-form";
import { useToast } from "@/hooks/use-toast";
import AuthModal from "./auth-modal";
import StripeCheckout from "./stripe-checkout";

export default function ProductCard({
  product,
  isFullView = false,
  isOwner = false
}: {
  product: Product;
  isFullView?: boolean;
  isOwner?: boolean;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showStripeCheckout, setShowStripeCheckout] = useState(false);
  const [stripeClientSecret, setStripeClientSecret] = useState("");
  const [hasUpvoted, setHasUpvoted] = useState(false);
  
  // Get all user votes - optimized with better caching
  const { data: allUserVotes, isSuccess: allVotesSuccess } = useQuery<Array<{ id: number; productId: number; value: number }>>({
    queryKey: ["/api/votes"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user, // Only fetch for authenticated users
    // Using global cache settings instead of aggressive refetching
  });
  
  // Initialize upvote state from API data when component mounts or vote data changes
  useEffect(() => {
    // Using only bulk votes - more efficient
    if (allVotesSuccess && allUserVotes) {
      // Find the vote for this specific product
      const userVoteForProduct = allUserVotes.find(v => v.productId === product.id);
      
      if (userVoteForProduct && userVoteForProduct.value === 1) {
        setHasUpvoted(true);
        return;
      }
    }
    
    // If no vote found or user is not authenticated, ensure upvote is not shown
    setHasUpvoted(false);
  }, [allUserVotes, product.id, allVotesSuccess]);

  // Only fetch comments when needed (not on card list views)
  const { data: comments } = useQuery<any[]>({
    queryKey: [`/api/products/${product.id}/comments`],
    enabled: isFullView, // Only fetch when viewing the full product
  });

  const voteMutation = useMutation({
    mutationFn: async (value: number) => {
      try {
        const res = await apiRequest("POST", "/api/votes", {
          productId: product.id,
          value,
        });
        return res.json();
      } catch (error) {
        // Log the error for debugging purposes
        console.error("[VoteMutation] Error:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("[VoteMutation] Success:", data);
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/votes"] }); // Invalidate bulk votes
      queryClient.invalidateQueries({ queryKey: ["/api/votes", product.id] });
    },
    onError: (error) => {
      console.error("[VoteMutation] Error handler:", error);
      toast({
        title: "Vote failed",
        description: error instanceof Error ? error.message : "Failed to update vote",
        variant: "destructive",
      });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/products/${product.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/products`] });
      toast({
        title: "Product deleted",
        description: "Your product has been successfully deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUpvote = async () => {
    if (!user) {
      setShowAuthModal(true);
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
      if (newVoteValue === 1) {
        toast({
          title: "Product upvoted",
          description: "Thanks for your support!",
          variant: "default"
        });
      } else {
        toast({
          title: "Upvote removed",
          description: "Your upvote has been removed",
          variant: "default"
        });
      }
    } catch (error: any) {
      // Revert visual state if the API request fails
      setHasUpvoted(!newUpvotedState);
      console.error('[ProductCard] Failed to update vote on server:', error);
      
      toast({
        title: "Vote update failed",
        description: error.message || "Failed to update vote",
        variant: "destructive"
      });
    }
  };

  const handleFeatureProduct = async () => {
    if (!user) return;
    if (product.userId !== user.id) return;

    try {
      if (!product.featured) {
        const res = await apiRequest("POST", "/api/create-payment-intent");
        if (res.status === 503) {
          toast({
            title: "Feature Unavailable",
            description: "Featured product listing is temporarily unavailable.",
            variant: "destructive",
          });
          return;
        }
        const data = await res.json();
        if (data.error) {
          toast({
            title: "Error",
            description: data.error,
            variant: "destructive",
          });
          return;
        }
        setStripeClientSecret(data.clientSecret);
        setShowStripeCheckout(true);
      } else {
        toast({
          title: "Already Featured",
          description: "This product is already featured.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    }
  };

  const productSlug = generateSlug(product.title, product.companyName);

  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 relative w-24 h-24 rounded-md overflow-hidden">
        <div className="absolute inset-0 bg-secondary/10" />
        <img
          src={product.imageUrl}
          alt={product.title}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          decoding="async"
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <Link href={`/products/${productSlug}`}>
            <div className="cursor-pointer">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold hover:text-primary truncate">
                  {product.title}
                </h3>
                {product.featured && (
                  <Badge variant="default" className="text-xs">
                    Featured
                  </Badge>
                )}
              </div>
              {!isFullView && (
                <p className="text-muted-foreground text-sm">
                  {product.companyName}
                </p>
              )}
            </div>
          </Link>

          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => deleteProductMutation.mutate()}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex items-center gap-2 mt-3">
          {/* Separate buttons for upvote and feature */}
          {product.userId === user?.id ? (
            <Button
              variant="default"
              size="sm"
              onClick={handleFeatureProduct}
              className={cn(
                "h-7 px-2 flex items-center gap-1",
                "bg-[#FFD700] border-[#FFD700] text-black hover:bg-[#FFCC00] hover:text-black hover:border-[#FFCC00]"
              )}
            >
              <ArrowUp className="h-4 w-4 text-black" />
              <span className="text-sm font-medium">{product.score}</span>
            </Button>
          ) : (
            <Button
              variant={hasUpvoted ? "default" : "outline"}
              size="sm"
              onClick={handleUpvote}
              disabled={voteMutation.isPending || !user}
              className={cn(
                "h-7 px-2 flex items-center gap-1",
                hasUpvoted && "bg-[#FFD700] border-[#FFD700] text-black hover:bg-[#FFCC00] hover:text-black hover:border-[#FFCC00]"
              )}
            >
              <ArrowUp className={cn("h-4 w-4", hasUpvoted && "text-black")} />
              <span className="text-sm font-medium">{product.score}</span>
            </Button>
          )}

          <Link href={`/products/${productSlug}`}>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 flex items-center gap-1"
            >
              <MessageSquare className="h-4 w-4" />
              {comments?.length || 0}
            </Button>
          </Link>

          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => window.open(product.link, '_blank', 'noopener,noreferrer')}
          >
            <ShoppingBag className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
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

        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto pr-2">
              <ProductForm
                initialValues={product}
                onSuccess={() => setShowEditDialog(false)}
                isEditing={true}
              />
            </div>
          </DialogContent>
        </Dialog>

        <AuthModal
          open={showAuthModal}
          onOpenChange={setShowAuthModal}
        />

        <StripeCheckout
          open={showStripeCheckout}
          onOpenChange={setShowStripeCheckout}
          onSuccess={() => {
            setShowStripeCheckout(false);
            queryClient.invalidateQueries({ queryKey: ["/api/products"] });
          }}
          clientSecret={stripeClientSecret}
        />
      </div>
    </div>
  );
}