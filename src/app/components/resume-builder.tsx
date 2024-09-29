'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import PersonalInformationSection from './personal-information-section'
import ProfessionalSummarySection from './professional-summary-section'
import ExperienceSection from './experience-section'
import EducationSection from './education-section'
import ProjectsSection from './projects-section'
import CertificatesSection from './certificates-section'
import CustomSection from './custom-section'
import SkillsSection from './skills-section'
import ATSResume from './ats-resume'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog'

export interface ResumeData {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    city: string;
    state: string;
    zipcode: string;
    country: string;
  };
  professionalSummary: string;
  experience: any[]; // Replace 'any' with a more specific type if available
  education: any[]; // Replace 'any' with a more specific type if available
  projects: { id: string; name: string; description: string }[];
  certificates: any[]; // Replace 'any' with a more specific type if available
  customSections: any[]; // Replace 'any' with a more specific type if available
  skills: { id: string; name: string }[];
}

const SortableItem = ({ id, children }: { id: string; children: React.ReactNode }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="mb-4 border rounded bg-white shadow-sm">
      <div className="flex items-center p-2 bg-gray-100 border-b">
        <div {...listeners} className="mr-2 cursor-move">
          <GripVertical size={20} />
        </div>
        <h2 className="text-lg font-semibold">{id.charAt(0).toUpperCase() + id.slice(1)}</h2>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  )
}

const ResumeBuilder = () => {
  const [resumeData, setResumeData] = useState<ResumeData>({
    personalInfo: {
      name: '',
      email: '',
      phone: '',
      city: '',
      state: '',
      zipcode: '',
      country: '',
    },
    professionalSummary: '',
    experience: [],
    education: [],
    projects: [],
    certificates: [],
    customSections: [],
    skills: [],
  })

  const [sectionOrder, setSectionOrder] = useState([
    'experience',
    'education',
    'skills',
    'projects',
    'certificates',
  ])

  const [showPreview, setShowPreview] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [resumeName, setResumeName] = useState('')
  const { data: session } = useSession()
  const router = useRouter()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: any) => {
    const { active, over } = event

    if (active.id !== over.id) {
      setSectionOrder((items) => {
        const oldIndex = items.indexOf(active.id)
        const newIndex = items.indexOf(over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const updateResumeData = (section: keyof ResumeData, data: any) => {
    setResumeData((prev) => ({ ...prev, [section]: data }))
  }

  const updatePersonalInfo = (field: keyof ResumeData['personalInfo'], value: string) => {
    setResumeData((prev) => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        [field]: value,
      },
    }))
  }

  const addCustomSection = () => {
    const newSection = {
      id: `custom-${Date.now()}`,
      title: 'New Section',
      items: [],
    }
    setResumeData((prev) => ({
      ...prev,
      customSections: [...prev.customSections, newSection],
    }))
    setSectionOrder((prev) => [...prev, newSection.id])
  }

  const removeCustomSection = (sectionId: string) => {
    setResumeData((prev) => ({
      ...prev,
      customSections: prev.customSections.filter((s) => s.id !== sectionId),
    }))
    setSectionOrder((prev) => prev.filter((id) => id !== sectionId))
  }

  const handleSaveResume = async () => {
    if (!session) {
      router.push('/auth/signin')
      return
    }

    try {
      const response = await fetch('/api/resumes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: resumeName,
          data: resumeData,
          sectionOrder: sectionOrder,
        }),
      })

      if (response.ok) {
        setShowSaveDialog(false)
        // Show success message or update UI
        alert('Resume saved successfully!')
      } else {
        // Handle error
        alert('Failed to save resume. Please try again.')
      }
    } catch (error) {
      console.error('Failed to save resume:', error)
      alert('An error occurred while saving the resume. Please try again.')
    }
  }

  const renderSection = (sectionId: string) => {
    switch (sectionId) {
      case 'experience':
        return (
          <ExperienceSection
            experience={resumeData.experience}
            updateExperience={(data) => updateResumeData('experience', data)}
          />
        )
      case 'education':
        return (
          <EducationSection
            education={resumeData.education}
            updateEducation={(data) => updateResumeData('education', data)}
          />
        )
      case 'projects':
        return (
          <ProjectsSection
            projects={resumeData.projects}
            updateProjects={(data) => updateResumeData('projects', data)}
          />
        )
      case 'certificates':
        return (
          <CertificatesSection
            certificates={resumeData.certificates}
            updateCertificates={(data) => updateResumeData('certificates', data)}
          />
        )
      case 'skills':
        return (
          <SkillsSection
            skills={resumeData.skills}
            updateSkills={(data) => updateResumeData('skills', data)}
            resumeData={resumeData}
          />
        )
      default:
        if (sectionId.startsWith('custom-')) {
          return (
            <CustomSection
              key={sectionId}
              section={resumeData.customSections.find((s) => s.id === sectionId)!}
              updateSection={(data) =>
                setResumeData((prev) => ({
                  ...prev,
                  customSections: prev.customSections.map((s) =>
                    s.id === sectionId ? data : s
                  ),
                }))
              }
              removeSection={() => removeCustomSection(sectionId)}
            />
          )
        }
        return null
    }
  }

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex space-x-2">
        <Button onClick={() => setShowPreview(!showPreview)}>
          {showPreview ? 'Edit Resume' : 'Preview Resume'}
        </Button>
        <Button onClick={() => setShowSaveDialog(true)}>Save Resume</Button>
      </div>
      {showPreview ? (
        <ATSResume resumeData={resumeData} sectionOrder={['personalInfo', 'professionalSummary', ...sectionOrder]} />
      ) : (
        <>
          <PersonalInformationSection
            personalInfo={resumeData.personalInfo}
            updatePersonalInfo={updatePersonalInfo}
          />
          <ProfessionalSummarySection
            professionalSummary={resumeData.professionalSummary}
            updateProfessionalSummary={(data) => updateResumeData('professionalSummary', data)}
          />
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={sectionOrder}
              strategy={verticalListSortingStrategy}
            >
              {sectionOrder.map((sectionId) => (
                <SortableItem key={sectionId} id={sectionId}>
                  {renderSection(sectionId)}
                </SortableItem>
              ))}
            </SortableContext>
          </DndContext>
          <Button onClick={addCustomSection}>Add Custom Section</Button>
        </>
      )}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Resume</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Enter resume name"
            value={resumeName}
            onChange={(e) => setResumeName(e.target.value)}
          />
          <DialogFooter>
            <Button onClick={handleSaveResume}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ResumeBuilder