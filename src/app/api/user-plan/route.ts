import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { authOptions } from '../auth/[...nextauth]/options'

export async function GET(request: Request) {
  // Authentication check
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Extract userId from query parameters or session
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId') || session.user?.id

  // Validate userId
  if (!userId) {
    return NextResponse.json({ error: 'User ID not found' }, { status: 400 })
  }

  try {
    // Connect to MongoDB
    const client = await clientPromise
    const db = client.db()

    // Query user data
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(userId) },
      { projection: { planType: 1, planExpirationDate: 1 } }
    )

    // Handle case where user is not found
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Return user plan information
    return NextResponse.json({
      planType: user.planType || 'free',
      planExpirationDate: user.planExpirationDate || null,
    })
  } catch (error) {
    // Error handling
    console.error('Error fetching user plan:', error)
    return NextResponse.json({ error: 'Error fetching user plan' }, { status: 500 })
  }
}