import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { authOptions } from '../auth/[...nextauth]/route'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  }

  try {
    const client = await clientPromise
    const db = client.db()

    const user = await db.collection('users').findOne(
      { _id: new ObjectId(userId) },
      { projection: { planType: 1, planExpirationDate: 1 } }
    )

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      planType: user.planType || 'free',
      planExpirationDate: user.planExpirationDate || null,
    })
  } catch (error) {
    console.error('Error fetching user plan:', error)
    return NextResponse.json({ error: 'Error fetching user plan' }, { status: 500 })
  }
}