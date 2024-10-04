'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, FileText, Plus, Eye, Save, AlertCircle } from 'lucide-react'
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
import { useToast } from './ui/use-toast'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Progress } from './ui/progress'

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
  experience: any[];
  education: any[];
  projects: { id: string; name: string; description: string }[];
  certificates: any[];
  customSections: any[];
  skills: { id: string; name: string }[];
}

interface SavedResume {
  _id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface ResumeBuilderProps {
  initialData?: ResumeData & { _id?: string; name?: string; sectionOrder?: string[] }
  onSave?: (data: ResumeData & { name: string; sectionOrder: string[] }) => Promise<void>
  isSaving?: boolean
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
    <div ref={setNodeRef} style={style} {...attributes} className="mb-6 border rounded-lg bg-white shadow-sm">
      <div className="flex items-center p-3 bg-emerald-100 border-b rounded-t-lg">
        <div {...listeners} className="mr-3 cursor-move">
          <GripVertical size={20} className="text-emerald-600" />
        </div>
        <h2 className="text-lg font-bold text-emerald-700">{id.charAt(0).toUpperCase() + id.slice(1)}</h2>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  )
}

const calculateCompletion = (data: ResumeData, sectionOrder: string[]) => {
  const sectionWeights = {
    personalInfo: 15,
    professionalSummary: 15,
    experience: 20,
    education: 15,
    skills: 15,
    projects: 10,
    certificates: 5,
    customSections: 5
  };

  let totalWeight = 0;
  let completedWeight = 0;

  const isPersonalInfoComplete = Object.values(data.personalInfo).every(value => value !== '');
  if (isPersonalInfoComplete) completedWeight += sectionWeights.personalInfo;
  totalWeight += sectionWeights.personalInfo;

  if (data.professionalSummary.trim() !== '') completedWeight += sectionWeights.professionalSummary;
  totalWeight += sectionWeights.professionalSummary;

  if (data.experience.length > 0) completedWeight += sectionWeights.experience;
  totalWeight += sectionWeights.experience;

  if (data.education.length > 0) completedWeight += sectionWeights.education;
  totalWeight += sectionWeights.education;

  if (data.skills.length > 0) completedWeight += sectionWeights.skills;
  totalWeight += sectionWeights.skills;

  if (data.projects.length > 0) completedWeight += sectionWeights.projects;
  totalWeight += sectionWeights.projects;

  if (data.certificates.length > 0) completedWeight += sectionWeights.certificates;
  totalWeight += sectionWeights.certificates;

  const customSectionCount = sectionOrder.filter(section => section.startsWith('custom-')).length;
  if (customSectionCount > 0) {
    const customSectionWeight = sectionWeights.customSections / customSectionCount;
    data.customSections.forEach(section => {
      if (section.items.length > 0) completedWeight += customSectionWeight;
      totalWeight += customSectionWeight;
    });
  }

  return (completedWeight / totalWeight) * 100;
};

export function ResumeBuilder({ initialData, onSave, isSaving }: ResumeBuilderProps) {
  const [resumeData, setResumeData] = useState<ResumeData>(initialData?.data || {
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

  const [sectionOrder, setSectionOrder] = useState(initialData?.sectionOrder || [
    'experience',
    'education',
    'skills',
    'projects',
    'certificates',
  ])

  const [showPreview, setShowPreview] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [resumeName, setResumeName] = useState(initialData?.name || '')
  const { data: session } = useSession()
  const router = useRouter()

  const [savedResumes, setSavedResumes] = useState<SavedResume[]>([])
  const [isLoadingResumes, setIsLoadingResumes] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState('edit')
  const [completionPercentage, setCompletionPercentage] = useState(0)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    const fetchSavedResumes = async () => {
      if (!session?.user) {
        setIsLoadingResumes(false)
        return
      }

      try {
        const response = await fetch('/api/resumes')
        if (!response.ok) {
          throw new Error('Failed to fetch resumes')
        }
        const data = await response.json()
        setSavedResumes(data)
        setLoadError(null)
      } catch (error) {
        console.error('Error fetching resumes:', error)
        setLoadError('Failed to load saved resumes. Please try again later.')
        toast({
          title: 'Error',
          description: 'Failed to fetch saved resumes',
          variant: 'destructive',
        })
      } finally {
        setIsLoadingResumes(false)
      }
    }

    if (!initialData) {
      fetchSavedResumes()
    }
  }, [session, toast, initialData])

  useEffect(() => {
    const completionPercentage = calculateCompletion(resumeData, sectionOrder);
    setCompletionPercentage(completionPercentage);
  }, [resumeData, sectionOrder]);

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
      if (onSave) {
        await onSave({
          ...resumeData,
          name: resumeName,
          sectionOrder: sectionOrder,
        })
      } else {
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
          const updatedResumes = await response.json()
          setSavedResumes(updatedResumes)
        } else if (response.status === 403) {
          throw new Error('You have reached your resume limit. Please upgrade your plan to save more resumes.')
        } else {
          throw new Error('Failed to save resume')
        }
      }

      setShowSaveDialog(false)
      toast({
        title: 'Success',
        description: 'Resume saved successfully!',
      })
    } catch (error) {
      console.error('Failed to save resume:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An error occurred while saving the resume. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const loadResume = async (resumeId: string) => {
    try {
      const response = await fetch(`/api/resumes/${resumeId}`)
      if (response.ok) {
        const loadedResume = await response.json()
        setResumeData(loadedResume.data)
        setSectionOrder(loadedResume.sectionOrder || sectionOrder)
        setResumeName(loadedResume.name)
        toast({
          title: "Success",
          description: "Resume loaded successfully!",
        })
      } else {
        throw new Error('Failed to load resume')
      }
    } catch (error) {
      console.error('Error loading resume:', error)
      toast({
        title: "Error",
        description: "Failed to load resume. Please try again.",
        variant: "destructive",
      })
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
    <div className="container mx-auto px-4 py-8 bg-white">
      <h1 className="text-4xl font-bold mb-8 text-center text-primary">IntelliResume Builder</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger 
            value="edit" 
            className="text-base py-2 px-4 flex items-center justify-center data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Edit Resume
          </TabsTrigger>
          <TabsTrigger 
            value="preview"
            className="text-base py-2 px-4 flex items-center justify-center data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Preview
          </TabsTrigger>
        </TabsList>
        <TabsContent value="edit">
          <Card className="border-2 border-primary/20">
            <CardHeader className="bg-primary/5 rounded-t-lg">
              <CardTitle className="flex justify-between items-center text-xl">
                <span>Resume Editor</span>
                <span className="text-base font-normal">Completion: {completionPercentage.toFixed(0)}%</span>
              </CardTitle>
              <Progress value={completionPercentage} className="w-full h-2 mt-2" />
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-8">
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
              </div>
            </CardContent>
            <CardFooter className="flex justify-between bg-primary/5 p-4 rounded-b-lg">
              <Button onClick={addCustomSection} variant="outline" size="default" className="text-sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Custom Section
              </Button>
              <Button onClick={() => setShowSaveDialog(true)} size="default" className="text-sm">
                <Save className="mr-2 h-4 w-4" />
                Save Resume
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="preview">
          <Card className="border-2 border-primary/20">
            <CardHeader className="bg-primary/5 rounded-t-lg">
              <CardTitle className="text-xl text-center">Resume Preview</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ATSResume resumeData={resumeData} sectionOrder={['personalInfo', 'professionalSummary', ...sectionOrder]} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {!initialData && (
        <Card className="mt-8 border-2 border-primary/20">
          <CardHeader className="bg-primary/5 rounded-t-lg">
            <CardTitle className="text-xl text-center">Saved Resumes</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {isLoadingResumes ? (
              <p className="text-center text-gray-500">Loading saved resumes...</p>
            ) : loadError ? (
              <div className="text-center text-red-500">
                <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                <p>{loadError}</p>
              </div>
            ) : savedResumes.length > 0 ? (
              <ul className="space-y-3">
                {savedResumes.map((resume) => (
                  <li key={resume._id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <span className="flex items-center">
                      <FileText className="mr-3 h-5 w-5" />
                      {resume.name}
                    </span>
                    <Button onClick={() => loadResume(resume._id)} variant="outline" size="sm">
                      Load
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-gray-500">No saved resumes yet.</p>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl text-center">Save Resume</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Enter resume name"
            value={resumeName}
            onChange={(e) => setResumeName(e.target.value)}
            className="text-base py-2"
          />
          <DialogFooter>
            <Button onClick={handleSaveResume} disabled={isSaving} size="default" className="text-sm">
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}