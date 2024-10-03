import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { authOptions } from '../auth/[...nextauth]/route'

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
  ) {
    const session = await getServerSession(authOptions)
  
    if (!session) {
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