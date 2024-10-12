import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]/options'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const client = await clientPromise
    const db = client.db()
    const usersCollection = db.collection('users')

    const user = await usersCollection.findOne({ _id: new ObjectId(session.user.id) })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const createdAt = user._id.getTimestamp()
    const isNewUser = Date.now() - createdAt.getTime() < 60000 // Less than a minute old

    const isPremium = user.planType === 'paid' && new Date(user.planExpirationDate) > new Date()

    return NextResponse.json({
      isNewUser,
      planType: isPremium ? 'paid' : 'free',
      planExpirationDate: user.planExpirationDate || null,
      maxSavedResumes: user.maxSavedResumes || 1,
      createdAt: createdAt.toISOString(),
    })
  } catch (error) {
    console.error('Error fetching user status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}