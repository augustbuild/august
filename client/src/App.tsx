import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import HomePage from "@/pages/home-page";
import ProductPage from "@/pages/product-page";
import FilteredProductsPage from "@/pages/filtered-products-page";
import CategoryIndexPage from "@/pages/category-index-page";
import NotFound from "@/pages/not-found";
import { ProtectedRoute } from "./lib/protected-route";
import Navbar from "./components/navbar";
import ProfilePage from "@/pages/profile-page";

function Router() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/products/:slug" component={ProductPage} />
        {/* Add index routes for categories */}
        <Route path="/materials" component={CategoryIndexPage} />
        <Route path="/countries" component={CategoryIndexPage} />
        <Route path="/collections" component={CategoryIndexPage} />
        {/* Filtered product routes */}
        <Route path="/materials/:material" component={FilteredProductsPage} />
        <Route path="/countries/:country" component={FilteredProductsPage} />
        <Route path="/collections/:collection" component={FilteredProductsPage} />
        <ProtectedRoute path="/profile" component={ProfilePage} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;