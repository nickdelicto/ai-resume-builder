'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { Button } from './ui/button'
import { Sheet, SheetContent } from './ui/sheet'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'

export function Navbar() {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)

  const toggleMenu = () => setIsOpen(!isOpen)

  const NavItems = () => (
    <>
      <Link href="/pricing" className="text-gray-600 hover:text-purple-600">
        Pricing
      </Link>
      {session ? (
        <>
          <Link href="/dashboard" className="text-gray-600 hover:text-purple-600">
            Dashboard
          </Link>
          <Button onClick={() => signOut({ callbackUrl: '/' })} variant="outline">
            Log Out
          </Button>
        </>
      ) : (
        <>
          <Link href="/auth/signin" className="text-gray-600 hover:text-purple-600">
            Login
          </Link>
          <Button asChild>
            <Link href="/auth/signin">Sign Up</Link>
          </Button>
        </>
      )}
    </>
  )

  return (
    <nav className="flex justify-between items-center py-4 px-8 bg-white shadow-sm">
      <div className="flex items-center space-x-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6 text-purple-600"
        >
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
        <Link href="/" className="text-xl font-bold text-purple-600">
          IntelliResume
        </Link>
      </div>
      <div className="hidden md:flex items-center space-x-6">
        <NavItems />
      </div>
      <div className="md:hidden">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <Button variant="ghost" size="icon" onClick={toggleMenu}>
            {isOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
            <span className="sr-only">Toggle menu</span>
          </Button>
          <SheetContent 
            side="right" 
            className="w-[240px] sm:w-[300px] bg-white"
            onInteractOutside={toggleMenu}
          >
            <div className="flex flex-col space-y-4 mt-4">
              <NavItems />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  )
}