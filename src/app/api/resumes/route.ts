import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import clientPromise from '@/lib/mongodb'

export async function POST(request: Request) {
  const session = await getServerSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const client = await clientPromise
  const db = client.db()

  const { name, data } = await request.json()

  const result = await db.collection('resumes').insertOne({
    userId: session.userId,
    name,
    data,
    createdAt: new Date(),
  })

  return NextResponse.json({ id: result.insertedId }, { status: 201 })
}