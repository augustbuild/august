import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import AuthModal from "./auth-modal";

export function AuthButton() {
  const { user, logoutMutation } = useAuth();
  const [_, setLocation] = useLocation();
  const [showAuthModal, setShowAuthModal] = useState(false);

  if (!user) {
    return (
      <>
        <Button 
          variant="ghost" 
          onClick={() => setShowAuthModal(true)}
          className="text-foreground"
        >
          Login
        </Button>
        <AuthModal
          open={showAuthModal}
          onOpenChange={setShowAuthModal}
        />
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="text-foreground">
          <User className="h-5 w-5" />
          <span className="ml-2">{user.username}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setLocation("/profile")}>
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => logoutMutation.mutate()}
          className="text-destructive"
          disabled={logoutMutation.isPending}
        >
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}