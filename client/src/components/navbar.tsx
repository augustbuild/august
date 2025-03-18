import React from 'react';
import { Link } from 'wouter';
import { AuthButton } from './auth-button';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Package, Globe, FolderOpen } from "lucide-react";

const Navbar: React.FC = () => {
  return (
    <nav className="border-b">
      <div className="max-w-4xl mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex gap-6 items-center">
          <Link href="/">
            <span className="text-3xl font-bold font-instrument italic cursor-pointer">
              August
            </span>
          </Link>
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Products</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-[200px] p-2 space-y-1">
                    <Link href="/materials">
                      <div className="flex items-center gap-2 rounded-md p-2 hover:bg-accent cursor-pointer">
                        <Package className="h-4 w-4" />
                        <span>By Material</span>
                      </div>
                    </Link>
                    <Link href="/collections">
                      <div className="flex items-center gap-2 rounded-md p-2 hover:bg-accent cursor-pointer">
                        <FolderOpen className="h-4 w-4" />
                        <span>By Collection</span>
                      </div>
                    </Link>
                    <Link href="/countries">
                      <div className="flex items-center gap-2 rounded-md p-2 hover:bg-accent cursor-pointer">
                        <Globe className="h-4 w-4" />
                        <span>By Country</span>
                      </div>
                    </Link>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>
        <div className="flex items-center gap-4">
          <AuthButton />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;