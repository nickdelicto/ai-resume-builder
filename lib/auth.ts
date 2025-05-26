import { getServerSession } from "next-auth/next"
import { authOptions } from "../pages/api/auth/[...nextauth]"
import { prisma } from "./prisma"

// Helper to get server session in server components and API routes
export async function getAuthSession() {
  return await getServerSession(authOptions)
}

// Helper to get the current user in server components and API routes
export async function getCurrentUser() {
  const session = await getAuthSession()
  
  if (!session?.user?.email) {
    return null
  }
  
  const user = await prisma.user.findUnique({
    where: {
      email: session.user.email
    }
  })
  
  return user
}

// Helper to check if a user has a premium plan
export async function hasPremiumPlan(userId: string) {
  if (!userId) return false
  
  const user = await prisma.user.findUnique({
    where: {
      id: userId
    },
    select: {
      planType: true,
      planExpirationDate: true
    }
  })
  
  if (!user) return false
  
  // Check if premium and not expired
  if (user.planType === 'premium' && user.planExpirationDate) {
    const now = new Date()
    return now < user.planExpirationDate
  }
  
  return false
} 