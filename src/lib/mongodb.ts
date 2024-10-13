/* eslint-disable no-var */

import { MongoClient, MongoClientOptions } from 'mongodb'
import tls from 'tls'

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"')
}

const uri = process.env.MONGODB_URI
console.log('MongoDB URI:', uri.replace(/:[^:]*@/, ':****@'))

// Set SSL/TLS options for MongoDB connection
const options: MongoClientOptions = {
  tls: true,
  tlsCAFile: '/etc/ssl/certs/ca-certificates.crt',
  ssl: true, // Include this for backwards compatibility
  serverSelectionTimeoutMS: 5000, // Wait 5 seconds before timing out
}

console.log('MongoDB connection options:', JSON.stringify(options, null, 2))

let clientPromise: Promise<MongoClient>

// Extend the NodeJS global type to include our custom property
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

// Connection function with detailed logging
const connectToDatabase = async (): Promise<MongoClient> => {
  try {
    console.log('Attempting to connect to MongoDB...')
    const client = new MongoClient(uri, options)
    
    // Force TLS 1.2 or higher
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1'
    tls.DEFAULT_MIN_VERSION = 'TLSv1.2'
    
    await client.connect()
    console.log('Successfully connected to MongoDB')
    return client
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error)
    throw error
  }
}

// In development mode, use a global variable to maintain the connection across hot-reloads
if (process.env.NODE_ENV === 'development') {
  if (!globalThis._mongoClientPromise) {
    globalThis._mongoClientPromise = connectToDatabase()
  }
  clientPromise = globalThis._mongoClientPromise
} else {
  // In production mode, create a new client and connection promise for each instance
  clientPromise = connectToDatabase()
}

// Export the clientPromise which is used in other parts of the application
export default clientPromise

// Export a function to get the database instance
export const getDb = async () => {
  const client = await clientPromise
  return client.db()
}

export function Component() {
  // This is a dummy component to satisfy the React Component code block requirements
  return null
}