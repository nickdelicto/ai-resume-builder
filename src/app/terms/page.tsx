import React from 'react'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service | IntelliResume',
  description: 'Terms of Service for IntelliResume - AI-powered resume builder',
}

export default function TermsOfService() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
      
      <p className="mb-4">Effective Date: October 23, 2024</p>

      <p className="mb-4">Welcome to IntelliResume.net (&quot;IntelliResume&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;). These Terms of Service (&quot;Terms&quot;) govern your access to and use of our website and services (collectively, the &quot;Services&quot;). By accessing or using our Services, you agree to be bound by these Terms. If you do not agree with any part of these Terms, please do not use our Services.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-4">1. Acceptance of Terms</h2>
      <p className="mb-4">By creating an account or using the Services, you affirm that you are at least 16 years old and are legally capable of entering into binding contracts. If you are using the Services on behalf of an organization, you represent that you have the authority to bind that organization to these Terms.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-4">2. Description of Services</h2>
      <p className="mb-4">IntelliResume provides an AI-powered resume-building platform that assists users in creating professional resumes based on the information they provide. The Services include tools for resume creation, editing, and storage.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-4">3. User Accounts</h2>
      <h3 className="text-xl font-semibold mt-4 mb-2">3.1 Registration</h3>
      <p className="mb-4">To access certain features of our Services, you may be required to create an account. You agree to provide accurate, current, and complete information during registration and to keep this information updated.</p>
      <h3 className="text-xl font-semibold mt-4 mb-2">3.2 Account Security</h3>
      <p className="mb-4">You are responsible for maintaining the confidentiality of your account credentials and are liable for all activities that occur under your account. You agree to notify us immediately of any unauthorized use or security breach.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-4">4. User Conduct</h2>
      <h3 className="text-xl font-semibold mt-4 mb-2">4.1 Acceptable Use</h3>
      <p className="mb-4">You agree to use the Services only for lawful purposes and in accordance with these Terms. You shall not:</p>
      <ul className="list-disc pl-6 mb-4">
        <li>Violate any applicable laws or regulations.</li>
        <li>Infringe on any intellectual property or other rights of any party.</li>
        <li>Transmit any harmful, threatening, defamatory, obscene, or otherwise objectionable content.</li>
        <li>Attempt to gain unauthorized access to any part of the Services or related systems.</li>
      </ul>
      <h3 className="text-xl font-semibold mt-4 mb-2">4.2 Prohibited Activities</h3>
      <p className="mb-4">You shall not:</p>
      <ul className="list-disc pl-6 mb-4">
        <li>Use the Services in any manner that could disable, overburden, or impair the Services.</li>
        <li>Use any robot, spider, or other automatic devices to access the Services for any purpose without our express written permission.</li>
        <li>Introduce any viruses, trojan horses, worms, or other malicious material.</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-6 mb-4">5. Intellectual Property Rights</h2>
      <h3 className="text-xl font-semibold mt-4 mb-2">5.1 Ownership</h3>
      <p className="mb-4">All content, features, and functionality of the Services, including but not limited to text, graphics, logos, and software, are the exclusive property of IntelliResume and are protected by intellectual property laws.</p>
      <h3 className="text-xl font-semibold mt-4 mb-2">5.2 License</h3>
      <p className="mb-4">We grant you a limited, non-exclusive, non-transferable license to use the Services for personal, non-commercial purposes in accordance with these Terms.</p>
      <h3 className="text-xl font-semibold mt-4 mb-2">5.3 User Content</h3>
      <p className="mb-4">By submitting content to the Services (e.g., resume information), you grant us a non-exclusive, royalty-free, worldwide license to use, reproduce, modify, and display such content solely for the purpose of providing the Services.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-4">6. Fees and Payments</h2>
      <h3 className="text-xl font-semibold mt-4 mb-2">6.1 Pricing</h3>
      <p className="mb-4">Some features of the Services may require payment of fees. All fees are described on the Services and are subject to change at our discretion.</p>
      <h3 className="text-xl font-semibold mt-4 mb-2">6.2 Payment Processing</h3>
      <p className="mb-4">Payments are processed through third-party providers like Stripe. By providing payment information, you agree to the terms of our payment processors.</p>
      <h3 className="text-xl font-semibold mt-4 mb-2">6.3 Refunds</h3>
      <p className="mb-4">All fees are non-refundable unless otherwise stated in our refund policy or required by law.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-4">7. Termination</h2>
      <h3 className="text-xl font-semibold mt-4 mb-2">7.1 By You</h3>
      <p className="mb-4">You may terminate your account at any time by following the instructions on the Services or contacting us through our <a href="/contact" className="text-blue-600 hover:underline">contact page</a>.</p>
      <h3 className="text-xl font-semibold mt-4 mb-2">7.2 By Us</h3>
      <p className="mb-4">We reserve the right to suspend or terminate your access to the Services at our sole discretion, without notice, for any reason, including but not limited to violation of these Terms.</p>
      <h3 className="text-xl font-semibold mt-4 mb-2">7.3 Effect of Termination</h3>
      <p className="mb-4">Upon termination, your right to use the Services will immediately cease. All provisions of these Terms that by their nature should survive termination shall survive.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-4">8. Disclaimers and Limitations of Liability</h2>
      <h3 className="text-xl font-semibold mt-4 mb-2">8.1 Disclaimers</h3>
      <ul className="list-disc pl-6 mb-4">
        <li>No Warranty: The Services are provided on an &quot;as-is&quot; and &quot;as-available&quot; basis without warranties of any kind, either express or implied.</li>
        <li>No Guarantee of Results: We do not guarantee that using the Services will result in employment or any specific outcomes.</li>
      </ul>
      <h3 className="text-xl font-semibold mt-4 mb-2">8.2 Limitation of Liability</h3>
      <p className="mb-4">To the fullest extent permitted by law, IntelliResume, its affiliates, and licensors shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of the Services.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-4">9. Indemnification</h2>
      <p className="mb-4">You agree to defend, indemnify, and hold harmless IntelliResume, its affiliates, and their respective directors, officers, employees, and agents from any claims, liabilities, damages, judgments, awards, losses, costs, expenses, or fees arising out of or relating to your violation of these Terms or your use of the Services.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-4">10. Modifications to the Services and Terms</h2>
      <h3 className="text-xl font-semibold mt-4 mb-2">10.1 Changes to Services</h3>
      <p className="mb-4">We reserve the right to modify or discontinue the Services (or any part thereof) at any time, temporarily or permanently, with or without notice.</p>
      <h3 className="text-xl font-semibold mt-4 mb-2">10.2 Changes to Terms</h3>
      <p className="mb-4">We may update these Terms from time to time. If we make material changes, we will notify you by email or through a notice on the Services. Your continued use of the Services after the effective date constitutes your acceptance of the revised Terms.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-4">11. Governing Law and Dispute Resolution</h2>
      <h3 className="text-xl font-semibold mt-4 mb-2">11.1 Governing Law</h3>
      <p className="mb-4">These Terms shall be governed by and construed in accordance with the laws of the State of New York, without regard to its conflict of law principles.</p>
      <h3 className="text-xl font-semibold mt-4 mb-2">11.2 Dispute Resolution</h3>
      <p className="mb-4">Any disputes arising out of or relating to these Terms or the Services shall be resolved through:</p>
      <ul className="list-disc pl-6 mb-4">
        <li>Negotiation: Parties shall attempt to resolve disputes informally.</li>
        <li>Arbitration: If not resolved, disputes shall be settled by binding arbitration under the rules of the American Arbitration Association in accordance with its Commercial Arbitration Rules, with the arbitration held in the State of New York.</li>
        <li>Exception: You and IntelliResume retain the right to seek injunctive or other equitable relief in a court of competent jurisdiction to prevent the actual or threatened infringement of intellectual property rights.</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-6 mb-4">12. Miscellaneous</h2>
      <h3 className="text-xl font-semibold mt-4 mb-2">12.1 Entire Agreement</h3>
      <p className="mb-4">These Terms, along with our Privacy Policy, constitute the entire agreement between you and IntelliResume regarding the Services.</p>
      <h3 className="text-xl font-semibold mt-4 mb-2">12.2 Severability</h3>
      <p className="mb-4">If any provision of these Terms is held to be invalid or unenforceable, such provision shall be modified to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.</p>
      <h3 className="text-xl font-semibold mt-4 mb-2">12.3 Waiver</h3>
      <p className="mb-4">No waiver of any term shall be deemed a further or continuing waiver of such term or any other term.</p>
      <h3 className="text-xl font-semibold mt-4 mb-2">12.4 Assignment</h3>
      <p className="mb-4">You may not assign or transfer your rights or obligations under these Terms without our prior written consent. We may assign our rights and obligations without restriction.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-4">13. Contact Information</h2>
      <p className="mb-4">If you have any questions about these Terms, please contact us through our <a href="/contact" className="text-blue-600 hover:underline">contact page</a>.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-4">14. User Feedback</h2>
      <p className="mb-4">We welcome your feedback, suggestions, or ideas about the Services (&quot;Feedback&quot;). By submitting Feedback, you grant us a non-exclusive, perpetual, irrevocable, royalty-free, worldwide license to use, modify, and incorporate the Feedback into the Services without any obligation to compensate you.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-4">15. Third-Party Links and Content</h2>
      <p className="mb-4">Our Services may contain links to third-party websites or services that are not owned or controlled by IntelliResume. We have no control over and assume no responsibility for the content, privacy policies, or practices of any third-party websites or services.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-4">16. Acceptable Use Policy</h2>
      <p className="mb-4">You agree not to misuse the Services or help anyone else to do so. Misuse includes:</p>
      <ul className="list-disc pl-6 mb-4">
        <li>Attempting to probe, scan, or test the vulnerability of any system or network.</li>
        <li>Violating or bypassing security or authentication measures.</li>
        <li>Accessing, tampering with, or using non-public areas of the Services.</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-6 mb-4">17. Electronic Communications</h2>
      <p className="mb-4">By using the Services, you consent to receive electronic communications from us. These communications may include notices about your account and are part of your relationship with us.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-4">18. Force Majeure</h2>
      <p className="mb-4">We shall not be liable for any failure to perform our obligations where such failure results from any cause beyond our reasonable control, including but not limited to mechanical, electronic, or communications failure.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-4">19. Language</h2>
      <p className="mb-4">These Terms are drafted in English. If they are translated into any other language, the English language version shall prevail.</p>

      <p className="mt-8 mb-4">Your use of IntelliResume&apos;s Services signifies your acceptance of these Terms of Service. Please read them carefully and contact us if you have any questions.</p>

      <p className="text-sm text-gray-600">Last Updated: October 23, 2024</p>
    </div>
  )
}