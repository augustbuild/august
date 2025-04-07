import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Product, Comment, User as SelectUser } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Check, X, Pencil, Mail } from "lucide-react";
import ProductCard from "@/components/product-card";
import UserComments from "@/components/user-comments";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(user?.username || "");
  const [error, setError] = useState("");

  const updateProfileMutation = useMutation<SelectUser, Error, { username?: string; isSubscribedToNewsletter?: boolean }>({
    mutationFn: async (updates) => {
      // Don't send request if there are no actual changes
      if (
        (updates.username === undefined || updates.username === user?.username) &&
        (updates.isSubscribedToNewsletter === undefined || updates.isSubscribedToNewsletter === user?.isSubscribedToNewsletter)
      ) {
        return user as SelectUser;
      }
      
      try {
        const response = await apiRequest("PATCH", "/api/users/profile", updates);
        return await response.json();
      } catch (error) {
        console.error("Error updating profile:", error);
        throw error;
      }
    },
    onSuccess: (updatedUser) => {
      // Check what was changed and show appropriate notifications
      let changes = [];
      
      if (updatedUser.username !== user?.username) {
        changes.push("username");
      }
      
      if (updatedUser.isSubscribedToNewsletter !== user?.isSubscribedToNewsletter) {
        changes.push("newsletter preferences");
      }
      
      if (changes.length > 0) {
        toast({
          title: "Profile updated",
          description: `Your ${changes.join(" and ")} ${changes.length > 1 ? "have" : "has"} been updated successfully.`,
        });
        // Invalidate and refetch any queries that might have the user's data
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      }
      
      setIsEditing(false);
      setError("");
    },
    onError: (error: Error) => {
      console.error("Profile update error:", error);
      let errorMessage = "Failed to update username. Please try again.";
      
      try {
        // Try to parse the error message as JSON
        const errorObj = JSON.parse(error.message);
        if (errorObj.error) {
          errorMessage = errorObj.details || errorObj.error;
        }
      } catch (parseError) {
        // If parsing fails, check if the error message contains useful information
        if (error.message.includes("409") || error.message.includes("Conflict")) {
          errorMessage = "This username is already taken. Please choose a different one.";
        } else if (error.message.includes("401") || error.message.includes("Unauthorized")) {
          errorMessage = "You need to be logged in to update your profile.";
        }
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
    updateProfileMutation.mutate({ username });
  };

  const handleCancelEdit = () => {
    setUsername(user?.username || "");
    setIsEditing(false);
    setError("");
  };
  
  const handleToggleNewsletter = (checked: boolean) => {
    updateProfileMutation.mutate({ isSubscribedToNewsletter: checked });
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
            
            <div className="flex flex-col space-y-4 pt-2">
              <div className="text-sm font-medium">Newsletter Preferences</div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="newsletter-subscription"
                  checked={!!user?.isSubscribedToNewsletter}
                  onCheckedChange={handleToggleNewsletter}
                  disabled={updateProfileMutation.isPending}
                />
                <Label htmlFor="newsletter-subscription" className="flex items-center">
                  <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                  {user?.isSubscribedToNewsletter
                    ? "You are subscribed to our newsletter"
                    : "Subscribe to our newsletter"}
                </Label>
                {updateProfileMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-2" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {user?.isSubscribedToNewsletter
                  ? "We'll send you updates about new products and features."
                  : "Subscribe to receive updates about new products and features."}
              </p>
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