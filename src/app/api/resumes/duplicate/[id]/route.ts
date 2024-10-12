import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate the user
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db()
    const userId = session.user.id

    // Check user's plan and resume count
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) })
    
    // Handle case where user is not found in the database
    if (!user) {
      console.error(`User not found for ID: ${userId}`)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Type assertion to inform TypeScript that user is not null
    const verifiedUser = user as { planType?: string; maxSavedResumes?: number }

    // Check if planType and maxSavedResumes exist, otherwise return an error
    if (typeof verifiedUser.planType === 'undefined' || typeof verifiedUser.maxSavedResumes === 'undefined') {
      console.error(`Invalid user data for ID: ${userId}. planType or maxSavedResumes is undefined.`)
      return NextResponse.json({ error: 'Invalid user data' }, { status: 500 })
    }

    const resumeCount = await db.collection('resumes').countDocuments({ userId: new ObjectId(userId) })
    const maxResumes = verifiedUser.planType === 'paid' ? 10 : verifiedUser.maxSavedResumes

    // Check if the user has reached their resume limit
    if (resumeCount >= maxResumes) {
      return NextResponse.json({ error: 'Resume limit reached for your plan' }, { status: 403 })
    }

    // Fetch the original resume
    const originalResume = await db.collection('resumes').findOne({
      _id: new ObjectId(params.id),
      userId: new ObjectId(userId),
    })

    // Handle case where the original resume is not found
    if (!originalResume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
    }

    // Create a new resume with the same data
    const newResume = {
      ...originalResume,
      _id: new ObjectId(),
      name: `Copy of ${originalResume.name}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Insert the new resume into the database
    await db.collection('resumes').insertOne(newResume)

    return NextResponse.json(newResume)
  } catch (error) {
    console.error('Error duplicating resume:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}