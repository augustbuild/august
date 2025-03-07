import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User } from "lucide-react";

export function AuthButton() {
  const { user, logoutMutation } = useAuth();
  const [_, setLocation] = useLocation();

  if (!user) {
    return (
      <Button 
        variant="ghost" 
        onClick={() => setLocation("/auth")}
        className="text-foreground"
      >
        Login
      </Button>
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
        >
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
