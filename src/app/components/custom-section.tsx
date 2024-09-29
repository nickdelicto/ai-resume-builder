import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import type { CustomSection } from './resume-builder'

interface CustomSectionProps {
  section: CustomSection
  updateSection: (data: CustomSection) => void
  removeSection: () => void
}

export default function CustomSection({ section, updateSection, removeSection }: CustomSectionProps) {
  const [items, setItems] = useState<string[]>(section.items || [])

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSection({ ...section, title: e.target.value })
  }

  const addItem = () => {
    const newItems = [...items, '']
    setItems(newItems)
    updateSection({ ...section, items: newItems })
  }

  const updateItem = (index: number, value: string) => {
    const newItems = items.map((item, i) => (i === index ? value : item))
    setItems(newItems)
    updateSection({ ...section, items: newItems })
  }

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index)
    setItems(newItems)
    updateSection({ ...section, items: newItems })
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>
          <Input
            value={section.title}
            onChange={handleTitleChange}
            placeholder="Custom Section Title"
            className="text-2xl font-bold"
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.map((item, index) => (
          <div key={index} className="flex items-center mb-2">
            <Input
              value={item}
              onChange={(e) => updateItem(index, e.target.value)}
              placeholder={`Item ${index + 1}`}
              className="flex-grow mr-2"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => removeItem(index)}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button onClick={addItem} className="mt-2">
          Add Item
        </Button>
        <Button variant="destructive" onClick={removeSection} className="mt-4 ml-2">
          Remove Section
        </Button>
      </CardContent>
    </Card>
  )
}