'use client'

import React from 'react'
import { ResumeData } from './resume-builder'
import { Button } from './ui/button'
import { pdf } from '@react-pdf/renderer'
import PDFResume from './pdf-resume'
import { useToast } from './ui/use-toast'

// Updated interface to include userPlanType
interface ATSResumeProps {
  resumeData: ResumeData
  sectionOrder: string[]
  userPlanType: 'free' | 'paid'
}

const ATSResume: React.FC<ATSResumeProps> = ({ resumeData, sectionOrder, userPlanType }) => {
  const { toast } = useToast()

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
  }

  const formatAddress = (personalInfo: ResumeData['personalInfo']) => {
    const parts = [
      personalInfo.city,
      personalInfo.state,
      personalInfo.zipcode,
      personalInfo.country,
    ].filter(Boolean)
    return parts.join(', ')
  }

  const renderDescription = (description: string) => {
    return description.split('\n').map((line, index) => (
      <p key={index} className="mt-1">
        {line.startsWith('- ') ? line : `- ${line}`}
      </p>
    ))
  }

  const renderSectionTitle = (title: string) => (
    <div className="mb-2">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <hr className="border-t border-gray-300 mt-1" />
    </div>
  )

  const isPopulated = (sectionId: string): boolean => {
    switch (sectionId) {
      case 'professionalSummary':
        return !!resumeData.professionalSummary.trim()
      case 'experience':
        return resumeData.experience.length > 0
      case 'education':
        return resumeData.education.length > 0
      case 'skills':
        return resumeData.skills && resumeData.skills.length > 0
      case 'projects':
        return resumeData.projects.length > 0
      case 'certificates':
        return resumeData.certificates.length > 0
      default:
        if (sectionId.startsWith('custom-')) {
          const customSection = resumeData.customSections.find(s => s.id === sectionId)
          return customSection ? customSection.items.length > 0 : false
        }
        return false
    }
  }

  const renderSkills = (skills: { id: string; name: string }[]) => {
    if (skills.length === 0) {
      return null
    }

    const midpoint = Math.ceil(skills.length / 2)
    const leftColumn = skills.slice(0, midpoint)
    const rightColumn = skills.slice(midpoint)

    return (
      <div className="grid grid-cols-2 gap-4">
        <ul className="list-disc list-inside">
          {leftColumn.map((skill) => (
            <li key={skill.id}>{skill.name}</li>
          ))}
        </ul>
        <ul className="list-disc list-inside">
          {rightColumn.map((skill) => (
            <li key={skill.id}>{skill.name}</li>
          ))}
        </ul>
      </div>
    )
  }

  // Updated exportToPDF function to check user plan type
  const exportToPDF = async () => {
    if (userPlanType === 'free') {
      toast({
        title: "Feature not available",
        description: "PDF export is only available for paid plan users. Please upgrade your plan to use this feature.",
        variant: "destructive",
      })
      return
    }

    const blob = await pdf(<PDFResume resumeData={resumeData} sectionOrder={sectionOrder} />).toBlob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${resumeData.personalInfo.name.replace(/\s+/g, '_')}_resume.pdf`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-white p-8 shadow-lg max-w-4xl mx-auto font-['Arial', sans-serif] text-base">
      <div id="ats-resume">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{resumeData.personalInfo.name}</h1>
          <p className="text-gray-600">{resumeData.personalInfo.email}</p>
          <p className="text-gray-600">{resumeData.personalInfo.phone}</p>
          <p className="text-gray-600">{formatAddress(resumeData.personalInfo)}</p>
        </div>

        {sectionOrder.filter(isPopulated).map((sectionId) => (
          <div key={sectionId} className="mb-6">
            {sectionId === 'professionalSummary' && (
              <>
                {renderSectionTitle('Professional Summary')}
                <p>{resumeData.professionalSummary}</p>
              </>
            )}

            {sectionId === 'experience' && (
              <>
                {renderSectionTitle('Work Experience')}
                {resumeData.experience.map((exp, index) => (
                  <div key={index} className="mb-4">
                    <h3 className="text-xl font-medium">{exp.position}</h3>
                    <p className="text-gray-600">{exp.company}</p>
                    <p className="text-gray-600">
                      {formatDate(exp.startDate)} - {exp.endDate ? formatDate(exp.endDate) : 'Present'}
                    </p>
                    <div className="mt-2">{renderDescription(exp.description)}</div>
                  </div>
                ))}
              </>
            )}

            {sectionId === 'education' && (
              <>
                {renderSectionTitle('Education')}
                {resumeData.education.map((edu, index) => (
                  <div key={index} className="mb-4">
                    <h3 className="text-xl font-medium">{edu.degree}</h3>
                    <p className="text-gray-900">{edu.fieldOfStudy}</p>
                    <p className="text-gray-600">{edu.institution}</p>
                    <p className="text-gray-600">{formatDate(edu.graduationDate)}</p>
                  </div>
                ))}
              </>
            )}

            {sectionId === 'skills' && resumeData.skills && resumeData.skills.length > 0 && (
              <>
                {renderSectionTitle('Skills')}
                {renderSkills(resumeData.skills)}
              </>
            )}

            {sectionId === 'projects' && (
              <>
                {renderSectionTitle('Projects')}
                {resumeData.projects.map((project, index) => (
                  <div key={index} className="mb-4">
                    <h3 className="text-xl font-medium">{project.name}</h3>
                    <p className="mt-2">{project.description}</p>
                  </div>
                ))}
              </>
            )}

            {sectionId === 'certificates' && (
              <>
                {renderSectionTitle('Certifications')}
                {resumeData.certificates.map((cert, index) => (
                  <div key={index} className="mb-2">
                    <h3 className="text-xl font-medium">{cert.name}</h3>
                    <p className="text-gray-600">{cert.issuer} - {formatDate(cert.issueDate)}</p>
                  </div>
                ))}
              </>
            )}

            {sectionId.startsWith('custom-') && (
              <>
                {renderSectionTitle(resumeData.customSections.find(s => s.id === sectionId)?.title || 'Custom Section')}
                <ul className="list-disc list-inside">
                  {resumeData.customSections.find(s => s.id === sectionId)?.items.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ))}
      </div>
      {/* Updated Button to be disabled for free plan users */}
      <Button 
        onClick={exportToPDF} 
        className="mt-4" 
        disabled={userPlanType === 'free'}
      >
        {userPlanType === 'free' ? 'Upgrade to Export PDF' : 'Export to PDF'}
      </Button>
    </div>
  )
}

export default ATSResume