import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const client = await clientPromise
  const db = client.db()

  try {
    const resume = await db.collection('resumes').findOne({
      _id: new ObjectId(params.id),
      userId: new ObjectId(session.user.id),
    })

    if (!resume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
    }

    // Ensure sectionOrder is included in the response
    const { _id, name, data, sectionOrder } = resume
    return NextResponse.json({ _id, name, data, sectionOrder })
  } catch (error) {
    console.error('Error fetching resume:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const client = await clientPromise
  const db = client.db()

  try {
    const body = await request.json()
    const { name, data, sectionOrder } = body

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

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Resume updated successfully' })
  } catch (error) {
    console.error('Error updating resume:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const client = await clientPromise
  const db = client.db()

  try {
    const result = await db.collection('resumes').deleteOne({
      _id: new ObjectId(params.id),
      userId: new ObjectId(session.user.id),
    })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Resume not found or not authorized to delete' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Resume deleted successfully' })
  } catch (error) {
    console.error('Error deleting resume:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}