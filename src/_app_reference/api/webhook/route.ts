/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { headers } from 'next/headers'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: Request) {
  const body = await req.text()
  const sig = headers().get('stripe-signature') as string

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ message: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    try {
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

      console.log(`Updated plan for user ${userId}`)
    } catch (error) {
      console.error('Error updating user plan:', error)
      return NextResponse.json({ message: 'Error updating user plan' }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}