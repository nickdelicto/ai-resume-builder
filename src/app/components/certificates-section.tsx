import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Certificate } from './resume-builder'

interface CertificatesSectionProps {
  certificates: Certificate[]
  updateCertificates: (data: Certificate[]) => void
}

export default function CertificatesSection({ certificates, updateCertificates }: CertificatesSectionProps) {
  const addCertificate = () => {
    const newCertificate: Certificate = {
      id: Date.now().toString(),
      name: '',
      issuer: '',
      issueDate: '',
    }
    updateCertificates([...certificates, newCertificate])
  }

  const updateCertificateItem = (index: number, field: keyof Certificate, value: string) => {
    const updatedCertificates = certificates.map((cert, i) =>
      i === index ? { ...cert, [field]: value } : cert
    )
    updateCertificates(updatedCertificates)
  }

  const removeCertificate = (index: number) => {
    const updatedCertificates = certificates.filter((_, i) => i !== index)
    updateCertificates(updatedCertificates)
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Certifications</CardTitle>
      </CardHeader>
      <CardContent>
        {certificates.map((cert, index) => (
          <div key={cert.id} className="mb-4 p-4 border rounded">
            <Input
              className="mb-2"
              placeholder="Certificate Name"
              value={cert.name}
              onChange={(e) => updateCertificateItem(index, 'name', e.target.value)}
            />
            <Input
              className="mb-2"
              placeholder="Issuer"
              value={cert.issuer}
              onChange={(e) => updateCertificateItem(index, 'issuer', e.target.value)}
            />
            <Input
              className="mb-2"
              type="date"
              placeholder="Issue Date"
              value={cert.issueDate}
              onChange={(e) => updateCertificateItem(index, 'issueDate', e.target.value)}
            />
            <Button variant="destructive" onClick={() => removeCertificate(index)}>
              Remove
            </Button>
          </div>
        ))}
        <Button onClick={addCertificate}>Add Certificate</Button>
      </CardContent>
    </Card>
  )
}