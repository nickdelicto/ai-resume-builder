'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from "@/app/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/app/components/ui/card"
import { AlertCircle, Home, RefreshCw } from 'lucide-react'

export default function AuthError() {
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setError(searchParams.get('error'))
  }, [searchParams])

  const getErrorMessage = () => {
    switch (error) {
      case 'Configuration':
        return "Oops! Looks like our tech gremlins are acting up again. We're on it!"
      case 'AccessDenied':
        return "Hold up! It seems you're trying to sneak into VIP without being on the list."
      case 'Verification':
        return "Houston, we have a problem... with verifying your identity. Let's try that again!"
      default:
        return "Well, this is awkward. Something went wrong, but we're not quite sure what."
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Authentication Error</CardTitle>
          <CardDescription className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-yellow-500 mt-4" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-600 mb-4">{getErrorMessage()}</p>
          <p className="text-center text-sm text-gray-500">Don't worry, even our CEO gets locked out sometimes!</p>
        </CardContent>
        <CardFooter className="flex justify-center space-x-4">
          <Button asChild>
            <Link href="/auth/signin">
              <RefreshCw className="mr-2 h-4 w-4" /> Try Again
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" /> Home
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}