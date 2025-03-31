import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { insertProductSchema } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, X, Loader2 } from "lucide-react";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import StripeCheckout from "./stripe-checkout";
import AuthModal from "./auth-modal";

import { materials, countries, collections } from "@/lib/category-data";

// Update the Product interface to remove description
interface Product {
  id: number;
  title: string;
  link: string;
  imageUrl: string;
  companyName: string;
  country: string;
  material: string[] | null;
  collection: string;
  featured?: boolean;
}

const getCountryFlag = (country: string) => {
    // Add your country flag logic here.  This is a placeholder.  A real implementation would require an external library or a mapping to flag images.
    return "";
};

export default function ProductForm({
  onSuccess,
  initialValues,
  isEditing = false
}: {
  onSuccess?: () => void;
  initialValues?: Product;
  isEditing?: boolean;
}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showStripeCheckout, setShowStripeCheckout] = useState(false);
  const [stripeClientSecret, setStripeClientSecret] = useState("");
  const [wantsFeatured, setWantsFeatured] = useState(initialValues?.featured || false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [materialOpen, setMaterialOpen] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [materialSearch, setMaterialSearch] = useState("");
  const [countrySearch, setCountrySearch] = useState("");
  const [collectionSearch, setCollectionSearch] = useState("");

  const form = useForm({
    resolver: zodResolver(insertProductSchema),
    defaultValues: {
      ...(initialValues || {
        title: "",
        link: "",
        imageUrl: "",
        companyName: "",
        country: "",
        material: [] as string[],
        collection: "",
        featured: false,
      }),
    },
  });

  const filteredMaterials = materials.filter((material) =>
    material.toLowerCase().includes(materialSearch.toLowerCase())
  );

  const filteredCountries = countries.filter((country) =>
    country.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const filteredCollections = collections.filter((collection) =>
    collection.toLowerCase().includes(collectionSearch.toLowerCase())
  );

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (!user) {
        setShowAuthModal(true);
        throw new Error("Please log in to submit a product");
      }

      try {
        console.log("Starting product submission with data:", data);
        const productData = { ...data };

        // Remove description field if it exists
        delete productData.description;

        // Then submit the product (description will be generated server-side)
        console.log("Submitting product...");
        const res = await apiRequest(
          isEditing ? "PATCH" : "POST",
          isEditing ? `/api/products/${initialValues?.id}` : "/api/products",
          productData
        );

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to submit product");
        }

        return res.json();
      } catch (error: any) {
        console.error("Product submission error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      if (user) {
        queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/products`] });
      }
      toast({
        title: isEditing ? "Product updated" : "Product submitted",
        description: isEditing
          ? "Your product has been successfully updated."
          : "Your product has been successfully submitted.",
      });
      form.reset();
      onSuccess?.();
    },
    onError: (error: Error) => {
      console.error("Mutation error:", error);
      if (error.message !== "Please log in to submit a product") {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  const handleMaterialSelect = (selectedMaterial: string) => {
    const currentValue = form.getValues("material") || [];
    const newValue = currentValue.includes(selectedMaterial)
      ? currentValue.filter((m) => m !== selectedMaterial)
      : [...currentValue, selectedMaterial];
    form.setValue("material", newValue);
  };

  const onSubmit = async (data: any) => {
    console.log("Form submitted with data:", data);

    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (form.formState.errors && Object.keys(form.formState.errors).length > 0) {
      console.error("Form validation errors:", form.formState.errors);
      return;
    }

    if (wantsFeatured) {
      try {
        const res = await apiRequest("POST", "/api/create-payment-intent");
        if (res.status === 503) {
          toast({
            title: "Feature Unavailable",
            description: "Featured product listing is temporarily unavailable. Your product will be submitted without the featured flag.",
            variant: "destructive",
          });
          mutation.mutate({ ...data, featured: false });
          return;
        }
        const paymentData = await res.json();
        if (paymentData.error) {
          toast({
            title: "Error",
            description: paymentData.error,
            variant: "destructive",
          });
          return;
        }
        setStripeClientSecret(paymentData.clientSecret);
        setShowStripeCheckout(true);
        return;
      } catch (error) {
        console.error('[Product Form] Payment intent creation failed:', error);
        toast({
          title: "Feature Unavailable",
          description: "Featured product listing is currently unavailable. Your product will be submitted without the featured flag.",
          variant: "destructive",
        });
        mutation.mutate({ ...data, featured: false });
        return;
      }
    }

    mutation.mutate({ ...data, featured: wantsFeatured });
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">{isEditing ? "Edit Product" : "Submit a Product"}</h2>
      {!user ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">Please log in to submit a product</p>
          <Button onClick={() => setShowAuthModal(true)}>
            Log In
          </Button>
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pb-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter product name"
                      className="focus:ring-0 focus:border-foreground ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter company name"
                      className="focus:ring-0 focus:border-foreground ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="link"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="url"
                      placeholder="https://example.com"
                      className="focus:ring-0 focus:border-foreground ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      className="focus:ring-0 focus:border-foreground ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="collection"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Collection</FormLabel>
                  <Popover open={collectionOpen} onOpenChange={setCollectionOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={collectionOpen}
                          className="w-full justify-between"
                        >
                          {field.value
                            ? collections.find(
                                (collection) => collection === field.value
                              )
                            : "Select collection"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput 
                          placeholder="Search collection..." 
                          value={collectionSearch}
                          onValueChange={setCollectionSearch}
                        />
                        <CommandEmpty>No collection found.</CommandEmpty>
                        <CommandGroup>
                          <ScrollArea className="h-[200px]">
                            <div>
                              {filteredCollections.map((collection) => (
                                <CommandItem
                                  key={collection}
                                  value={collection}
                                  onSelect={() => {
                                    form.setValue("collection", collection);
                                    setCollectionOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value === collection
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {collection}
                                </CommandItem>
                              ))}
                            </div>
                            <ScrollBar orientation="vertical" />
                          </ScrollArea>
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={countryOpen}
                          className="w-full justify-between"
                        >
                          {field.value
                            ? countries.find(
                                (country) => country === field.value
                              )
                            : "Select country"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput 
                          placeholder="Search country..." 
                          value={countrySearch}
                          onValueChange={setCountrySearch}
                        />
                        <CommandEmpty>No country found.</CommandEmpty>
                        <CommandGroup>
                          <ScrollArea className="h-[200px]">
                            <div>
                              {filteredCountries.map((country) => (
                                <CommandItem
                                  key={country}
                                  value={country}
                                  onSelect={() => {
                                    form.setValue("country", country);
                                    setCountryOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value === country
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {country}
                                </CommandItem>
                              ))}
                            </div>
                            <ScrollBar orientation="vertical" />
                          </ScrollArea>
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="material"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Materials</FormLabel>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {(field.value || []).map((material: string) => (
                      <Badge
                        key={material}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {material}
                        <X
                          className="h-3 w-3 cursor-pointer hover:text-destructive"
                          onClick={() => {
                            handleMaterialSelect(material);
                          }}
                        />
                      </Badge>
                    ))}
                  </div>
                  <Popover open={materialOpen} onOpenChange={setMaterialOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={materialOpen}
                          className="w-full justify-between"
                        >
                          {field.value && field.value.length > 0
                            ? `${field.value.length} material${field.value.length > 1 ? 's' : ''} selected`
                            : "Select materials"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput 
                          placeholder="Search materials..." 
                          value={materialSearch}
                          onValueChange={setMaterialSearch}
                        />
                        <CommandEmpty>No material found.</CommandEmpty>
                        <CommandGroup>
                          <ScrollArea className="h-[200px]">
                            <div>
                              {filteredMaterials.map((material) => (
                                <CommandItem
                                  key={material}
                                  value={material}
                                  onSelect={() => handleMaterialSelect(material)}
                                >
                                  <div className="flex items-center">
                                    <div
                                      className={cn(
                                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                        field.value?.includes(material)
                                          ? "bg-primary text-primary-foreground"
                                          : "opacity-50 [&_svg]:invisible"
                                      )}
                                    >
                                      <Check className="h-3 w-3" />
                                    </div>
                                    {material}
                                  </div>
                                </CommandItem>
                              ))}
                            </div>
                            <ScrollBar orientation="vertical" />
                          </ScrollArea>
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="sticky bottom-0 pt-4 bg-background">
              {isEditing ? (
                <>
                  <div className="flex items-center space-x-2 mb-4">
                    <Checkbox
                      id="featured"
                      checked={form.getValues("featured")}
                      onCheckedChange={(checked) => {
                        form.setValue("featured", checked as boolean);
                        setWantsFeatured(checked as boolean);
                      }}
                    />
                    <label
                      htmlFor="featured"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Featured product ($100/month)
                    </label>
                  </div>
                  <Button
                    type="submit"
                    disabled={mutation.isPending}
                  >
                    {mutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex items-center space-x-2 mb-4">
                    <Checkbox
                      id="featured"
                      checked={wantsFeatured}
                      onCheckedChange={(checked) => setWantsFeatured(checked as boolean)}
                    />
                    <label
                      htmlFor="featured"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Feature this product on the homepage ($100/month)
                    </label>
                  </div>
                  <Button
                    type="submit"
                    disabled={mutation.isPending}
                  >
                    {mutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Product"
                    )}
                  </Button>
                </>
              )}
            </div>
          </form>
        </Form>
      )}

      <AuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
      />

      <StripeCheckout
        open={showStripeCheckout}
        onOpenChange={setShowStripeCheckout}
        onSuccess={() => {
          setShowStripeCheckout(false);
          mutation.mutate({ ...form.getValues(), featured: true });
        }}
        clientSecret={stripeClientSecret}
      />
    </div>
  );
}