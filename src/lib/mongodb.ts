/* eslint-disable no-var */

import { MongoClient, MongoClientOptions } from 'mongodb'
import fs from 'fs'

// Check for the presence of the MongoDB URI in environment variables
if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"')
}

const uri = process.env.MONGODB_URI
let options: MongoClientOptions = {}

// Define paths for SSL/TLS certificates
const systemCaBundlePath = '/etc/ssl/certs/ca-certificates.crt'
const letsEncryptRootPath = '/etc/ssl/certs/isrgrootx1.pem' // Update this path if needed

// Set SSL/TLS options only for production environment
if (process.env.NODE_ENV === 'production') {
  if (fs.existsSync(systemCaBundlePath)) {
    // Use system CA bundle if available
    options = {
      ssl: true,
      tls: true,
      tlsCAFile: systemCaBundlePath,
    }
    console.log('Using system CA bundle for MongoDB connection')
  } else if (fs.existsSync(letsEncryptRootPath)) {
    // Fall back to Let's Encrypt root certificate if system CA bundle is not available
    options = {
      ssl: true,
      tls: true,
      tlsCAFile: letsEncryptRootPath,
    }
    console.log('Using Let\'s Encrypt root certificate for MongoDB connection')
  } else {
    console.warn('Neither system CA bundle nor Let\'s Encrypt root found. SSL/TLS options will not be applied.')
  }
}

let client: MongoClient
let clientPromise: Promise<MongoClient>

// Extend the NodeJS global type to include our custom property
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

// In development mode, use a global variable to maintain the connection across hot-reloads
if (process.env.NODE_ENV === 'development') {
  if (!globalThis._mongoClientPromise) {
    client = new MongoClient(uri, options)
    globalThis._mongoClientPromise = client.connect()
  }
  clientPromise = globalThis._mongoClientPromise
} else {
  // In production mode, create a new client and connection promise for each instance
  client = new MongoClient(uri, options)
  clientPromise = client.connect()
}

// Log connection status
clientPromise.then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err))

// Export the clientPromise which is used in other parts of the application
export default clientPromise