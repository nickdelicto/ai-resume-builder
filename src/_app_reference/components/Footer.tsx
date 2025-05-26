import Link from 'next/link'

export function Footer() {
  return (
    <footer className="bg-gray-100 py-8">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center px-4">
        <div className="text-sm text-gray-600 mb-4 md:mb-0">
          © {new Date().getFullYear()} IntelliResume. All rights reserved.
        </div>
        <div className="flex space-x-4">
          <Link href="/privacy" className="text-sm text-gray-600 hover:text-purple-600">
            Privacy Policy
          </Link>
          <Link href="/terms" className="text-sm text-gray-600 hover:text-purple-600">
            Terms of Service
          </Link>
          <Link href="/contact" className="text-sm text-gray-600 hover:text-purple-600">
            Contact Us
          </Link>
        </div>
      </div>
    </footer>
  )
}