import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'

interface Project {
  id: string
  name: string
  description: string
}

interface ProjectsSectionProps {
  projects: Project[]
  updateProjects: (data: Project[]) => void
}

export default function ProjectsSection({ projects, updateProjects }: ProjectsSectionProps) {
  const addProject = () => {
    const newProject: Project = {
      id: Date.now().toString(),
      name: '',
      description: '',
    }
    updateProjects([...projects, newProject])
  }

  const updateProjectItem = (index: number, field: keyof Project, value: string) => {
    const updatedProjects = projects.map((proj, i) =>
      i === index ? { ...proj, [field]: value } : proj
    )
    updateProjects(updatedProjects)
  }

  const removeProject = (index: number) => {
    const updatedProjects = projects.filter((_, i) => i !== index)
    updateProjects(updatedProjects)
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Projects</CardTitle>
      </CardHeader>
      <CardContent>
        {projects.map((project, index) => (
          <div key={project.id} className="mb-4 p-4 border rounded">
            <Input
              className="mb-2"
              placeholder="Project Name"
              value={project.name}
              onChange={(e) => updateProjectItem(index, 'name', e.target.value)}
            />
            <Textarea
              className="mb-2"
              placeholder="Project Description"
              value={project.description}
              onChange={(e) => updateProjectItem(index, 'description', e.target.value)}
            />
            <Button variant="destructive" onClick={() => removeProject(index)}>
              Remove
            </Button>
          </div>
        ))}
        <Button onClick={addProject}>Add Project</Button>
      </CardContent>
    </Card>
  )
}