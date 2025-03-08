import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUp, MessageSquare, ShoppingBag, MoreVertical, Pencil, Trash2, Package, Globe } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { type Product, type Vote, type Comment } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
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
import { generateSlug, getCountryFlag } from "@/lib/utils";

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

  const { data: vote } = useQuery<Vote>({
    queryKey: ["/api/votes", product.id],
    enabled: !!user,
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

  const handleVote = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    const newValue = vote?.value === 1 ? 0 : 1;
    voteMutation.mutate(newValue);
  };

  const productSlug = generateSlug(product.title, product.companyName);
  const hasUpvoted = vote?.value === 1;

  return (
    <>
      <div className="flex gap-3">
        {/* Product Image */}
        <div className="flex-shrink-0">
          <img
            src={product.imageUrl}
            alt={product.title}
            className="w-24 h-24 object-cover rounded-md"
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <Link href={`/products/${productSlug}`}>
              <a className="no-underline">
                <h3 className="text-lg font-semibold hover:text-primary truncate">
                  {product.title}
                </h3>
              </a>
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

          {isFullView ? (
            <p className="text-muted-foreground text-sm line-clamp-2 mt-1">
              {product.description}
            </p>
          ) : (
            <p className="text-muted-foreground text-sm mt-1">
              {product.companyName}
            </p>
          )}

          <div className="flex items-center gap-2 mt-3">
            <Button
              variant={hasUpvoted ? "default" : "outline"}
              size="sm"
              onClick={handleVote}
              disabled={voteMutation.isPending}
              className="h-7 px-2 flex items-center gap-1"
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

            <a
              href={product.link}
              target="_blank"
              rel="noopener noreferrer"
              className="no-underline"
            >
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
              >
                <ShoppingBag className="h-4 w-4" />
              </Button>
            </a>
          </div>

          {/* Materials and Country */}
          <div className="flex flex-wrap gap-2 mt-3">
            {product.material && product.material.length > 0 && (
              <div className="flex flex-wrap gap-1 items-center">
                <Package className="h-4 w-4 text-muted-foreground" />
                {product.material.map((material) => (
                  <Badge key={material} variant="secondary" className="text-xs">
                    {material}
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex items-center gap-1">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <Badge variant="secondary" className="text-xs">
                {getCountryFlag(product.country)} {product.country}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          <ProductForm
            initialValues={product}
            onSuccess={() => setShowEditDialog(false)}
            isEditing={true}
          />
        </DialogContent>
      </Dialog>

      <AuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
      />
    </>
  );
}