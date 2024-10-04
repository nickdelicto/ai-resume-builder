import Link from 'next/link'
import { Button } from "./ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./ui/card"
import { CheckCircle, FileText, Users, BarChart, ArrowRight, X } from 'lucide-react'
import { VideoEmbed } from './VideoEmbed'

export function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white to-purple-50">
      <nav className="flex justify-between items-center p-4 bg-white shadow-sm">
        <div className="flex items-center space-x-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6 text-purple-600"
          >
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
          <span className="text-xl font-bold text-purple-600">IntelliResume</span>
        </div>
        <div className="space-x-4">
          <Link href="/pricing" className="text-gray-600 hover:text-purple-600">
            Pricing
          </Link>
          <Link href="/login" className="text-gray-600 hover:text-purple-600">
            Login
          </Link>
          <Button className="bg-purple-600 hover:bg-purple-700">Sign Up</Button>
        </div>
      </nav>

      <main className="flex-grow">
        <section className="relative bg-gradient-to-b from-purple-50 to-white py-20 overflow-hidden">
          <div className="container mx-auto px-4">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
              <div className="w-full lg:w-1/2 text-center lg:text-left">
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-500">
                  Create Your Perfect Resume in Minutes
                </h1>
                <p className="text-xl mb-8 text-gray-600 max-w-lg mx-auto lg:mx-0">
                  AI-powered resume builder for job seekers who want to stand out and land their dream jobs faster.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                  <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-full text-lg font-semibold transition-all duration-300 ease-in-out transform hover:scale-105">
                    Start Building for Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <p className="text-sm text-gray-500">No credit card required</p>
                </div>
              </div>
              <div className="w-full lg:w-1/2 relative">
                <VideoEmbed videoId="YOUR_VIDEO_ID_HERE" className="w-full max-w-3xl mx-auto"/>
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-yellow-400 rounded-full opacity-50 animate-blob"></div>
                <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-purple-400 rounded-full opacity-50 animate-blob animation-delay-2000"></div>
              </div>
            </div>
          </div>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-400 via-blue-500 to-purple-400"></div>
        </section>

        <section className="py-16">
          <div className="container mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">Old Way vs IntelliResume</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="bg-white shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl text-gray-700">Old Way</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-lg list-disc pl-5 space-y-2 text-gray-600">
                    <li>Time-consuming manual formatting</li>
                    <li>Struggle with writer's block</li>
                    <li>Generic, one-size-fits-all resumes</li>
                  </ul>
                </CardContent>
              </Card>
              <Card className="bg-purple-100 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl text-purple-700">IntelliResume Way</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-lg list-disc pl-5 space-y-2 text-purple-700">
                    <li>AI-powered instant formatting</li>
                    <li>Smart suggestions for content</li>
                    <li>Tailored resumes for each job application</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-16 bg-white">
          <div className="container mx-auto text-center">
            <h2 className="text-3xl font-bold mb-12 text-gray-800">Key Benefits</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { title: 'Time-Saving', description: 'Create a professional resume in minutes, not hours', icon: <CheckCircle className="h-8 w-8 text-green-500" /> },
                { title: 'AI-Powered', description: 'Get smart suggestions tailored to your experience and the job', icon: <FileText className="h-8 w-8 text-blue-500" /> },
                { title: 'ATS-Friendly', description: 'Ensure your resume passes Applicant Tracking Systems', icon: <BarChart className="h-8 w-8 text-purple-500" /> },
              ].map((benefit, index) => (
                <Card key={index} className="bg-white shadow-lg">
                  <CardHeader>
                    <div className="flex justify-center mb-4">{benefit.icon}</div>
                    <CardTitle className="text-xl text-gray-700">{benefit.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg text-gray-600">{benefit.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto text-center">
            <h2 className="text-3xl font-bold mb-12 text-gray-800">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { step: 1, title: 'Input Your Info', description: 'Enter your work history, skills, and education' },
                { step: 2, title: 'AI Enhancement', description: 'Our AI suggests improvements and tailors your content' },
                { step: 3, title: 'Download & Apply', description: 'Get your polished resume and start applying with confidence' },
              ].map((step, index) => (
                <Card key={index} className="bg-white shadow-lg">
                  <CardHeader>
                    <div className="w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                      {step.step}
                    </div>
                    <CardTitle className="text-xl text-gray-700">{step.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg text-gray-600">{step.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 bg-purple-100">
          <div className="container mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6 text-purple-800">No Greedy Subscriptions</h2>
            <p className="text-xl mb-4 text-purple-700">
              We believe in fair pricing. Pay only for what you need, when you need it.
            </p>
            <p className="text-lg text-purple-600">
              Our 7-day access plan gives you full control without the worry of recurring charges.
            </p>
          </div>
        </section>

        <section className="py-16 bg-white">
          <div className="container mx-auto text-center">
            <h2 className="text-3xl font-bold mb-12 text-gray-800">Choose Your Plan</h2>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <Card className="bg-white shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl text-gray-700">Free Plan</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold mb-4 text-purple-600">$0</p>
                  <ul className="space-y-2 text-gray-600">
                    <li className="flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                      Create and edit unlimited resumes
                    </li>
                    <li className="flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                      Save one resume
                    </li>
                    <li className="flex items-center justify-center text-gray-400">
                      <X className="h-5 w-5 text-red-500 mr-2" />
                      Export resumes
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="w-full bg-gray-200 text-gray-700 hover:bg-gray-300">Continue with Free Plan</Button>
                </CardFooter>
              </Card>
              <Card className="bg-purple-50 shadow-lg border-2 border-purple-500">
                <CardHeader>
                  <CardTitle className="text-2xl text-purple-700">Premium Plan</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold mb-4 text-purple-600">$9.99</p>
                  <p className="text-lg font-semibold mb-4 text-purple-700">7 Days Full Access</p>
                  <ul className="space-y-2 text-gray-600">
                    <li className="flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                      Create and edit unlimited resumes
                    </li>
                    <li className="flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                      Save up to 10 resumes
                    </li>
                    <li className="flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                      Export resumes in ATS-friendly format
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="w-full bg-purple-600 hover:bg-purple-700">Get 7-Day Access</Button>
                </CardFooter>
              </Card>
            </div>
            <p className="mt-8 text-lg text-gray-600">
              No auto-renewals. No hidden fees. Just 7 days of full access to create your perfect resume.
            </p>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto text-center">
            <h2 className="text-3xl font-bold mb-12 text-gray-800">Frequently Asked Questions</h2>
            <div className="grid md:grid-cols-2 gap-8">
              {[
                { question: 'Is my data secure?', answer: 'Yes, we use industry-standard encryption to protect your information.' },
                { question: 'How does the 7-day access work?', answer: 'You get full access to all premium features for 7 days. After that, your account reverts to the free plan with no auto-renewal or hidden charges.' },
                { question: 'Do you offer refunds?', answer: 'We offer a 100% satisfaction guarantee. If you are not happy, contact us within the 7-day period for a full refund.' },
                { question: 'How does the AI work?', answer: 'Our AI analyzes your input and job descriptions to suggest optimal content and formatting.' },
              ].map((faq, index) => (
                <Card key={index} className="bg-white shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-xl text-gray-700">{faq.question}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">{faq.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-purple-600 text-white text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Build Your Perfect Resume?</h2>
          <p className="text-xl mb-8">Join thousands of job seekers who have landed their dream jobs with IntelliResume</p>
          <Button size="lg" variant="secondary" className="text-lg px-8 bg-white text-purple-600 hover:bg-gray-100">
            Get Started Now
          </Button>
        </section>

        <section className="py-16 bg-white">
          <div className="container mx-auto text-center">
            <h2 className="text-3xl font-bold mb-8 text-gray-800">What Our Users Are Saying</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { name: 'James', role: 'Software Engineer', comment: "IntelliResume made crafting my resume a breeze. The AI suggestions were spot-on!" },
                { name: 'Emily', role: 'Marketing Specialist', comment: "I love how IntelliResume tailors my resume for each job application. It's a game-changer!" },
                { name: 'Michael', role: 'Recent Graduate', comment: "As a new grad, IntelliResume helped me create a professional resume that stands out." },
              ].map((testimonial, index) => (
                <Card key={index} className="bg-white shadow-lg">
                  <CardContent className="pt-6">
                    <div className="w-16 h-16 bg-purple-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <Users className="h-8 w-8 text-purple-600" />
                    </div>
                    <p className="text-gray-600 mb-4">"{testimonial.comment}"</p>
                    <p className="font-bold text-gray-700">{testimonial.name}</p>
                    <p className="text-sm text-gray-500">{testimonial.role}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-gray-100 py-8">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="text-sm text-gray-600 mb-4 md:mb-0">
            © 2024 IntelliResume. All rights reserved.
          </div>
          <div className="flex space-x-4">
            <Link href="/privacy" className="text-sm text-gray-600 hover:text-purple-600">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-sm text-gray-600 hover:text-purple-600">
              Terms of Service
            </Link>
            <Link href="/contact" className="text-sm text-gray-600 hover:text-purple-600">
              Contact Us
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

// Add these styles to your global CSS file
const globalStyles = `
@keyframes blob {
  0% {
    transform: translate(0px, 0px) scale(1);
  }
  33% {
    transform: translate(30px, -50px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
  100% {
    transform: translate(0px, 0px) scale(1);
  }
}

.animate-blob {
  animation: blob 7s infinite;
}

.animation-delay-2000 {
  animation-delay: 2s;
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: .7;
  }
}
`