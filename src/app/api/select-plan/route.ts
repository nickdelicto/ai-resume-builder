import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function POST(request: Request) {
  const { planType, userId } = await request.json()

  if (!planType || !userId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    const client = await clientPromise
    const db = client.db()

    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          planType: planType,
          planExpirationDate: planType === 'paid' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null,
        },
      }
    )

    if (result.modifiedCount === 1) {
      return NextResponse.json({ message: 'Plan updated successfully' })
    } else {
      return NextResponse.json({ error: 'User not found or plan not updated' }, { status: 404 })
    }
  } catch (error) {
    console.error('Error updating plan:', error)
    return NextResponse.json({ error: 'Error updating plan' }, { status: 500 })
  }
}