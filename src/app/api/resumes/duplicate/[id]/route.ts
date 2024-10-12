import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db()
    const userId = session.user.id

    // Check user's plan and resume count
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) })
    const resumeCount = await db.collection('resumes').countDocuments({ userId: new ObjectId(userId) })
    const maxResumes = user.planType === 'paid' ? 10 : user.maxSavedResumes

    if (resumeCount >= maxResumes) {
      return NextResponse.json({ error: 'Resume limit reached for your plan' }, { status: 403 })
    }

    // Fetch the original resume
    const originalResume = await db.collection('resumes').findOne({
      _id: new ObjectId(params.id),
      userId: new ObjectId(userId),
    })

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

    await db.collection('resumes').insertOne(newResume)

    return NextResponse.json(newResume)
  } catch (error) {
    console.error('Error duplicating resume:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}