'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/card'
import { FileText, Plus, Edit2, Eye, Star, Clock, AlertCircle, Copy } from 'lucide-react'
import { useToast } from '../components/ui/use-toast'
import { ResumePreviewModal } from '../components/resume-preview-modal'
import { Progress } from '../components/ui/progress'
import { Badge } from '../components/ui/badge'
import { Skeleton } from '../components/ui/skeleton'

// Define interfaces for type safety
interface UserStatus {
  isNewUser: boolean
  planType: 'free' | 'paid'
  planExpirationDate: string | null
  maxSavedResumes: number
  createdAt: string
}

interface Resume {
  _id: string
  name: string
  createdAt: string
  updatedAt: string
}

export default function Dashboard() {
  const { status } = useSession()
  const router = useRouter()
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null)
  const [resumes, setResumes] = useState<Resume[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserStatus = async () => {
      try {
        const response = await fetch('/api/user-status')
        if (response.ok) {
          const data = await response.json()
          setUserStatus(data)
        } else {
          throw new Error('Failed to fetch user status')
        }
      } catch (error) {
        console.error('Error fetching user status:', error)
        toast({
          title: 'Error',
          description: 'Failed to load user status. Please try again.',
          variant: 'destructive',
        })
      }
    }

    const fetchResumes = async () => {
      try {
        const response = await fetch('/api/resumes')
        if (response.ok) {
          const data = await response.json()
          setResumes(data)
          if (data.length === 0) {
            toast({
              title: 'No Resumes',
              description: "You haven't created any resumes yet. Start by creating a new one!",
              variant: 'default',
            })
          }
        } else {
          throw new Error('Failed to fetch resumes')
        }
      } catch (error) {
        console.error('Error fetching resumes:', error)
        toast({
          title: 'Error',
          description: 'Failed to load resumes. Please try again.',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (status === 'authenticated') {
      fetchUserStatus()
      fetchResumes()
    } else if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router, toast])

  const handleUpgrade = () => {
    router.push('/pricing')
  }

  const handlePreview = (resumeId: string) => {
    setSelectedResumeId(resumeId)
    setPreviewModalOpen(true)
  }

  const handleDeleteResume = (deletedResumeId: string) => {
    setResumes(prevResumes => prevResumes.filter(resume => resume._id !== deletedResumeId))
  }

  // Updated handleDuplicateResume function to check for free plan limits
  const handleDuplicateResume = async (resumeId: string) => {
    // Check if the user has reached the limit for free plan
    if (userStatus?.planType === 'free' && resumes.length >= userStatus.maxSavedResumes) {
      toast({
        title: 'Error',
        description: 'You have reached the maximum number of resumes for the free plan. Please upgrade to create more.',
        variant: 'destructive',
      })
      return
    }

    try {
      const response = await fetch(`/api/resumes/duplicate/${resumeId}`, {
        method: 'POST',
      })

      if (response.ok) {
        const newResume = await response.json()
        setResumes(prevResumes => [...prevResumes, newResume])
        toast({
          title: 'Success',
          description: 'Resume duplicated successfully',
        })
      } else if (response.status === 403) {
        toast({
          title: 'Error',
          description: 'Resume limit reached for your plan',
          variant: 'destructive',
        })
      } else {
        throw new Error('Failed to duplicate resume')
      }
    } catch (error) {
      console.error('Error duplicating resume:', error)
      toast({
        title: 'Error',
        description: 'Failed to duplicate resume. Please try again.',
        variant: 'destructive',
      })
    }
  }

  // Show loading skeleton while data is being fetched
  if (status === 'loading' || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-12 w-1/4 mb-6" />
        <Skeleton className="h-24 w-full mb-6" />
        <Skeleton className="h-8 w-1/3 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    )
  }

  // Redirect to sign-in page if user is not authenticated
  if (status === 'unauthenticated') {
    return null
  }

  const resumeCount = resumes.length
  const maxResumes = userStatus?.maxSavedResumes || 1
  const resumePercentage = (resumeCount / maxResumes) * 100

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 text-center">Welcome to Your Dashboard</h1>
      
      {userStatus && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Your Plan</span>
              <Badge variant={userStatus.planType === 'paid' ? 'default' : 'secondary'}>
                {userStatus.planType === 'paid' ? 'Premium' : 'Free'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <span>Saved Resumes</span>
              <span className="font-bold">{resumeCount} / {maxResumes}</span>
            </div>
            <Progress value={resumePercentage} className="mb-2" />
            {userStatus.planType === 'paid' && userStatus.planExpirationDate && (
              <p className="text-sm text-muted-foreground mt-4">
                <Clock className="inline-block mr-2 h-4 w-4" />
                Premium Access Expires: {new Date(userStatus.planExpirationDate).toLocaleDateString()}
              </p>
            )}
          </CardContent>
          {userStatus.planType === 'free' && (
            <CardFooter>
              <Button onClick={handleUpgrade} className="w-full">
                <Star className="mr-2 h-4 w-4" /> Upgrade to Premium
              </Button>
            </CardFooter>
          )}
        </Card>
      )}
      
      <h2 className="text-2xl font-bold mb-6">Your Resumes</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Show 'Create New Resume' card if user hasn't reached the limit */}
        {resumeCount < maxResumes && (
          <Card className="bg-primary/5 border-2 border-dashed border-primary/20 hover:bg-primary/10 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center justify-center text-primary">
                <Plus className="mr-2" />
                Create New Resume
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              <Button onClick={() => router.push('/resume-builder')} variant="outline" className="w-full">
                Get Started
              </Button>
            </CardContent>
          </Card>
        )}
        {/* Display existing resumes */}
        {resumes.map((resume) => (
          <Card key={resume._id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 text-primary" />
                {resume.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                <Clock className="inline-block mr-2 h-4 w-4" />
                Last updated: {new Date(resume.updatedAt).toLocaleDateString()}
              </p>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => router.push(`/edit-resume/${resume._id}`)}
              >
                <Edit2 className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button variant="secondary" onClick={() => handlePreview(resume._id)}>
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </Button>
              {/* Disable duplicate button for free users who have reached their limit */}
              <Button 
                variant="outline" 
                onClick={() => handleDuplicateResume(resume._id)}
                disabled={userStatus?.planType === 'free' && resumes.length >= (userStatus?.maxSavedResumes || 1)}
              >
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Show a message if the user has no resumes */}
      {resumeCount === 0 && (
        <Card className="mt-8 bg-muted">
          <CardContent className="flex flex-col items-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-center text-muted-foreground mb-4">You haven&apos;t created any resumes yet. Get started by creating your first resume!</p>
            <Button onClick={() => router.push('/resume-builder')}>
              Create Your First Resume
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Resume preview modal */}
      <ResumePreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        resumeId={selectedResumeId || ''}
        onDelete={handleDeleteResume}
      />
    </div>
  )
}