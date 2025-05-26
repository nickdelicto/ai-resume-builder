import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import { ResumeData } from './resume-builder'

Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf', fontWeight: 300 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 400 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf', fontWeight: 500 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 },
  ],
})

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontFamily: 'Roboto',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'column',
  },
  headerRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  name: {
    fontSize: 24,
    fontWeight: 700,
  },
  contactInfo: {
    fontSize: 10,
    marginBottom: 2,
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    marginBottom: 5,
  },
  text: {
    fontSize: 10,
    marginBottom: 3,
  },
  bold: {
    fontWeight: 700,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  column: {
    width: '48%',
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  bullet: {
    width: 10,
    fontSize: 10,
  },
  jobPosition: {
    fontSize: 11,
    fontWeight: 700,
  },
  company: {
    fontSize: 10,
    fontWeight: 500,
  },
  degree: {
    fontSize: 11,
    fontWeight: 700,
  },
  fieldOfStudy: {
    fontSize: 10,
    fontWeight: 500,
  },
})

interface PDFResumeProps {
  resumeData: ResumeData
  sectionOrder: string[]
}

const PDFResume: React.FC<PDFResumeProps> = ({ resumeData, sectionOrder }) => {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
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
      <View key={index} style={styles.listItem}>
        <Text style={styles.bullet}>{'\u2022'}</Text>
        <Text style={[styles.text, { flex: 1 }]}>{line.replace(/^- /, '')}</Text>
      </View>
    ))
  }

  const renderSectionTitle = (title: string) => (
    <Text style={styles.sectionTitle}>{title}</Text>
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
        return resumeData.projects && resumeData.projects.length > 0
      case 'certificates':
        return resumeData.certificates && resumeData.certificates.length > 0
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
      <View style={styles.row}>
        <View style={styles.column}>
          {leftColumn.map((skill) => (
            <View key={skill.id} style={styles.listItem}>
              <Text style={styles.bullet}>{'\u2022'}</Text>
              <Text style={styles.text}>{skill.name}</Text>
            </View>
          ))}
        </View>
        <View style={styles.column}>
          {rightColumn.map((skill) => (
            <View key={skill.id} style={styles.listItem}>
              <Text style={styles.bullet}>{'\u2022'}</Text>
              <Text style={styles.text}>{skill.name}</Text>
            </View>
          ))}
        </View>
      </View>
    )
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.name}>{resumeData.personalInfo.name}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.contactInfo}>{resumeData.personalInfo.email}</Text>
            <Text style={styles.contactInfo}>{resumeData.personalInfo.phone}</Text>
            <Text style={styles.contactInfo}>{formatAddress(resumeData.personalInfo)}</Text>
          </View>
        </View>

        {sectionOrder.filter(isPopulated).map((sectionId) => (
          <View key={sectionId} style={styles.section}>
            {sectionId === 'professionalSummary' && (
              <>
                {renderSectionTitle('Professional Summary')}
                <Text style={styles.text}>{resumeData.professionalSummary}</Text>
              </>
            )}

            {sectionId === 'experience' && (
              <>
                {renderSectionTitle('Work Experience')}
                {resumeData.experience.map((exp, index) => (
                  <View key={index} style={{ marginBottom: 5 }}>
                    <View style={styles.row}>
                      <Text style={styles.jobPosition}>{exp.position}</Text>
                      <Text style={styles.text}>
                        {formatDate(exp.startDate)} - {exp.endDate ? formatDate(exp.endDate) : 'Present'}
                      </Text>
                    </View>
                    <Text style={styles.company}>{exp.company}</Text>
                    {renderDescription(exp.description)}
                  </View>
                ))}
              </>
            )}

            {sectionId === 'education' && (
              <>
                {renderSectionTitle('Education')}
                {resumeData.education.map((edu, index) => (
                  <View key={index} style={styles.row}>
                    <View>
                      <Text style={styles.degree}>{edu.degree}</Text>
                      <Text style={styles.fieldOfStudy}>{edu.fieldOfStudy}</Text>
                      <Text style={styles.text}>{edu.institution}</Text>
                    </View>
                    <Text style={styles.text}>{formatDate(edu.graduationDate)}</Text>
                  </View>
                ))}
              </>
            )}

            {sectionId === 'skills' && (
              <>
                {renderSectionTitle('Skills')}
                {renderSkills(resumeData.skills)}
              </>
            )}

            {sectionId === 'projects' && (
              <>
                {renderSectionTitle('Projects')}
                {resumeData.projects.map((project, index) => (
                  <View key={index} style={{ marginBottom: 5 }}>
                    <Text style={[styles.text, styles.bold]}>{project.name}</Text>
                    <Text style={styles.text}>{project.description}</Text>
                  </View>
                ))}
              </>
            )}

            {sectionId === 'certificates' && (
              <>
                {renderSectionTitle('Certifications')}
                {resumeData.certificates.map((cert, index) => (
                  <View key={index} style={styles.row}>
                    <Text style={[styles.text, styles.bold]}>{cert.name}</Text>
                    <Text style={styles.text}>{formatDate(cert.issueDate)}</Text>
                  </View>
                ))}
              </>
            )}

            {sectionId.startsWith('custom-') && (
              <>
                {renderSectionTitle(resumeData.customSections.find(s => s.id === sectionId)?.title || 'Custom Section')}
                {resumeData.customSections.find(s => s.id === sectionId)?.items.map((item, index) => (
                  <View key={index} style={styles.listItem}>
                    <Text style={styles.bullet}>{'\u2022'}</Text>
                    <Text style={[styles.text, { flex: 1 }]}>{item}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        ))}
      </Page>
    </Document>
  )
}

export default PDFResume