import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { magicLinkSchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SiGithub } from "react-icons/si";
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
      await apiRequest("POST", "/api/auth/magic-link", data);
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
          <a href="/api/auth/github" className="w-full">
            <Button className="w-full flex items-center justify-center gap-2">
              <SiGithub className="w-5 h-5" />
              Continue with GitHub
            </Button>
          </a>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>

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