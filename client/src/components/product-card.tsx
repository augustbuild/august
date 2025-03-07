import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowBigDown, ArrowBigUp, MessageSquare, Link as LinkIcon } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { type Product, type User } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

const USER_AVATARS = [
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80",
  "https://images.unsplash.com/photo-1568602471122-7832951cc4c5",
  "https://images.unsplash.com/photo-1499557354967-2b2d8910bcca",
  "https://images.unsplash.com/photo-1503235930437-8c6293ba41f5",
  "https://images.unsplash.com/photo-1502323777036-f29e3972d82f",
  "https://images.unsplash.com/photo-1533636721434-0e2d61030955",
];

type ProductCardProps = {
  product: Product;
  showComments?: boolean;
};

export default function ProductCard({ product, showComments = true }: ProductCardProps) {
  const { user } = useAuth();

  const { data: author } = useQuery<User>({
    queryKey: ["/api/users", product.userId],
  });

  const { data: vote } = useQuery({
    queryKey: ["/api/votes", product.id],
    enabled: !!user,
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

  const handleVote = (value: number) => {
    if (!user) return;
    voteMutation.mutate(value);
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-4">
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
            <div className="flex items-center gap-2 mb-1">
              <Avatar className="h-5 w-5">
                <AvatarImage src={author?.avatarUrl || USER_AVATARS[product.userId % USER_AVATARS.length]} />
                <AvatarFallback>{author?.username?.[0].toUpperCase() || "?"}</AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground">
                Posted by {author?.username || "Anonymous"}
              </span>
            </div>

            <Link href={`/products/${product.id}`}>
              <a className="no-underline">
                <h3 className="text-lg font-semibold hover:text-primary truncate">
                  {product.title}
                </h3>
              </a>
            </Link>

            <p className="text-muted-foreground text-sm line-clamp-2 mb-2">
              {product.description}
            </p>

            <div className="flex items-center gap-4">
              <a 
                href={product.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
              >
                <LinkIcon className="h-4 w-4" />
                Visit Product
              </a>

              {showComments && (
                <Link href={`/products/${product.id}`}>
                  <a className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
                    <MessageSquare className="h-4 w-4" />
                    Discuss
                  </a>
                </Link>
              )}
            </div>
          </div>

          {/* Right side - Voting */}
          <div className="flex flex-col items-center gap-1 ml-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleVote(1)}
              disabled={!user || voteMutation.isPending}
              className={cn("h-8 w-8", vote?.value === 1 && "text-primary")}
            >
              <ArrowBigUp className="h-5 w-5" />
            </Button>
            <span className="font-bold text-sm">{product.score}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleVote(-1)}
              disabled={!user || voteMutation.isPending}
              className={cn("h-8 w-8", vote?.value === -1 && "text-primary")}
            >
              <ArrowBigDown className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}