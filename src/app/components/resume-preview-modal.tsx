'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog'
import { Button } from './ui/button'
import { useToast } from './ui/use-toast'
import ATSResume from './ats-resume'
import { Trash2 } from 'lucide-react'

// Define the structure for resume data
interface ResumeData {
  _id: string
  name: string
  data: {
    personalInfo: {
      name: string
      email: string
      phone: string
      city: string
      state: string
      zipcode: string
      country: string
    }
    professionalSummary: string
    experience: Array<{
      position: string
      company: string
      startDate: string
      endDate: string | null
      description: string
    }>
    // Updated education array to include the id field
    education: Array<{
      id: string
      degree: string
      fieldOfStudy: string
      institution: string
      graduationDate: string
    }>
    skills: Array<{ id: string; name: string }>
    projects: Array<{ id: string; name: string; description: string }>
    certificates: Array<{ id: string; name: string; issuer: string; issueDate: string }>
    customSections: Array<{ id: string; title: string; items: string[] }>
  }
  sectionOrder: string[]
}

// Define props for the ResumePreviewModal component
interface ResumePreviewModalProps {
  isOpen: boolean
  onClose: () => void
  resumeId: string
  onDelete: (resumeId: string) => void
  userPlanType: 'free' | 'paid'
}

// Main ResumePreviewModal component
export function ResumePreviewModal({ isOpen, onClose, resumeId, onDelete, userPlanType }: ResumePreviewModalProps) {
  const [resumeData, setResumeData] = useState<ResumeData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()

  // Effect to fetch resume data when the modal is opened
  useEffect(() => {
    const fetchResumeData = async () => {
      if (!resumeId) return

      setIsLoading(true)
      try {
        const response = await fetch(`/api/resumes/${resumeId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch resume data')
        }
        const data: ResumeData = await response.json()
        setResumeData(data)
      } catch (error) {
        console.error('Error fetching resume data:', error)
        toast({
          title: 'Error',
          description: 'Failed to load resume data. Please try again.',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (isOpen) {
      fetchResumeData()
    }
  }, [isOpen, resumeId, toast])

  // Function to handle resume deletion
  const handleDelete = async () => {
    if (!resumeId) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/resumes/${resumeId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete resume')
      }
      toast({
        title: 'Success',
        description: 'Resume deleted successfully.',
      })
      onDelete(resumeId)
      onClose()
    } catch (error) {
      console.error('Error deleting resume:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete resume. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Render the ResumePreviewModal component
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Resume Preview</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">Loading...</div>
        ) : resumeData ? (
          <ATSResume 
            resumeData={resumeData.data} 
            sectionOrder={resumeData.sectionOrder} 
            userPlanType={userPlanType}
          />
        ) : (
          <div className="text-center text-red-500">Failed to load resume data</div>
        )}
        <DialogFooter className="mt-4 flex justify-between">
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            <Trash2 className="mr-2 h-4 w-4" />
            {isDeleting ? 'Deleting...' : 'Delete Resume'}
          </Button>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}