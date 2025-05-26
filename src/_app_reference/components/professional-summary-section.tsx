import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
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

interface ProfessionalSummaryProps {
  professionalSummary: string
  updateProfessionalSummary: (summary: string) => void
}

const MAX_VERSIONS = 5

const ProfessionalSummarySection: React.FC<ProfessionalSummaryProps> = ({
  professionalSummary,
  updateProfessionalSummary,
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [summaryHistory, setSummaryHistory] = useState<string[]>([professionalSummary])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [compareVersion, setCompareVersion] = useState<number | null>(null)
  const [suggestionCount, setSuggestionCount] = useState(0)

  const wordCount = professionalSummary.trim().split(/\s+/).length

  const handleAISuggestion = async () => {
    if (suggestionCount >= MAX_VERSIONS) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/improve-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ summary: professionalSummary }),
      })
      const data = await response.json()
      if (data.improvedSummary) {
        const newSuggestionCount = suggestionCount + 1
        const newHistory = [...summaryHistory.slice(0, newSuggestionCount), data.improvedSummary]
        setSummaryHistory(newHistory)
        setCurrentIndex(newSuggestionCount)
        updateProfessionalSummary(data.improvedSummary)
        setSuggestionCount(newSuggestionCount)
      }
    } catch (error) {
      console.error('Error getting AI suggestion:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const navigateHistory = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1
    if (newIndex >= 0 && newIndex <= suggestionCount) {
      setCurrentIndex(newIndex)
      updateProfessionalSummary(summaryHistory[newIndex])
    }
  }

  const resetHistory = () => {
    setSummaryHistory([''])
    setCurrentIndex(0)
    updateProfessionalSummary('')
    setSuggestionCount(0)
  }

  const handleSummaryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newSummary = e.target.value
    updateProfessionalSummary(newSummary)
    
    // Update the current version in history without creating a new version
    const updatedHistory = [...summaryHistory]
    updatedHistory[currentIndex] = newSummary
    setSummaryHistory(updatedHistory)
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Professional Summary
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Use the navigation buttons to browse through different versions of your summary. You can generate up to 5 versions.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="professionalSummary">Summary</Label>
            <Textarea
              id="professionalSummary"
              value={professionalSummary}
              onChange={handleSummaryChange}
              placeholder="Write a brief professional summary..."
              className="min-h-[100px]"
            />
            <p className="text-sm text-muted-foreground">
              Word count: {wordCount}
            </p>
          </div>
          <div className="flex items-center justify-between">
            <Button
              onClick={handleAISuggestion}
              disabled={wordCount < 10 || isLoading || suggestionCount >= MAX_VERSIONS}
            >
              {isLoading ? 'Getting Suggestion...' : `Get Intelligent Suggestion (${suggestionCount}/${MAX_VERSIONS})`}
            </Button>
            <div className="flex items-center space-x-2">
              <Button
                size="icon"
                variant="outline"
                onClick={() => navigateHistory('prev')}
                disabled={currentIndex === 0}
                aria-label="Previous version"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Version {currentIndex} of {suggestionCount}
              </span>
              <Button
                size="icon"
                variant="outline"
                onClick={() => navigateHistory('next')}
                disabled={currentIndex === suggestionCount}
                aria-label="Next version"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={resetHistory}
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
                    <Label htmlFor="currentVersion">Current Version</Label>
                    <Textarea
                      id="currentVersion"
                      value={summaryHistory[currentIndex]}
                      readOnly
                      rows={10}
                    />
                  </div>
                  <div>
                    <Label htmlFor="compareVersion">Compare With</Label>
                    <select
                      id="compareVersion"
                      className="w-full p-2 border rounded"
                      value={compareVersion === null ? '' : compareVersion}
                      onChange={(e) => setCompareVersion(Number(e.target.value))}
                    >
                      <option value="">Select a version</option>
                      {summaryHistory.slice(0, suggestionCount + 1).map((_, index) => (
                        <option key={index} value={index} disabled={index === currentIndex}>
                          Version {index}
                        </option>
                      ))}
                    </select>
                    {compareVersion !== null && (
                      <Textarea
                        value={summaryHistory[compareVersion]}
                        readOnly
                        rows={10}
                        className="mt-2"
                      />
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default ProfessionalSummarySection