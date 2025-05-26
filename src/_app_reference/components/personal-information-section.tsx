import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'

interface PersonalInfo {
  name: string
  email: string
  phone: string
  city: string
  state: string
  zipcode: string
  country: string
}

interface PersonalInformationSectionProps {
  personalInfo: PersonalInfo
  updatePersonalInfo: (field: keyof PersonalInfo, value: string) => void
}

const PersonalInformationSection: React.FC<PersonalInformationSectionProps> = ({
  personalInfo,
  updatePersonalInfo,
}) => {
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Personal Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={personalInfo.name}
              onChange={(e) => updatePersonalInfo('name', e.target.value)}
              placeholder="John Doe"
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={personalInfo.email}
              onChange={(e) => updatePersonalInfo('email', e.target.value)}
              placeholder="johndoe@example.com"
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={personalInfo.phone}
              onChange={(e) => updatePersonalInfo('phone', e.target.value)}
              placeholder="(123) 456-7890"
            />
          </div>
          <div>
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={personalInfo.city}
              onChange={(e) => updatePersonalInfo('city', e.target.value)}
              placeholder="New York"
            />
          </div>
          <div>
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              value={personalInfo.state}
              onChange={(e) => updatePersonalInfo('state', e.target.value)}
              placeholder="NY"
            />
          </div>
          <div>
            <Label htmlFor="zipcode">Zip Code</Label>
            <Input
              id="zipcode"
              value={personalInfo.zipcode}
              onChange={(e) => updatePersonalInfo('zipcode', e.target.value)}
              placeholder="10001"
            />
          </div>
          <div>
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              value={personalInfo.country}
              onChange={(e) => updatePersonalInfo('country', e.target.value)}
              placeholder="USA"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default PersonalInformationSection