import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Package, Globe, FolderOpen, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import type { Product } from "@shared/schema";
import { materials, countries, collections } from "@/lib/category-data";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CategorySection {
  title: string;
  icon: typeof Package;
  type: "materials" | "countries" | "collections";
  items: { name: string; count: number }[];
}

export default function CategoryHighlights() {
  const [activeTab, setActiveTab] = useState<string>("materials");
  
  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });
  
  const getCategoryCounts = () => {
    if (!products) return {
      materialCounts: {},
      countryCounts: {},
      collectionCounts: {}
    };
    
    const materialCounts: Record<string, number> = {};
    const countryCounts: Record<string, number> = {};
    const collectionCounts: Record<string, number> = {};
    
    products.forEach(product => {
      // Count materials
      if (product.material) {
        product.material.forEach(m => {
          materialCounts[m] = (materialCounts[m] || 0) + 1;
        });
      }
      
      // Count countries
      if (product.country) {
        countryCounts[product.country] = (countryCounts[product.country] || 0) + 1;
      }
      
      // Count collections
      if (product.collection) {
        collectionCounts[product.collection] = (collectionCounts[product.collection] || 0) + 1;
      }
    });
    
    return { materialCounts, countryCounts, collectionCounts };
  };
  
  const { materialCounts, countryCounts, collectionCounts } = getCategoryCounts();
  
  const categorySections: CategorySection[] = [
    {
      title: "Materials",
      icon: Package,
      type: "materials",
      items: materials
        .map(material => ({
          name: material,
          count: materialCounts[material] || 0
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6)
    },
    {
      title: "Countries",
      icon: Globe,
      type: "countries",
      items: countries
        .map(country => ({
          name: country,
          count: countryCounts[country] || 0
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6)
    },
    {
      title: "Collections",
      icon: FolderOpen,
      type: "collections",
      items: collections
        .map(collection => ({
          name: collection,
          count: collectionCounts[collection] || 0
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6)
    }
  ];

  const renderCategoryCards = (categorySection: CategorySection) => {
    const { items, type } = categorySection;
    
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {items.map(item => (
          <Link key={item.name} href={`/${type}/${encodeURIComponent(item.name)}`}>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader className="py-4">
                <CardTitle className="text-lg">{item.name}</CardTitle>
                <CardDescription>{item.count} product{item.count !== 1 ? 's' : ''}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48 mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Tabs defaultValue="materials" value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center mb-6">
          <TabsList>
            <TabsTrigger value="materials">Materials</TabsTrigger>
            <TabsTrigger value="countries">Countries</TabsTrigger>
            <TabsTrigger value="collections">Collections</TabsTrigger>
          </TabsList>
          <Link href={`/${activeTab}`}>
            <Button variant="ghost" className="gap-1">
              See all <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        
        <TabsContent value="materials">
          {renderCategoryCards(categorySections[0])}
        </TabsContent>
        
        <TabsContent value="countries">
          {renderCategoryCards(categorySections[1])}
        </TabsContent>
        
        <TabsContent value="collections">
          {renderCategoryCards(categorySections[2])}
        </TabsContent>
      </Tabs>
    </div>
  );
}