import ResumeBuilder from './components/resume-builder'

export default function Home() {
  return (
    <main className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">IntelliResume Builder</h1>
      <ResumeBuilder />
    </main>
  )
}