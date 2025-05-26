import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'

// GET: Fetch a specific resume by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Authenticate the user
  const session = await getServerSession(authOptions)

  // Check if the user is authenticated
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const client = await clientPromise
  const db = client.db()

  try {
    // Find the resume in the database
    const resume = await db.collection('resumes').findOne({
      _id: new ObjectId(params.id),
      userId: new ObjectId(session.user.id),
    })

    // If no resume is found, return a 404 error
    if (!resume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
    }

    // Extract the necessary fields from the resume
    const { _id, name, data, sectionOrder } = resume
    // Return the resume data
    return NextResponse.json({ _id, name, data, sectionOrder })
  } catch (error) {
    console.error('Error fetching resume:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// PUT: Update a specific resume by ID
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Authenticate the user
  const session = await getServerSession(authOptions)

  // Check if the user is authenticated
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const client = await clientPromise
  const db = client.db()

  try {
    // Parse the request body
    const body = await request.json()
    const { name, data, sectionOrder } = body

    // Update the resume in the database
    const result = await db.collection('resumes').updateOne(
      {
        _id: new ObjectId(params.id),
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

    // If no resume was updated, return a 404 error
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
    }

    // Return a success message
    return NextResponse.json({ message: 'Resume updated successfully' })
  } catch (error) {
    console.error('Error updating resume:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// DELETE: Remove a specific resume by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Authenticate the user
  const session = await getServerSession(authOptions)

  // Check if the user is authenticated
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const client = await clientPromise
  const db = client.db()

  try {
    // Delete the resume from the database
    const result = await db.collection('resumes').deleteOne({
      _id: new ObjectId(params.id),
      userId: new ObjectId(session.user.id),
    })

    // If no resume was deleted, return a 404 error
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Resume not found or not authorized to delete' }, { status: 404 })
    }

    // Return a success message
    return NextResponse.json({ message: 'Resume deleted successfully' })
  } catch (error) {
    console.error('Error deleting resume:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}