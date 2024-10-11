'use client'

import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { X, Info, RefreshCw } from 'lucide-react'
import { ResumeData } from './resume-builder'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'

interface Skill {
  id: string
  name: string
}

interface SkillsSectionProps {
  skills: Skill[]
  updateSkills: (skills: Skill[]) => void
  resumeData: ResumeData
}

const SkillsSection: React.FC<SkillsSectionProps> = ({ skills, updateSkills, resumeData }) => {
  const [newSkill, setNewSkill] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [suggestionsCount, setSuggestionsCount] = useState(0)
  const [originalSkills, setOriginalSkills] = useState<Skill[]>([])

  useEffect(() => {
    setOriginalSkills(skills)
  }, [skills])  // Add 'skills' to the dependency array

  const addSkill = () => {
    if (newSkill.trim()) {
      updateSkills([...skills, { id: Date.now().toString(), name: newSkill.trim() }])
      setNewSkill('')
    }
  }

  const removeSkill = (id: string) => {
    updateSkills(skills.filter(skill => skill.id !== id))
  }

  const suggestSkills = async () => {
    if (suggestionsCount >= 5) {
      alert('You have reached the maximum number of skill suggestions. Please reset to generate more.')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/suggest-skills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(resumeData),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch skill suggestions')
      }

      const suggestedSkills: string[] = await response.json()
      const newSkills = suggestedSkills.map(skill => ({
        id: Date.now().toString() + Math.random(),
        name: skill,
      }))

      updateSkills([...skills, ...newSkills])
      setSuggestionsCount(prevCount => prevCount + 1)
    } catch (error) {
      console.error('Error suggesting skills:', error)
      alert('Failed to suggest skills. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const resetSkills = () => {
    updateSkills(originalSkills)
    setSuggestionsCount(0)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Skills</h2>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-5 w-5 text-gray-500 cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p>For best results, add some skills or fill out other sections of your resume before using the &apos;Suggest Skills&apos; button.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="flex flex-wrap gap-2">
        {skills.map(skill => (
          <div key={skill.id} className="flex items-center bg-gray-100 rounded-full px-3 py-1">
            <span>{skill.name}</span>
            <Button variant="ghost" size="sm" onClick={() => removeSkill(skill.id)} className="ml-2 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex items-center space-x-2">
        <Input
          placeholder="Add a new skill"
          value={newSkill}
          onChange={(e) => setNewSkill(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addSkill()}
        />
        <Button onClick={addSkill}>Add Skill</Button>
      </div>
      <div className="flex items-center space-x-2">
        <Button onClick={suggestSkills} disabled={isLoading || suggestionsCount >= 5}>
          {isLoading ? 'Suggesting Skills...' : `Suggest Skills (${5 - suggestionsCount} left)`}
        </Button>
        <Button onClick={resetSkills} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Reset Skills
        </Button>
      </div>
    </div>
  )
}

export default SkillsSection