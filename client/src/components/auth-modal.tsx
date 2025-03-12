import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { magicLinkSchema } from "@shared/schema";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: {
      email: "",
    },
  });

  const handleSubmit = async (data: { email: string }) => {
    try {
      const res = await apiRequest("POST", "/api/auth/magic-link", data);
      const response = await res.json();

      if (!res.ok) {
        throw new Error(response.message);
      }

      setEmailSent(true);
      toast({
        title: "Check your email",
        description: "We've sent you a magic link to sign in.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-instrument italic">Welcome to August</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Join our community to discover and share extraordinary products
          </p>
        </div>

        <div className="flex flex-col space-y-4">
          {emailSent ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                Check your email for a magic link to sign in.
              </p>
              <Button
                variant="link"
                className="mt-2"
                onClick={() => {
                  setEmailSent(false);
                  form.reset();
                }}
              >
                Try another email
              </Button>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} placeholder="Enter your email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">
                  Send Magic Link
                </Button>
              </form>
            </Form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}