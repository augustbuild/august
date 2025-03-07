import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { insertProductSchema } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

// Materials list sorted alphabetically
const materials = [
  "ABS",
  "Aluminum",
  "Ash",
  "Badger Hair",
  "Bamboo",
  "Beef Tallow",
  "Beech",
  "Beeswax",
  "Boar Bristles",
  "Brass",
  "Carbon Fiber",
  "Carbon Steel",
  "Cashmere",
  "Cedar",
  "Ceramic",
  "Cherry",
  "Coconut Oil",
  "Copper",
  "Cork",
  "Cotton",
  "Damascus Steel",
  "Dyneema",
  "Elastane",
  "Feathers",
  "Felt",
  "Fiberglass",
  "Glass",
  "Goose Down",
  "Horse Hair",
  "Leather",
  "Linen",
  "Maple",
  "Marble",
  "MDPE",
  "Merino Wool",
  "Nylon",
  "Oak",
  "Olive Wood",
  "Pine",
  "Plant Fibers",
  "Plant Foam",
  "Polycarbonate",
  "Polyester",
  "Polyethylene",
  "Polypropylene",
  "PVC",
  "Resin",
  "Rubber",
  "Shearling",
  "Silicone",
  "Stainless Steel",
  "Steel",
  "Stone",
  "Suede",
  "Titanium",
  "Twill",
  "Walnut",
  "Waxed Canvas",
  "Wood",
  "Wool",
  "Zinc"
];

interface Product {
  id: number;
  title: string;
  description: string;
  link: string;
  imageUrl: string;
  companyName: string;
  country: string;
  material: string[];
}

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

  const form = useForm({
    resolver: zodResolver(insertProductSchema),
    defaultValues: initialValues || {
      title: "",
      description: "",
      link: "",
      imageUrl: "",
      companyName: "",
      country: "",
      material: [],
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest(
        isEditing ? "PATCH" : "POST",
        isEditing ? `/api/products/${initialValues?.id}` : "/api/products",
        data
      );
      return res.json();
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
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">{isEditing ? "Edit Product" : "Submit a Product"}</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter product name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea 
                    {...field} 
                    placeholder="Describe what makes this product extraordinary"
                    className="min-h-[100px]"
                  />
                </FormControl>
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
                <FormControl>
                  <Select 
                    onValueChange={(value: string[]) => field.onChange(value)}
                    value={field.value || []}
                    multiple
                  >
                    <SelectTrigger className="h-auto min-h-[40px] flex-wrap gap-1">
                      <div className="flex flex-wrap gap-1">
                        {(field.value || []).map((material) => (
                          <Badge
                            key={material}
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            {material}
                            <X
                              className="h-3 w-3 cursor-pointer hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                field.onChange((field.value || []).filter((m) => m !== material));
                              }}
                            />
                          </Badge>
                        ))}
                        {(!field.value || field.value.length === 0) && (
                          <SelectValue placeholder="Select materials" />
                        )}
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {materials.map((material) => (
                        <SelectItem
                          key={material}
                          value={material}
                          className="flex items-center gap-2"
                        >
                          <div className="flex-1">{material}</div>
                          {(field.value || []).includes(material) && (
                            <Check className="h-4 w-4 opacity-70" />
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                <FormLabel>Company Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter company name" />
                </FormControl>
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
                <FormControl>
                  <Select 
                    value={field.value} 
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                <FormLabel>Image URL</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    type="url" 
                    placeholder="https://example.com/image.jpg"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={mutation.isPending}>
            {isEditing ? "Save Changes" : "Submit Product"}
          </Button>
        </form>
      </Form>
    </div>
  );
}