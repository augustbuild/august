import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { insertProductSchema } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import StripeCheckout from "./stripe-checkout";

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

// Countries list
const countries = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
  "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina",
  "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cambodia", "Cameroon", "Canada", "Cape Verde", "Central African Republic",
  "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti",
  "Dominica", "Dominican Republic", "East Timor", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Ethiopia",
  "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau",
  "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Ivory Coast",
  "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "North Korea", "South Korea", "Kuwait", "Kyrgyzstan", "Laos", "Latvia",
  "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Macedonia", "Madagascar", "Malawi", "Malaysia",
  "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia",
  "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger",
  "Nigeria", "Norway", "Oman", "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland",
  "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa",
  "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia",
  "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Swaziland", "Sweden",
  "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey",
  "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan",
  "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

// Collections list
const collections = [
  "Pans",
  "Bags",
  "Appliances",
  "Razors",
  "Footwear",
  "Tableware",
  "Tools",
  "Shirts",
  "Pens & Pencils",
  "Wallets",
  "Food Containers",
  "Kitchen Accessories",
  "Music",
  "Camping Gear",
  "Luggage",
  "Brushes",
  "Pots",
  "Bottles",
  "Hats",
  "Desk Accessories",
  "Jackets",
  "Chairs & Stools",
  "Towels & Blankets",
  "Purifiers",
  "Glasses",
  "Furniture",
  "Knives",
  "Oral Care",
  "Keycases",
  "Belts",
  "Fitness Gear",
  "Cameras & Binoculars",
  "Games",
  "Cutting Boards",
  "Kettles",
  "Dishes",
  "Lighting",
  "Water Equipment",
  "Pants",
  "Bed & Bedding",
  "Home Accessories",
  "Computer Accessories",
  "Socks",
  "Umbrellas",
  "Toys",
  "Blenders",
  "Watches",
  "Bowls",
  "Soaps",
  "Yoga Mats",
  "Underwear",
  "Tubs",
  "Coops",
  "Gloves"
].sort();

interface Product {
  id: number;
  title: string;
  description: string;
  link: string;
  imageUrl: string;
  companyName: string;
  country: string;
  material: string[];
  collection: string;
  featured?: boolean; // Added featured property
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
  const [materialsOpen, setMaterialsOpen] = useState(false);
  const [materialSearch, setMaterialSearch] = useState("");
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [collectionSearch, setCollectionSearch] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [showStripeCheckout, setShowStripeCheckout] = useState(false);
  const [stripeClientSecret, setStripeClientSecret] = useState("");
  const [wantsFeatured, setWantsFeatured] = useState(false);

  const form = useForm({
    resolver: zodResolver(insertProductSchema),
    defaultValues: {
      ...(initialValues || {
        title: "",
        description: "",
        link: "",
        imageUrl: "",
        companyName: "",
        country: "",
        material: [] as string[],
        collection: "",
        featured: false, // Added default value for featured
      }),
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

  const handleMaterialSelect = (selectedMaterial: string) => {
    const currentValue = form.getValues("material") || [];
    const newValue = currentValue.includes(selectedMaterial)
      ? currentValue.filter((m) => m !== selectedMaterial)
      : [...currentValue, selectedMaterial];
    form.setValue("material", newValue);
  };

  const filteredMaterials = materials.filter((material) =>
    material.toLowerCase().includes(materialSearch.toLowerCase())
  );

  const filteredCollections = collections.filter((collection) =>
    collection.toLowerCase().includes(collectionSearch.toLowerCase())
  );

  const filteredCountries = countries.filter((country) =>
    country.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const handleSubmit = async (data: any) => {
    if (wantsFeatured && !isEditing) {
      // Get payment intent from server
      const res = await apiRequest("POST", "/api/create-payment-intent");
      const { clientSecret } = await res.json();
      setStripeClientSecret(clientSecret);
      setShowStripeCheckout(true);
      return;
    }

    mutation.mutate(data);
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">{isEditing ? "Edit Product" : "Submit a Product"}</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pb-4">
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
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="What makes this product extraordinary?"
                    className="min-h-[100px] focus:ring-0 focus:border-foreground ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none"
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
                <FormControl>
                  <Popover open={collectionOpen} onOpenChange={setCollectionOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={collectionOpen}
                        className="w-full justify-between focus:ring-0 focus:border-foreground ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none"
                      >
                        {field.value ? (
                          field.value
                        ) : (
                          <span className="text-muted-foreground">Select collection</span>
                        )}
                        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput
                          placeholder="Search collections..."
                          value={collectionSearch}
                          onValueChange={setCollectionSearch}
                          className="focus:ring-0 focus:border-foreground ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none"
                        />
                        <CommandEmpty>No collections found.</CommandEmpty>
                        <CommandGroup className="max-h-64 overflow-auto">
                          {filteredCollections.map((collection) => (
                            <CommandItem
                              key={collection}
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
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
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
                  <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={countryOpen}
                        className="w-full justify-between focus:ring-0 focus:border-foreground ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none"
                      >
                        {field.value ? (
                          `${field.value}`
                        ) : (
                          <span className="text-muted-foreground">Select country</span>
                        )}
                        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput
                          placeholder="Search countries..."
                          value={countrySearch}
                          onValueChange={setCountrySearch}
                          className="focus:ring-0 focus:border-foreground ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none"
                        />
                        <CommandEmpty>No countries found.</CommandEmpty>
                        <CommandGroup className="max-h-64 overflow-auto">
                          {filteredCountries.map((country) => (
                            <CommandItem
                              key={country}
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
                              {getCountryFlag(country)} {country}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
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
                <FormControl>
                  <Popover open={materialsOpen} onOpenChange={setMaterialsOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={materialsOpen}
                        className="w-full justify-between focus:ring-0 focus:border-foreground ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none"
                      >
                        <span className="text-muted-foreground">Select materials</span>
                        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput
                          placeholder="Search materials..."
                          value={materialSearch}
                          onValueChange={setMaterialSearch}
                          className="focus:ring-0 focus:border-foreground ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none"
                        />
                        <CommandEmpty>No materials found.</CommandEmpty>
                        <CommandGroup className="max-h-64 overflow-auto">
                          {filteredMaterials.map((material) => (
                            <CommandItem
                              key={material}
                              onSelect={() => handleMaterialSelect(material)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  (field.value || []).includes(material)
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {material}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </FormControl>
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
                    disabled={true}
                  />
                  <label
                    htmlFor="featured"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Featured product ($100/month)
                  </label>
                </div>
                <Button type="submit" disabled={mutation.isPending}>
                  Save Changes
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
                <Button type="submit" disabled={mutation.isPending}>
                  Submit Product
                </Button>
              </>
            )}
          </div>
        </form>
      </Form>

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