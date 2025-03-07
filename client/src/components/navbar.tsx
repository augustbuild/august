import React from 'react';
import { Link } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';

const Navbar: React.FC = () => {
  const { user, logoutMutation } = useAuth();

  return (
    <nav className="border-b">
      <div className="max-w-4xl mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex gap-6 items-center">
          <Link href="/">
            <a className="text-xl font-instrument italic">August</a>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link href="/profile">
                <Button variant="outline" size="sm" className="h-9 w-9 p-0">
                  <User className="h-5 w-5" />
                </Button>
              </Link>
              <Button 
                variant="outline"
                size="sm"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="h-9"
              >
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link href="/auth">
                <Button variant="outline" size="sm" className="h-9">Login</Button>
              </Link>
              <Link href="/auth">
                <Button size="sm" className="h-9">Register</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;