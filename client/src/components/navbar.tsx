import React from 'react';
import { Link } from 'wouter';
import { AuthButton } from './auth-button';

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
        </div>
        <div className="flex items-center gap-4">
          <AuthButton />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;