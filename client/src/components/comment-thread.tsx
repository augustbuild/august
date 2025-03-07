import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertCommentSchema } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import type { Comment, User } from "@shared/schema";

const USER_AVATARS = [
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80",
  "https://images.unsplash.com/photo-1568602471122-7832951cc4c5",
  "https://images.unsplash.com/photo-1499557354967-2b2d8910bcca",
  "https://images.unsplash.com/photo-1503235930437-8c6293ba41f5",
  "https://images.unsplash.com/photo-1502323777036-f29e3972d82f",
  "https://images.unsplash.com/photo-1533636721434-0e2d61030955",
];

type CommentProps = {
  comment: Comment;
  productId: number;
  depth?: number;
};

function CommentComponent({ comment, productId, depth = 0 }: CommentProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: author } = useQuery<User>({
    queryKey: ["/api/users", comment.userId],
    enabled: !!comment.userId,
  });

  const { data: replies } = useQuery<Comment[]>({
    queryKey: ["/api/products", productId, "comments"],
    select: (comments) => comments.filter((c) => c.parentId === comment.id),
  });

  const form = useForm({
    resolver: zodResolver(insertCommentSchema),
    defaultValues: {
      content: "",
      productId,
      parentId: comment.id,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof form.getValues) => {
      const res = await apiRequest("POST", "/api/comments", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products", productId, "comments"] });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (depth > 5) return null;

  return (
    <div className="mt-4">
      <div className="flex items-start gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={author?.avatarUrl || USER_AVATARS[comment.userId % USER_AVATARS.length]} />
          <AvatarFallback>{author?.username?.[0].toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="text-sm font-medium">{author?.username || "Anonymous"}</div>
          <p className="text-muted-foreground mt-1">{comment.content}</p>

          {user && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="mt-2">
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Reply to this comment..."
                          className="min-h-[80px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="mt-2" disabled={mutation.isPending}>
                  Reply
                </Button>
              </form>
            </Form>
          )}

          {replies && replies.map((reply) => (
            <CommentComponent
              key={reply.id}
              comment={reply}
              productId={productId}
              depth={depth + 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

type CommentThreadProps = {
  productId: number;
};

export default function CommentThread({ productId }: CommentThreadProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: comments } = useQuery<Comment[]>({
    queryKey: ["/api/products", productId, "comments"],
    select: (comments) => comments.filter((c) => !c.parentId),
  });

  const form = useForm({
    resolver: zodResolver(insertCommentSchema),
    defaultValues: {
      content: "",
      productId,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof form.getValues) => {
      const res = await apiRequest("POST", "/api/comments", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products", productId, "comments"] });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Card>
      <CardContent className="pt-6">
        {user && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="mb-6">
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="What are your thoughts?"
                        className="min-h-[100px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="mt-2" disabled={mutation.isPending}>
                Comment
              </Button>
            </form>
          </Form>
        )}

        <div className="space-y-6">
          {comments?.map((comment) => (
            <CommentComponent
              key={comment.id}
              comment={comment}
              productId={productId}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
