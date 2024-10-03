import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

export async function POST(req: Request) {
  const { sessionId } = await req.json()

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status === 'paid') {
      const client = await clientPromise
      const db = client.db()
      const usersCollection = db.collection('users')

      const userId = session.client_reference_id
      if (!userId) {
        throw new Error('No user ID found in session')
      }

      const expirationDate = new Date()
      expirationDate.setDate(expirationDate.getDate() + 7)

      await usersCollection.updateOne(
        { _id: new ObjectId(userId) },
        {
          $set: {
            planType: 'paid',
            planExpirationDate: expirationDate,
            maxSavedResumes: 10,
          },
        }
      )

      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ success: false, error: 'Payment not completed' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error verifying payment:', error)
    return NextResponse.json({ success: false, error: 'Error verifying payment' }, { status: 500 })
  }
}