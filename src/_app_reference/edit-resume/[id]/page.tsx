'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ResumeBuilder, ResumeData } from '@/app/components/resume-builder'
import { useToast } from '@/app/components/ui/use-toast'
import { Button } from '@/app/components/ui/button'

interface Resume {
  _id: string
  name: string
  data: ResumeData
  sectionOrder: string[]
}

export default function EditResumePage({ params }: { params: { id: string } }) {
  const [resumeData, setResumeData] = useState<Resume | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const router = useRouter()
  const { data: session } = useSession()
  const { toast } = useToast()

  useEffect(() => {
    const fetchResume = async () => {
      if (!session) {
        router.push('/auth/signin')
        return
      }

      try {
        // console.log('Fetching resume with ID:', params.id)
        const response = await fetch(`/api/resumes/${params.id}`)
        if (response.ok) {
          const data: Resume = await response.json()
          // console.log('Fetched resume data:', data)
          setResumeData(data)
        } else if (response.status === 404) {
          // console.log('Resume not found')
          toast({
            title: 'Error',
            description: 'Resume not found. It may have been deleted.',
            variant: 'destructive',
          })
          router.push('/dashboard')
          return
        } else {
          throw new Error('Failed to fetch resume')
        }
      } catch (error) {
        console.error('Error fetching resume:', error)
        toast({
          title: 'Error',
          description: 'Failed to load the resume. Please try again.',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchResume()
  }, [params.id, session, router, toast])

  const handleSave = async (updatedData: ResumeData & { name: string; sectionOrder: string[] }) => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/resumes/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: updatedData.name,
          data: updatedData,
          sectionOrder: updatedData.sectionOrder,
        }),
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Resume updated successfully!',
        })
        router.push('/dashboard')
      } else if (response.status === 404) {
        toast({
          title: 'Error',
          description: 'Resume not found. It may have been deleted.',
          variant: 'destructive',
        })
        router.push('/dashboard')
      } else {
        throw new Error('Failed to update resume')
      }
    } catch (error) {
      console.error('Error updating resume:', error)
      toast({
        title: 'Error',
        description: 'Failed to update the resume. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>
  }

  if (!resumeData) {
    return <div className="flex justify-center items-center h-screen">Resume not found</div>
  }

  // console.log('Passing initialData to ResumeBuilder:', {
  //   ...resumeData.data,
  //   _id: resumeData._id,
  //   name: resumeData.name,
  //   sectionOrder: resumeData.sectionOrder,
  // })

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Edit Resume</h1>
      <Button onClick={() => router.push('/dashboard')} className="mb-4">
        Back to Dashboard
      </Button>
      <ResumeBuilder 
        initialData={{
          ...resumeData.data,
          _id: resumeData._id,
          name: resumeData.name,
          sectionOrder: resumeData.sectionOrder,
        }} 
        onSave={handleSave}
        isSaving={isSaving}
      />
    </div>
  )
}