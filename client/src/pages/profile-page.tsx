import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import type { Product, Comment } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import ProductCard from "@/components/product-card";
import UserComments from "@/components/user-comments";

export default function ProfilePage() {
  const { user } = useAuth();

  const { data: userProducts, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: [`/api/users/${user?.id}/products`],
    enabled: !!user,
  });

  const { data: userComments, isLoading: commentsLoading } = useQuery<Comment[]>({
    queryKey: [`/api/users/${user?.id}/comments`],
    enabled: !!user,
  });

  if (productsLoading || commentsLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">My Profile</h1>
      
      <Tabs defaultValue="submissions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="submissions">My Submissions</TabsTrigger>
          <TabsTrigger value="comments">My Comments</TabsTrigger>
        </TabsList>

        <TabsContent value="submissions" className="space-y-6">
          {userProducts?.length === 0 ? (
            <p className="text-muted-foreground">You haven't submitted any products yet.</p>
          ) : (
            userProducts?.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                showComments={false}
                isOwner={true}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="comments">
          {userComments?.length === 0 ? (
            <p className="text-muted-foreground">You haven't made any comments yet.</p>
          ) : (
            <UserComments comments={userComments || []} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
