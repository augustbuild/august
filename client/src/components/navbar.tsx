import React from 'react';
import { Link } from 'wouter';
import { AuthButton } from './auth-button';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuLink,
} from "@/components/ui/navigation-menu";
import { Package, Globe, FolderOpen, Youtube } from "lucide-react";

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
                    <Link href="/products">
                      <div className="flex items-center gap-2 rounded-md p-2 hover:bg-accent cursor-pointer font-medium">
                        <span>All Products</span>
                      </div>
                    </Link>
                    <div className="my-1 border-t"></div>
                    <Link href="/materials">
                      <div className="flex items-center gap-2 rounded-md p-2 hover:bg-accent cursor-pointer">
                        <Package className="h-4 w-4" />
                        <span>Materials</span>
                      </div>
                    </Link>
                    <Link href="/collections">
                      <div className="flex items-center gap-2 rounded-md p-2 hover:bg-accent cursor-pointer">
                        <FolderOpen className="h-4 w-4" />
                        <span>Collections</span>
                      </div>
                    </Link>
                    <Link href="/countries">
                      <div className="flex items-center gap-2 rounded-md p-2 hover:bg-accent cursor-pointer">
                        <Globe className="h-4 w-4" />
                        <span>Countries</span>
                      </div>
                    </Link>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link href="/reviews">
                  <div className="h-10 px-4 py-2 flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium cursor-pointer hover:bg-accent transition-colors">
                    Reviews
                  </div>
                </Link>
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