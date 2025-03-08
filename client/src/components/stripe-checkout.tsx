import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Initialize Stripe with comprehensive error handling and logging
let stripePromise;
try {
  const publicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
  if (!publicKey) {
    console.warn('[Stripe] Public key missing - payment features will be disabled');
  } else {
    console.log('[Stripe] Initializing with public key');
    stripePromise = loadStripe(publicKey).catch(error => {
      console.error('[Stripe] Failed to initialize:', error);
      return null;
    });
  }
} catch (error) {
  console.error('[Stripe] Initialization error:', error);
}

function CheckoutForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      toast({
        title: "Payment System Unavailable",
        description: "The payment system is not properly configured. Please try again later.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success`,
        },
      });

      if (error) {
        console.error('[Stripe] Payment confirmation error:', error);
        toast({
          title: "Payment Failed",
          description: error.message || "An error occurred during payment processing.",
          variant: "destructive",
        });
      } else {
        onSuccess();
      }
    } catch (error: any) {
      console.error('[Stripe] Payment submission error:', error);
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button type="submit" disabled={!stripe || isSubmitting} className="w-full">
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          "Pay $100/month"
        )}
      </Button>
    </form>
  );
}

export default function StripeCheckout({
  open,
  onOpenChange,
  onSuccess,
  clientSecret,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  clientSecret: string;
}) {
  const { toast } = useToast();

  if (!stripePromise) {
    console.warn('[Stripe] Checkout unavailable - Stripe not initialized');
    toast({
      title: "Payment System Unavailable",
      description: "The payment system is temporarily unavailable. Please try again later.",
      variant: "destructive",
    });
    onOpenChange(false);
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Feature Your Product</DialogTitle>
        </DialogHeader>
        <div className="text-muted-foreground mb-4">
          Your product will be featured on the homepage for $100/month.
        </div>
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CheckoutForm onSuccess={onSuccess} />
        </Elements>
      </DialogContent>
    </Dialog>
  );
}