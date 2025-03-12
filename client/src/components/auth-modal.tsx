import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { SiGithub } from "react-icons/si";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AuthModal({ open, onOpenChange }: AuthModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-instrument italic">Welcome to August</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Join our community to discover and share extraordinary products
          </p>
        </div>

        <div className="flex flex-col space-y-4">
          <a href="/api/auth/github" className="w-full">
            <Button className="w-full flex items-center justify-center gap-2">
              <SiGithub className="w-5 h-5" />
              Continue with GitHub
            </Button>
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}