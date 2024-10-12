import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { authOptions } from '../auth/[...nextauth]/options'

export async function POST(request: Request) {
  // Authenticate the user
  const session = await getServerSession(authOptions)

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id, name, data, sectionOrder } = await request.json()
    const client = await clientPromise
    const db = client.db()

    // If id is provided, update existing resume
    if (id) {
      const result = await db.collection('resumes').updateOne(
        {
          _id: new ObjectId(id),
          userId: new ObjectId(session.user.id),
        },
        {
          $set: {
            name,
            data,
            sectionOrder,
            updatedAt: new Date(),
          },
        }
      )

      if (result.matchedCount === 0) {
        return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
      }

      return NextResponse.json({ id, message: 'Resume updated successfully' }, { status: 200 })
    }

    // If no id is provided, create a new resume
    // Get user's plan type and current resume count
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(session.user.id) },
      { projection: { planType: 1, maxSavedResumes: 1 } }
    )

    // Handle case where user is not found in the database
    if (!user) {
      console.error(`User not found for ID: ${session.user.id}`)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Type assertion to inform TypeScript that user is not null
    //const verifiedUser = user as { planType?: string; maxSavedResumes?: number }

    // Check if planType and maxSavedResumes exist, otherwise return an error
    //if (typeof verifiedUser.planType === 'undefined' || typeof verifiedUser.maxSavedResumes === 'undefined') {
    //  console.error(`Invalid user data for ID: ${session.user.id}. planType or maxSavedResumes is undefined.`)
    //  return NextResponse.json({ error: 'Invalid user data' }, { status: 500 })
    //}

    const resumeCount = await db.collection('resumes').countDocuments({ userId: new ObjectId(session.user.id) })

    // Check if user has reached their resume limit
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if ((user.planType === 'free' && resumeCount >= 1) || (user.planType === 'paid' && resumeCount >= 10)) {
      return NextResponse.json({ error: 'Resume limit reached' }, { status: 403 })
    }

    // Save the new resume
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
    console.error('Failed to save/update resume:', error)
    return NextResponse.json({ error: 'Failed to save/update resume' }, { status: 500 })
  }
}

export async function GET() {
  // Authenticate the user
  const session = await getServerSession(authOptions)

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const client = await clientPromise
    const db = client.db()

    // Fetch all resumes for the authenticated user
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