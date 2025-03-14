import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUp, MessageSquare, ShoppingBag, MoreVertical, Pencil, Trash2, Package, Globe, FolderOpen } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { type Product, type Vote, type Comment } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn, generateSlug, getCountryFlag } from "@/lib/utils";
import { useState } from "react";
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

  const { data: vote } = useQuery<Vote>({
    queryKey: ["/api/votes", product.id],
    enabled: !!user && !!product.id,
  });

  const { data: comments } = useQuery<Comment[]>({
    queryKey: [`/api/products/${product.id}/comments`],
    enabled: true,
  });

  const voteMutation = useMutation({
    mutationFn: async (value: number) => {
      const res = await apiRequest("POST", "/api/votes", {
        productId: product.id,
        value,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/votes", product.id] });
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

  const handleVote = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    try {
      if (product.userId === user.id && !product.featured) {
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
        return;
      }

      if (product.userId === user.id && product.featured) {
        toast({
          title: "Already Featured",
          description: "This product is already featured.",
        });
        return;
      }

      const newValue = vote?.value === 1 ? 0 : 1;
      voteMutation.mutate(newValue);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    }
  };

  const productSlug = generateSlug(product.title, product.companyName);
  const isCreator = user?.id === product.userId;
  const hasUpvoted = vote?.value === 1;

  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 relative w-24 h-24 rounded-md overflow-hidden">
        <div className="absolute inset-0 bg-secondary/10" />
        <img
          src={product.imageUrl}
          alt={product.title}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
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
          <Button
            variant="outline"
            size="sm"
            onClick={handleVote}
            disabled={voteMutation.isPending}
            className={cn(
              "h-7 px-2 flex items-center gap-1",
              hasUpvoted && "bg-[#855c0f] border-[#855c0f] text-white hover:bg-[#855c0f] hover:text-white hover:border-[#855c0f]"
            )}
          >
            <ArrowUp className="h-4 w-4" />
            <span className="text-sm font-medium">{product.score}</span>
          </Button>

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