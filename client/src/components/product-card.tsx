import { Button } from "@/components/ui/button";
import { ArrowBigUp, MessageSquare, ShoppingBag, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Link } from "wouter";
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

export default function ProductCard({
  product,
  showComments = true,
  isOwner = false
}: {
  product: Product;
  showComments?: boolean;
  isOwner?: boolean;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showEditDialog, setShowEditDialog] = useState(false);

  const { data: vote } = useQuery<Vote>({
    queryKey: ["/api/votes", product.id],
    enabled: !!user,
  });

  const { data: comments } = useQuery<Comment[]>({
    queryKey: [`/api/products/${product.id}/comments`],
    enabled: showComments,
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
    if (!user) return;
    const newValue = vote?.value === 1 ? 0 : 1;
    voteMutation.mutate(newValue);
  };

  const isUserProduct = user?.id === product.userId;
  const hasUpvoted = vote?.value === 1;
  const showDarkButton = hasUpvoted || isUserProduct;

  return (
    <>
      <div className="flex gap-3">
        {/* Left side - Image */}
        <div className="flex-shrink-0">
          <img
            src={product.imageUrl}
            alt={product.title}
            className="w-24 h-24 object-cover rounded-md"
          />
        </div>

        {/* Center - Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <Link href={`/products/${product.id}`}>
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

          <p className="text-muted-foreground text-sm line-clamp-2 mt-1">
            {product.description}
          </p>

          <div className="flex items-center gap-2 mt-3">
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

            {showComments && (
              <Link href={`/products/${product.id}`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 flex items-center gap-1"
                >
                  <MessageSquare className="h-4 w-4" />
                  {comments?.length || 0}
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Right side - Vote Button */}
        <Button
          variant="outline"
          onClick={handleVote}
          disabled={!user || voteMutation.isPending}
          className={cn(
            "h-24 w-24 flex items-center justify-center",
            showDarkButton && "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
          )}
        >
          <div className="flex items-center">
            <ArrowBigUp className="h-16 w-16 mr-2" />
            <span className="text-3xl font-medium leading-none">{product.score}</span>
          </div>
        </Button>
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
    </>
  );
}