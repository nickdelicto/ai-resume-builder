import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { authOptions } from '../auth/[...nextauth]/route'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { name, data, sectionOrder } = await request.json()
    const client = await clientPromise
    const db = client.db()

    // Get user's plan type and current resume count
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(session.user.id) },
      { projection: { planType: 1 } }
    )

    const resumeCount = await db.collection('resumes').countDocuments({ userId: new ObjectId(session.user.id) })

    // Check if user has reached their resume limit
    if ((user.planType === 'free' && resumeCount >= 1) || (user.planType === 'paid' && resumeCount >= 10)) {
      return NextResponse.json({ error: 'Resume limit reached' }, { status: 403 })
    }

    // Save the resume
    const result = await db.collection('resumes').insertOne({
      userId: new ObjectId(session.user.id),
      name,
      data,
      sectionOrder,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    return NextResponse.json({ id: result.insertedId }, { status: 201 })
  } catch (error) {
    console.error('Failed to save resume:', error)
    return NextResponse.json({ error: 'Failed to save resume' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const client = await clientPromise
    const db = client.db()

    const resumes = await db.collection('resumes')
      .find({ userId: new ObjectId(session.user.id) })
      .project({ name: 1, createdAt: 1, updatedAt: 1 })
      .sort({ updatedAt: -1 })
      .toArray()

    return NextResponse.json(resumes)
  } catch (error) {
    console.error('Failed to fetch resumes:', error)
    return NextResponse.json({ error: 'Failed to fetch resumes' }, { status: 500 })
  }
}