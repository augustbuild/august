import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Mail } from "lucide-react";

const newsletterSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  firstName: z.string().optional(),
  source: z.string().optional(),
});

type NewsletterFormData = z.infer<typeof newsletterSchema>;

interface NewsletterFormProps {
  variant?: "default" | "inline" | "compact";
  showFirstName?: boolean;
  source?: string;
  className?: string;
}

export default function NewsletterForm({
  variant = "default",
  showFirstName = false,
  source = "website",
  className = "",
}: NewsletterFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<NewsletterFormData>({
    resolver: zodResolver(newsletterSchema),
    defaultValues: {
      email: "",
      firstName: "",
      source,
    },
  });

  async function onSubmit(data: NewsletterFormData) {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      const responseData = await response.json();

      if (!response.ok) {
        throw responseData;
      }

      setIsSuccess(true);
      form.reset();
      toast({
        title: "Successfully subscribed",
        description: responseData.message || "Thank you for subscribing to our newsletter!",
      });
    } catch (error: any) {
      console.error("Newsletter subscription error:", error);
      toast({
        title: "Subscription failed",
        description: error.details || "There was a problem subscribing you to the newsletter. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Define layout classes based on variant
  const containerClasses = {
    default: "bg-card rounded-md p-6 shadow-sm border",
    inline: "flex flex-col sm:flex-row items-end gap-3 w-full",
    compact: "flex items-end gap-2 w-full",
  }[variant];

  const innerFormClasses = {
    default: "space-y-4",
    inline: "flex-1 flex flex-col sm:flex-row gap-3 w-full",
    compact: "flex-1 flex gap-2 w-full",
  }[variant];

  // If already successfully submitted, show a success message
  if (isSuccess && variant === "default") {
    return (
      <div className={`${containerClasses} ${className}`}>
        <div className="text-center py-4">
          <Mail className="h-12 w-12 text-primary mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Thank you for subscribing!</h3>
          <p className="text-muted-foreground">
            You have been added to our newsletter. Get ready for new product recommendations!
          </p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => setIsSuccess(false)}
          >
            Subscribe another email
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${containerClasses} ${className}`}>
      {variant === "default" && (
        <div className="mb-4">
          <h3 className="text-xl font-semibold mb-1">Get Product Recommendations</h3>
          <p className="text-muted-foreground text-sm">
            Join our newsletter to receive the latest product recommendations directly in your inbox.
          </p>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className={innerFormClasses}>
          {showFirstName && (
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem className={variant === "compact" ? "hidden" : ""}>
                  <FormControl>
                    <Input
                      placeholder="First Name (optional)"
                      {...field}
                      className="h-10"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input
                    type="email"
                    placeholder="Email address"
                    {...field}
                    className="h-10"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            disabled={isSubmitting}
            className={variant === "compact" ? "px-3 h-10" : "h-10"}
          >
            {isSubmitting ? "Subscribing..." : "Subscribe"}
          </Button>
        </form>
      </Form>
    </div>
  );
}