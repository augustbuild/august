import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import HomePage from "@/pages/home-page";
import ProductPage from "@/pages/product-page";
import ProductsPage from "@/pages/products-page";
import FilteredProductsPage from "@/pages/filtered-products-page";
import CategoryIndexPage from "@/pages/category-index-page";
import ReviewsPage from "@/pages/reviews-page-fixed";
import NotFound from "@/pages/not-found";
import { ProtectedRoute } from "./lib/protected-route";
import Navbar from "./components/navbar";
import Footer from "./components/footer";
import ProfilePage from "@/pages/profile-page";

function Router() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-grow">
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/products" component={ProductsPage} />
          <Route path="/products/:slug" component={ProductPage} />
          {/* Add index routes for categories */}
          <Route path="/materials" component={CategoryIndexPage} />
          <Route path="/countries" component={CategoryIndexPage} />
          <Route path="/collections" component={CategoryIndexPage} />
          {/* Filtered product routes */}
          <Route path="/materials/:material" component={FilteredProductsPage} />
          <Route path="/countries/:country" component={FilteredProductsPage} />
          <Route path="/collections/:collection" component={FilteredProductsPage} />
          <Route path="/reviews" component={ReviewsPage} />
          <ProtectedRoute path="/profile" component={ProfilePage} />
          <Route component={NotFound} />
        </Switch>
      </div>
      <Footer />
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