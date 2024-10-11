/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

export async function POST(req: Request) {
  console.log('Received request to create checkout session');
  
  const body = await req.json();
  console.log('Request body:', body);

  const { userId } = body;

  if (!userId) {
    console.log('User ID is missing');
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
  }

  try {
    console.log('Creating Stripe checkout session...');
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: '7-Day Premium Access',
            },
            unit_amount: 999, // $9.99 in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment-cancelled`,
      client_reference_id: userId,
    })

    console.log('Checkout session created:', session.id);
    return NextResponse.json({ sessionId: session.id })
  } catch (err: any) {
    console.error('Error creating checkout session:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}