'use client'

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Label } from './ui/label'
import { ChevronLeft, ChevronRight, Info, RotateCcw, ArrowLeftRight } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog"

// Define the structure of an Experience item
interface Experience {
  id: string
  company: string
  position: string
  startDate: string
  endDate: string
  description: string
  suggestionCount: number
  history: string[]
  currentIndex: number
}

// Define the props for the ExperienceSection component
interface ExperienceSectionProps {
  experience: Experience[]
  updateExperience: (data: Experience[]) => void
}

const MAX_SUGGESTIONS = 5

const ExperienceSection: React.FC<ExperienceSectionProps> = ({ experience, updateExperience }) => {
  const [isLoading, setIsLoading] = useState<{ [key: string]: boolean }>({})
  const [compareVersions, setCompareVersions] = useState<{ [key: string]: number | null }>({})

  // Function to add a new experience
  const addExperience = useCallback(() => {
    const newExperience: Experience = {
      id: Date.now().toString(),
      company: '',
      position: '',
      startDate: '',
      endDate: '',
      description: '',
      suggestionCount: 0,
      history: [''],
      currentIndex: 0,
    }
    updateExperience([...experience, newExperience])
  }, [experience, updateExperience])

  // Function to update a specific field of an experience
  const updateExperienceItem = useCallback((index: number, field: keyof Experience, value: any) => {
    updateExperience(experience.map((exp, i) =>
      i === index ? { ...exp, [field]: value } : exp
    ))
  }, [experience, updateExperience])

  // Function to remove an experience
  const removeExperience = useCallback((index: number) => {
    updateExperience(experience.filter((_, i) => i !== index))
  }, [experience, updateExperience])

  // Function to handle AI suggestion
  const handleAIsuggestion = useCallback(async (index: number) => {
    if (experience[index].suggestionCount >= MAX_SUGGESTIONS) return

    setIsLoading(prev => ({ ...prev, [index]: true }))
    try {
      const response = await fetch('/api/improve-experience', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description: experience[index].description }),
      })
      const data = await response.json()
      if (data.improvedDescription) {
        const newSuggestionCount = experience[index].suggestionCount + 1
        updateExperience(experience.map((exp, i) => 
          i === index 
            ? { 
                ...exp, 
                description: data.improvedDescription, 
                suggestionCount: newSuggestionCount, 
                history: [...exp.history, data.improvedDescription],
                currentIndex: newSuggestionCount,
              }
            : exp
        ))
      }
    } catch (error) {
      console.error('Error getting AI suggestion:', error)
    } finally {
      setIsLoading(prev => ({ ...prev, [index]: false }))
    }
  }, [experience, updateExperience])

  // Function to reset an experience
  const resetExperience = useCallback((index: number) => {
    updateExperience(experience.map((exp, i) => 
      i === index 
        ? { 
          ...exp, 
          description: '', // Clear the description
          suggestionCount: 0,
          history: [''], // Reset history with an empty string
          currentIndex: 0
        }
      : exp
    ))
  }, [experience, updateExperience])

  // Function to navigate through experience history
  const navigateHistory = useCallback((index: number, direction: 'prev' | 'next') => {
    const exp = experience[index]
    const newIndex = direction === 'prev' ? exp.currentIndex - 1 : exp.currentIndex + 1
    if (newIndex >= 0 && newIndex <= exp.suggestionCount) {
      updateExperience(experience.map((e, i) => 
        i === index 
          ? { ...e, description: e.history[newIndex], currentIndex: newIndex }
          : e
      ))
    }
  }, [experience, updateExperience])

  // Function to validate dates
  const validateDates = useCallback((startDate: string, endDate: string) => {
    if (!startDate || !endDate) return true
    return new Date(startDate) <= new Date(endDate)
  }, [])

  // Function to handle description change
  const handleDescriptionChange = useCallback((index: number, value: string) => {
    const lines = value.split('\n')
    const newLines = lines.map(line => line.startsWith('- ') ? line : `- ${line}`)
    const newDescription = newLines.join('\n')
    updateExperience(experience.map((exp, i) => 
      i === index 
        ? { 
            ...exp, 
            description: newDescription,
            history: [newDescription],  // Only update the first version
            currentIndex: 0,  // Always stay at index 0 for user input
          }
        : exp
    ))
  }, [experience, updateExperience])

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Work Experience
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Add your work experiences. You can get up to 5 Intelligent suggestions for each experience.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {experience.map((exp, index) => (
          <div key={exp.id} className="mb-4 p-4 border rounded">
            <Input
              className="mb-2"
              placeholder="Company"
              value={exp.company}
              onChange={(e) => updateExperienceItem(index, 'company', e.target.value)}
            />
            <Input
              className="mb-2"
              placeholder="Position"
              value={exp.position}
              onChange={(e) => updateExperienceItem(index, 'position', e.target.value)}
            />
            <div className="flex mb-2">
              <div className="mr-2 flex-1">
                <Label htmlFor={`startDate-${index}`}>Start Date</Label>
                <Input
                  id={`startDate-${index}`}
                  type="date"
                  value={exp.startDate}
                  onChange={(e) => updateExperienceItem(index, 'startDate', e.target.value)}
                />
              </div>
              <div className="flex-1">
                <Label htmlFor={`endDate-${index}`}>End Date</Label>
                <Input
                  id={`endDate-${index}`}
                  type="date"
                  value={exp.endDate}
                  onChange={(e) => updateExperienceItem(index, 'endDate', e.target.value)}
                />
              </div>
            </div>
            {!validateDates(exp.startDate, exp.endDate) && (
              <p className="text-red-500 text-sm mb-2">End date cannot be before start date</p>
            )}
            <Textarea
              id={`description-${index}`}
              className="mb-2"
              placeholder="Description (Enter your experience as bullet points)"
              value={exp.description || ''}
              onChange={(e) => handleDescriptionChange(index, e.target.value)}
              rows={10}
            />
            <div className="flex justify-between items-center mb-2">
              <Button
                onClick={() => handleAIsuggestion(index)}
                disabled={exp.description.trim().split(/\s+/).length < 10 || isLoading[index] || exp.suggestionCount >= MAX_SUGGESTIONS}
              >
                {isLoading[index] ? 'Getting Suggestion...' : `Get Intelligent Suggestion (${exp.suggestionCount}/${MAX_SUGGESTIONS})`}
              </Button>
              <div className="flex items-center space-x-2">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => navigateHistory(index, 'prev')}
                  disabled={exp.currentIndex === 0}
                  aria-label="Previous version"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Version {exp.currentIndex} of {exp.suggestionCount}
                </span>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => navigateHistory(index, 'next')}
                  disabled={exp.currentIndex === exp.suggestionCount}
                  aria-label="Next version"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => resetExperience(index)}
                className="flex items-center"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex items-center">
                    <ArrowLeftRight className="h-4 w-4 mr-2" />
                    Compare Versions
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[900px]">
                  <DialogHeader>
                    <DialogTitle>Compare Versions</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Current Version</Label>
                      <Textarea
                        className="mt-2"
                        value={exp.description}
                        readOnly
                        rows={10}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`compareVersion-${index}`}>Compare With</Label>
                      {/* Updated select element to fix type error */}
                      <select
                        id={`compareVersion-${index}`}
                        className="w-full p-2 border rounded mb-2"
                        value={compareVersions[index]?.toString() ?? ''}
                        onChange={(e) => setCompareVersions({ ...compareVersions, [index]: e.target.value ? Number(e.target.value) : null })}
                      >
                        <option value="">Select a version</option>
                        {exp.history.map((_, historyIndex) => (
                          <option key={historyIndex} value={historyIndex} disabled={historyIndex === exp.currentIndex}>
                            Version {historyIndex}
                          </option>
                        ))}
                      </select>
                      {compareVersions[index] !== null && (
                        <Textarea
                          className="mt-2"
                          value={exp.history[compareVersions[index] as number]}
                          readOnly
                          rows={10}
                        />
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="destructive" onClick={() => removeExperience(index)}>
                Remove
              </Button>
            </div>
          </div>
        ))}
        <Button onClick={addExperience}>Add Experience</Button>
      </CardContent>
    </Card>
  )
}

export default ExperienceSection