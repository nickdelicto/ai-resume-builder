'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { useToast } from './ui/use-toast'
import ATSResume from './ats-resume'

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
    education: Array<{
      degree: string
      fieldOfStudy: string
      institution: string
      graduationDate: string
    }>
    skills: Array<{ id: string; name: string }>
    projects: Array<{ id: string; name: string; description: string }>
    certificates: Array<{ name: string; issuer: string; issueDate: string }>
    customSections: Array<{ id: string; title: string; items: string[] }>
  }
  sectionOrder: string[]
}

interface ResumePreviewModalProps {
  isOpen: boolean
  onClose: () => void
  resumeId: string
}

export function ResumePreviewModal({ isOpen, onClose, resumeId }: ResumePreviewModalProps) {
  const [resumeData, setResumeData] = useState<ResumeData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Resume Preview</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">Loading...</div>
        ) : resumeData ? (
          <ATSResume resumeData={resumeData.data} sectionOrder={resumeData.sectionOrder} />
        ) : (
          <div className="text-center text-red-500">Failed to load resume data</div>
        )}
        <div className="mt-4 flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}