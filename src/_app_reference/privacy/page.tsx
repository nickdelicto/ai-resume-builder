import React from 'react'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | IntelliResume',
  description: 'Privacy Policy for IntelliResume - AI-powered resume builder',
}

export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      
      <p className="mb-4">Effective Date: October 22, 2024</p>

      <p className="mb-4">At IntelliResume.net (&quot;IntelliResume&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), we are committed to protecting your personal information and respecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services (collectively, the &quot;Services&quot;). By accessing or using our Services, you agree to this Privacy Policy. If you don&apos;t agree with the terms of this Privacy Policy, please don&apos;t access the Services.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-4">1. Information We Collect</h2>
      
      <h3 className="text-xl font-semibold mt-4 mb-2">1.1 Personal Information</h3>
      <p className="mb-4">We may collect the following personal information that you voluntarily provide to us when you register for an account, use our Services, or communicate with us:</p>
      <ul className="list-disc pl-6 mb-4">
        <li>Contact Information: Name, email address, phone number, and address.</li>
        <li>Professional Information: Employment history, education details, and other resume content necessary for building your resume.</li>
        <li>Other Information: Any additional information you choose to provide.</li>
      </ul>
      <p className="mb-4">We do not collect sensitive personal data such as social security numbers or financial information directly. Payment processing is handled by third-party providers like Stripe, which have their own privacy policies.</p>

      <h3 className="text-xl font-semibold mt-4 mb-2">1.2 Automatically Collected Information</h3>
      <p className="mb-4">When you access the Services, we may automatically collect certain information about your device and usage, including:</p>
      <ul className="list-disc pl-6 mb-4">
        <li>Technical Information: IP address, browser type, device characteristics, operating system, language preferences, and referring URLs.</li>
        <li>Usage Data: Information about how you interact with our Services, such as access times, pages viewed, links clicked, and the pages you visited before navigating to our Services.</li>
        <li>Location Data: Device&apos;s geolocation information.</li>
      </ul>
      <p className="mb-4">This information does not reveal your specific identity but helps us understand user activity and improve our Services.</p>

      <h3 className="text-xl font-semibold mt-4 mb-2">1.3 Cookies and Similar Technologies</h3>
      <p className="mb-4">We use cookies and similar tracking technologies to collect and store information when you use our Services. Cookies are small data files stored on your device. We use cookies for:</p>
      <ul className="list-disc pl-6 mb-4">
        <li>Analytics and Performance: To analyze how you use our Services and to monitor site performance.</li>
        <li>Advertising: To deliver relevant advertisements to you.</li>
      </ul>
      <p className="mb-4">You can control the use of cookies at the individual browser level. Refer to section 11 for more details on managing cookies.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-4">2. How We Use Your Information</h2>
      <p className="mb-4">We use the information we collect for various purposes, including:</p>
      <ul className="list-disc pl-6 mb-4">
        <li>Providing Services: To create and manage your account, generate resumes, and provide the Services you request.</li>
        <li>Improving Services: To understand how users interact with our Services, allowing us to enhance user experience and functionality.</li>
        <li>Communications: To send you updates, newsletters, marketing materials, and respond to your inquiries.</li>
        <li>Analytics and Profiling: To perform data analytics to improve our Services and marketing efforts.</li>
        <li>Legal Compliance: To comply with legal obligations and protect our rights.</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-6 mb-4">3. Disclosure of Your Information</h2>
      <p className="mb-4">We may share your information in the following circumstances:</p>

      <h3 className="text-xl font-semibold mt-4 mb-2">3.1 Service Providers</h3>
      <p className="mb-4">We may share your information with third-party vendors, service providers, contractors, or agents who perform services on our behalf, such as:</p>
      <ul className="list-disc pl-6 mb-4">
        <li>Payment Processors: We use Stripe to process payments. Stripe may collect payment information necessary to complete transactions. Stripe&apos;s Privacy Policy can be found here.</li>
        <li>Email Services: We use Brevo for passwordless login.</li>
        <li>Analytics Providers: We use Google Analytics to collect and analyze usage information.</li>
      </ul>
      <p className="mb-4">These third parties are obligated to maintain the confidentiality of your information and are restricted from using your personal information for any purpose other than providing services to us.</p>

      <h3 className="text-xl font-semibold mt-4 mb-2">3.2 Legal Obligations</h3>
      <p className="mb-4">We may disclose your information if required to do so by law or in response to valid requests by public authorities (e.g., court orders, subpoenas).</p>

      <h2 className="text-2xl font-semibold mt-6 mb-4">4. Third-Party Services</h2>
      <p className="mb-4">Our Services may include links to third-party websites, services, or applications. We do not control these third parties and are not responsible for their privacy practices. We encourage you to review the privacy policies of any third-party sites you interact with.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-4">5. Your Rights and Choices</h2>
      
      <h3 className="text-xl font-semibold mt-4 mb-2">5.1 Access, Update, and Deletion</h3>
      <p className="mb-4">You have the right to access, correct, or delete your personal information. You can do this by:</p>
      <ul className="list-disc pl-6 mb-4">
        <li>Logging into your account and updating your profile information.</li>
        <li>Deleting resumes you have created, which will remove the associated data.</li>
        <li>Contacting us through our <a href="/contact" className="text-blue-600 hover:underline">contact page</a> for assistance.</li>
      </ul>

      <h3 className="text-xl font-semibold mt-4 mb-2">5.2 Opt-Out of Communications</h3>
      <p className="mb-4">You may opt-out of receiving marketing communications from us by following the unsubscribe instructions in any email you receive or by contacting us directly.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-4">6. Data Retention</h2>
      <p className="mb-4">We retain your personal information only for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law. When you delete your resumes or close your account, we will delete or anonymize your personal information, or if this is not possible (for example, because the information has been stored in backup archives), then we will securely store your personal information and isolate it from further processing until deletion is possible.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-4">7. Data Security</h2>
      <p className="mb-4">We implement reasonable security measures to protect your personal information, including:</p>
      <ul className="list-disc pl-6 mb-4">
        <li>Encryption: SSL encryption is used to secure data transmitted between your browser and our servers.</li>
        <li>Access Controls: Restricted access to personal information to authorized personnel only.</li>
        <li>Secure Servers: Hosting on secure servers provided by Hetzner.</li>
      </ul>
      <p className="mb-4">Despite these measures, please be aware that no security measures are perfect or impenetrable, and we cannot guarantee absolute security.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-4">8. Data Breach Notification</h2>
      <p className="mb-4">In the event of a data breach that compromises your personal information, we will promptly notify you and any applicable authorities as required by law. We will take all reasonable measures to mitigate any potential harm.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-4">9. Compliance with Laws and Regulations</h2>
      <p className="mb-4">We are committed to complying with all applicable data protection laws and regulations, including:</p>
      <ul className="list-disc pl-6 mb-4">
        <li>General Data Protection Regulation (GDPR): For users in the European Union, you have specific rights regarding your personal data.</li>
        <li>California Consumer Privacy Act (CCPA): For California residents, you have specific rights under the CCPA.</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-6 mb-4">10. Children&apos;s Privacy</h2>
      <p className="mb-4">Our Services are not intended for individuals under the age of 16. We do not knowingly collect personal information from children under 16 without parental consent. If we become aware that we have collected personal information from a child under 16 without verification of parental consent, we will take steps to remove that information.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-4">11. Cookies and Tracking Technologies</h2>
      <p className="mb-4">We use cookies and similar technologies for various purposes:</p>
      <ul className="list-disc pl-6 mb-4">
        <li>Essential Cookies: Necessary for the operation of our Services.</li>
        <li>Analytics Cookies: Help us understand how our Services are being used.</li>
        <li>Advertising Cookies: Used to make advertising messages more relevant to you.</li>
      </ul>
      <p className="mb-4">Managing Cookies:</p>
      <p className="mb-4">You can manage your cookie preferences by adjusting your browser settings to refuse cookies or to alert you when cookies are being sent. Please note that some parts of our Services may become inaccessible or not function properly if you disable cookies.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-4">12. Changes to This Privacy Policy</h2>
      <p className="mb-4">We may update this Privacy Policy from time to time. If we make significant changes, we will notify you by email or through a notice on our Services prior to the change becoming effective. Your continued use of the Services after the effective date of the revised Privacy Policy constitutes your acceptance of the terms.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-4">13. Contact Us</h2>
      <p className="mb-4">If you have any questions or concerns about this Privacy Policy or our data practices, please contact us through our <a href="/contact" className="text-blue-600 hover:underline">contact page</a>.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-4">14. Advertising and Marketing</h2>
      <p className="mb-4">We may use your personal information to send you promotional content and advertisements that we believe may be of interest to you. You have the right to opt-out of marketing communications at any time.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-4">15. Automated Decision-Making and Profiling</h2>
      <p className="mb-4">We do not engage in automated decision-making or profiling that produces legal effects concerning you or similarly significantly affects you.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-4">16. Legal Bases for Processing</h2>
      <p className="mb-4">We process your personal information based on the following legal grounds:</p>
      <ul className="list-disc pl-6 mb-4">
        <li>Consent: By providing your personal information, you consent to its processing as described in this Privacy Policy.</li>
        <li>Contractual Necessity: Processing is necessary to perform the contract between you and IntelliResume, such as providing the Services.</li>
        <li>Legitimate Interests: We may process your information for our legitimate interests, such as improving our Services and marketing.</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-6 mb-4">17. Scope and Application</h2>
      <p className="mb-4">This Privacy Policy applies to all users of our Services, regardless of their location. However, users in certain jurisdictions may have additional rights under local laws.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-4">18. Data Breach Response Plan</h2>
      <p className="mb-4">In the event of a data breach:</p>
      <ul className="list-disc pl-6 mb-4">
        <li>Identification and Containment: We will promptly identify the breach and take steps to contain it.</li>
        <li>Assessment: Evaluate the risks associated with the breach.</li>
        <li>Notification: Inform affected users and relevant authorities as required by law.</li>
        <li>Review: Analyze the cause of the breach and update our security measures to prevent future incidents.</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-6 mb-4">19. Miscellaneous</h2>
      <p className="mb-4">We may provide additional disclosures relating to the processing of personal information specific to certain regions or as required by applicable laws.</p>
      <p className="mb-4">Your use of IntelliResume&apos;s Services signifies your acceptance of this Privacy Policy. Please ensure you read it carefully and contact us if you have any questions.</p>

      <p className="mt-8 text-sm text-gray-600">Last Updated: October 22, 2024</p>
    </div>
  )
}