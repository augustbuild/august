import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Product, Comment } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Check, X, Pencil } from "lucide-react";
import ProductCard from "@/components/product-card";
import UserComments from "@/components/user-comments";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(user?.username || "");
  const [error, setError] = useState("");

  const updateProfileMutation = useMutation({
    mutationFn: async (newUsername: string) => {
      return await apiRequest<any>("/api/users/profile", {
        method: "PATCH",
        body: JSON.stringify({ username: newUsername }),
      });
    },
    onSuccess: (updatedUser) => {
      toast({
        title: "Profile updated",
        description: "Your username has been updated successfully.",
      });
      // Invalidate and refetch any queries that might have the user's data
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setIsEditing(false);
      setError("");
    },
    onError: (error: Error) => {
      let errorMessage = "Failed to update username. Please try again.";
      try {
        const parsedError = JSON.parse(error.message);
        if (parsedError.error) {
          errorMessage = parsedError.details || parsedError.error;
        }
      } catch {
        // Use default error message if parsing fails
      }
      setError(errorMessage);
    },
  });

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

  const handleSaveUsername = () => {
    if (!username.trim()) {
      setError("Username cannot be empty");
      return;
    }
    updateProfileMutation.mutate(username);
  };

  const handleCancelEdit = () => {
    setUsername(user?.username || "");
    setIsEditing(false);
    setError("");
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">My Profile</h1>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col space-y-1">
              <div className="text-sm font-medium">Username</div>
              {!isEditing ? (
                <div className="flex items-center justify-between">
                  <div>{user?.username}</div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setIsEditing(true)}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter new username"
                    className={error ? "border-destructive" : ""}
                  />
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      onClick={handleSaveUsername}
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      Save
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleCancelEdit}
                      disabled={updateProfileMutation.isPending}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col space-y-1">
              <div className="text-sm font-medium">Email</div>
              <div>{user?.email || 'Not provided'}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="submissions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="submissions">My Submissions</TabsTrigger>
          <TabsTrigger value="comments">My Comments</TabsTrigger>
        </TabsList>

        <TabsContent value="submissions" className="space-y-6">
          {userProducts?.length === 0 ? (
            <p className="text-muted-foreground">You haven't submitted any products yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {userProducts?.map((product) => (
                <div key={product.id} className="py-4 first:pt-0 last:pb-0">
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    isFullView={false}
                    isOwner={true}
                  />
                </div>
              ))}
            </div>
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