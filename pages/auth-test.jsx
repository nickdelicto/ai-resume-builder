'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function AuthTestPage() {
  const { data: session, status } = useSession()
  const [apiResult, setApiResult] = useState(null)
  const [loading, setLoading] = useState(false)
  
  // Function to test the API endpoint
  const testApi = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/auth-test')
      const data = await response.json()
      setApiResult(data)
    } catch (error) {
      setApiResult({ error: error.message })
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '50px auto', 
      padding: '20px', 
      fontFamily: 'system-ui, sans-serif',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      borderRadius: '8px'
    }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>NextAuth Integration Test</h1>
      
      <div style={{ marginBottom: '30px', padding: '20px', background: '#f5f5f5', borderRadius: '6px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>Client-Side Authentication Status:</h2>
        <p><strong>Status:</strong> {status}</p>
        
        {status === 'authenticated' ? (
          <div>
            <p><strong>User:</strong> {session.user.name} ({session.user.email})</p>
            <p><strong>User ID:</strong> {session.user.id}</p>
            <pre style={{ 
              background: '#e9e9e9', 
              padding: '10px', 
              borderRadius: '4px', 
              overflowX: 'auto',
              marginTop: '10px'
            }}>
              {JSON.stringify(session, null, 2)}
            </pre>
          </div>
        ) : (
          <p>Not signed in</p>
        )}
      </div>
      
      <div style={{ marginBottom: '30px', padding: '20px', background: '#f0f9ff', borderRadius: '6px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>Server-Side Authentication Test:</h2>
        <button 
          onClick={testApi} 
          disabled={loading}
          style={{ 
            padding: '8px 16px', 
            background: '#2196F3', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer',
            marginBottom: '15px'
          }}
        >
          {loading ? 'Testing...' : 'Test Auth API'}
        </button>
        
        {apiResult && (
          <div style={{ marginTop: '15px' }}>
            <p><strong>API Response:</strong></p>
            <pre style={{ 
              background: '#e9e9e9', 
              padding: '10px', 
              borderRadius: '4px', 
              overflowX: 'auto'
            }}>
              {JSON.stringify(apiResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
        {status === 'authenticated' ? (
          <button 
            onClick={() => signOut()} 
            style={{ 
              padding: '8px 16px', 
              background: '#f44336', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Sign Out
          </button>
        ) : (
          <button 
            onClick={() => signIn('google')} 
            style={{ 
              padding: '8px 16px', 
              background: '#4285F4', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Sign In with Google
          </button>
        )}
      </div>
      
      <div>
        <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>Navigation:</h2>
        <ul style={{ paddingLeft: '20px' }}>
          <li style={{ marginBottom: '8px' }}>
            <Link href="/resume" style={{ color: '#1a73e8', textDecoration: 'none' }}>
              Go to New Resume Page (/resume)
            </Link>
          </li>
          <li style={{ marginBottom: '8px' }}>
            <Link href="/" style={{ color: '#1a73e8', textDecoration: 'none' }}>
              Go to Old Homepage (/)
            </Link>
          </li>
        </ul>
      </div>
    </div>
  )
} 