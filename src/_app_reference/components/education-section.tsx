import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Education } from './resume-builder'

interface EducationSectionProps {
  education: Education[]
  updateEducation: (data: Education[]) => void
}

export default function EducationSection({ education, updateEducation }: EducationSectionProps) {
  const addEducation = () => {
    const newEducation: Education = {
      id: Date.now().toString(),
      institution: '',
      degree: '',
      fieldOfStudy: '',
      graduationDate: '',
    }
    updateEducation([...education, newEducation])
  }

  const updateEducationItem = (index: number, field: keyof Education, value: string) => {
    const updatedEducation = education.map((edu, i) =>
      i === index ? { ...edu, [field]: value } : edu
    )
    updateEducation(updatedEducation)
  }

  const removeEducation = (index: number) => {
    const updatedEducation = education.filter((_, i) => i !== index)
    updateEducation(updatedEducation)
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Education</CardTitle>
      </CardHeader>
      <CardContent>
        {education.map((edu, index) => (
          <div key={edu.id} className="mb-4 p-4 border rounded">
            <Input
              className="mb-2"
              placeholder="Institution"
              value={edu.institution}
              onChange={(e) => updateEducationItem(index, 'institution', e.target.value)}
            />
            <Input
              className="mb-2"
              placeholder="Degree"
              value={edu.degree}
              onChange={(e) => updateEducationItem(index, 'degree', e.target.value)}
            />
            <Input
              className="mb-2"
              placeholder="Field of Study"
              value={edu.fieldOfStudy}
              onChange={(e) => updateEducationItem(index, 'fieldOfStudy', e.target.value)}
            />
            <Input
              className="mb-2"
              type="date"
              placeholder="Graduation Date"
              value={edu.graduationDate}
              onChange={(e) => updateEducationItem(index, 'graduationDate', e.target.value)}
            />
            <Button variant="destructive" onClick={() => removeEducation(index)}>
              Remove
            </Button>
          </div>
        ))}
        <Button onClick={addEducation}>Add Education</Button>
      </CardContent>
    </Card>
  )
}