import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import toast from 'react-hot-toast';

// FAQ Accordion Item Component
function FAQItem({ question, children, isOpen, onClick }) {
  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        type="button"
        onClick={onClick}
        className="w-full flex justify-between items-center py-4 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg"
      >
        <span className="font-medium text-gray-900 pr-4">{question}</span>
        <span className={`flex-shrink-0 ml-2 text-blue-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-96 pb-4' : 'max-h-0'}`}
      >
        <div className="text-gray-600 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

const SITE_URL = 'https://intelliresume.net';

export default function ScholarshipPage() {
  const currentYear = new Date().getFullYear();
  const deadline = `December 1, ${currentYear}`;

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    school: '',
    programType: '',
    videoLink: '',
    enrollmentProofLink: '',
    consentToFeature: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState('');
  const [recaptchaLoaded, setRecaptchaLoaded] = useState(false);
  const recaptchaRef = useRef(null);
  const [openFAQ, setOpenFAQ] = useState(null);

  // Load reCAPTCHA
  useEffect(() => {
    if (window.grecaptcha) {
      setRecaptchaLoaded(true);
      return;
    }

    const containerId = 'recaptcha-container-' + Date.now();
    recaptchaRef.current = containerId;

    window.onRecaptchaLoad = () => {
      setRecaptchaLoaded(true);
      try {
        window.grecaptcha.ready(() => {
          window.grecaptcha.execute(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY, { action: 'scholarship_form' })
            .then(token => setRecaptchaToken(token))
            .catch(err => console.error('reCAPTCHA error:', err));
        });
      } catch (error) {
        console.error('reCAPTCHA init error:', error);
      }
    };

    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}&onload=onRecaptchaLoad`;
    script.async = true;
    script.defer = true;
    script.id = 'recaptcha-script-scholarship';
    document.head.appendChild(script);

    return () => {
      const scriptEl = document.getElementById('recaptcha-script-scholarship');
      if (scriptEl) document.head.removeChild(scriptEl);
      if (window.onRecaptchaLoad) window.onRecaptchaLoad = undefined;
    };
  }, []);

  // Validation helpers
  const isValidEduEmail = (email) => /^[^\s@]+@[^\s@]+\.edu$/i.test(email);
  const isValidGoogleDriveUrl = (url) => /^https?:\/\/(drive|docs)\.google\.com\//i.test(url);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.email || !formData.school || !formData.programType || !formData.videoLink || !formData.enrollmentProofLink) {
      toast.error('Please fill out all required fields');
      return;
    }

    if (!isValidEduEmail(formData.email)) {
      toast.error('Please use your school email address (.edu)');
      return;
    }

    if (!isValidGoogleDriveUrl(formData.videoLink)) {
      toast.error('Please provide a valid Google Drive link for your video');
      return;
    }

    if (!isValidGoogleDriveUrl(formData.enrollmentProofLink)) {
      toast.error('Please provide a valid Google Drive link for your enrollment proof');
      return;
    }

    if (!formData.consentToFeature) {
      toast.error('You must consent to the Future Nurses Spotlight to apply');
      return;
    }

    // Refresh reCAPTCHA token
    let token = recaptchaToken;
    if (recaptchaLoaded && window.grecaptcha) {
      try {
        token = await window.grecaptcha.execute(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY, { action: 'scholarship_submit' });
        setRecaptchaToken(token);
      } catch (error) {
        toast.error('reCAPTCHA verification failed. Please try again.');
        return;
      }
    } else {
      toast.error('reCAPTCHA not loaded. Please refresh the page.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/scholarship/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          recaptchaToken: token
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSubmitSuccess(true);
        toast.success('Application submitted successfully!');
        setFormData({
          name: '',
          email: '',
          school: '',
          programType: '',
          videoLink: '',
          enrollmentProofLink: '',
          consentToFeature: false
        });
      } else {
        toast.error(data.message || 'Failed to submit application');
      }
    } catch (error) {
      console.error('Submission error:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>$500 Nursing Student Scholarship | IntelliResume Health</title>
        <meta
          name="description"
          content="Apply for the IntelliResume Health Nursing Student Scholarship. $500 award for nursing students enrolled in ADN/BSN/ABSN/MSN-direct entry programs. Simple 60-sec video application."
        />
        <meta
          name="keywords"
          content="nursing scholarship, nursing student scholarship, RN scholarship, BSN scholarship, ADN scholarship, nursing school financial aid, nursing student award, scholarships for nursing students, nursing school scholarship, pre-nursing scholarship, NCLEX scholarship"
        />
        <link rel="canonical" href={`${SITE_URL}/scholarship`} />
        <meta property="og:title" content="$500 Nursing Student Scholarship | IntelliResume" />
        <meta property="og:description" content="Apply for the IntelliResume Nursing Student Scholarship. $500 award for nursing students enrolled in accredited programs." />
        <meta property="og:url" content={`${SITE_URL}/scholarship`} />
        <meta property="og:type" content="website" />
      </Head>

      <main className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">
              IntelliResume Health Nursing Student Scholarship
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-6">
              $500 Annual Award
            </p>
            <p className="text-lg text-blue-100">
              Supporting the next generation of nurses
            </p>
          </div>
        </section>

        {/* Main Content */}
        <section className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-white rounded-lg shadow-md p-8 md:p-12">

            {/* About the Scholarship */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">About the Scholarship</h2>
              <p className="text-gray-700 leading-relaxed">
                IntelliResume Health is committed to supporting nursing students as they pursue their education
                and prepare to join the healthcare workforce. We understand the financial challenges
                of nursing school, and we want to help ease that burden for at least one student each year.
              </p>
              <p className="text-gray-700 leading-relaxed mt-4">
                The IntelliResume Nursing Student Scholarship awards <strong>$500</strong> annually
                to one nursing student who demonstrates passion for the nursing profession.
              </p>
            </div>

            {/* Eligibility */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Eligibility Requirements</h2>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Accepted into or currently enrolled in an accredited nursing program in the United States</li>
                <li>Pursuing a degree that leads to RN licensure (NCLEX eligibility): ADN, BSN, or Direct Entry MSN</li>
                <li>Have not yet graduated from your nursing program</li>
                <li>In good academic standing with your institution</li>
                <li>Must have a valid school email address (.edu)</li>
              </ul>
            </div>

            {/* How to Apply */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">How to Apply</h2>
              <p className="text-gray-700 mb-4">
                We&apos;ve made applying simple. No lengthy essays - just a quick video telling us your story.
              </p>

              <div className="bg-blue-50 rounded-lg p-6 mb-6">
                <h3 className="font-bold text-gray-900 mb-3">1. Record a 60-Second Video</h3>
                <p className="text-gray-700 mb-3">
                  Tell us why you chose nursing. That&apos;s it. Use your phone, keep it casual, and just be yourself.
                </p>
                <p className="text-gray-600 text-sm">
                  <strong>Prompt ideas:</strong> What moment made you want to become a nurse? What excites you most about your future nursing career? Why does nursing matter to you?
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h3 className="font-bold text-gray-900 mb-3">2. Upload to Google Drive</h3>
                <p className="text-gray-700 mb-2">
                  Upload your video and enrollment proof (unofficial transcript or enrollment letter) to Google Drive:
                </p>
                <ol className="list-decimal list-inside text-gray-600 ml-2 space-y-1">
                  <li>Go to <a href="https://drive.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">drive.google.com</a></li>
                  <li>Upload your files</li>
                  <li>Right-click each file → Share → &quot;Anyone with the link&quot;</li>
                  <li>Copy the links and paste them in the form below</li>
                </ol>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h3 className="font-bold text-gray-900 mb-3">3. Complete the Application Form</h3>
                <p className="text-gray-700">
                  Fill out the form below with your information, video link, and enrollment proof link.
                </p>
              </div>
            </div>

            {/* Deadline */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Deadline &amp; Selection</h2>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                <p className="text-blue-800 font-semibold">
                  Application Deadline: {deadline}
                </p>
              </div>
              <p className="text-gray-700 mb-4">
                The winner will be selected based on authenticity, passion, and how well your story comes through.
                We&apos;re not looking for perfect production - we want to hear the real you.
              </p>
              <p className="text-gray-700">
                The scholarship recipient will be notified by email within 30 days of the deadline.
                The award will be sent directly to the winner via check or electronic transfer.
              </p>
            </div>

            {/* Application Form */}
            <div className="mb-10" id="apply">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Apply Now</h2>

              {submitSuccess ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                  <div className="text-green-600 text-5xl mb-4">✓</div>
                  <h3 className="text-xl font-bold text-green-800 mb-2">Application Submitted!</h3>
                  <p className="text-green-700">
                    Thank you for applying. We&apos;ve received your application and will review it carefully.
                    If selected, you&apos;ll hear from us by email within 30 days of the deadline.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Personal Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Jane Doe"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        School Email (.edu) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="jdoe@university.edu"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">Must be your school email address</p>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="school" className="block text-sm font-medium text-gray-700 mb-1">
                      School Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="school"
                      name="school"
                      value={formData.school}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="University of Example"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="programType" className="block text-sm font-medium text-gray-700 mb-1">
                      Program Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="programType"
                      name="programType"
                      value={formData.programType}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select your program</option>
                      <option value="ADN">ADN (Associate Degree in Nursing)</option>
                      <option value="BSN">BSN (Bachelor of Science in Nursing)</option>
                      <option value="Accelerated BSN">Accelerated BSN (Second-degree)</option>
                      <option value="Direct Entry MSN">Direct Entry MSN</option>
                    </select>
                  </div>

                  {/* Submission Links */}
                  <div>
                    <label htmlFor="videoLink" className="block text-sm font-medium text-gray-700 mb-1">
                      Video Link (Google Drive) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      id="videoLink"
                      name="videoLink"
                      value={formData.videoLink}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://drive.google.com/file/d/..."
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">60-second video: &quot;Why I chose nursing&quot;</p>
                  </div>

                  <div>
                    <label htmlFor="enrollmentProofLink" className="block text-sm font-medium text-gray-700 mb-1">
                      Enrollment Proof Link (Google Drive) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      id="enrollmentProofLink"
                      name="enrollmentProofLink"
                      value={formData.enrollmentProofLink}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://drive.google.com/file/d/..."
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Unofficial transcript or enrollment verification letter</p>
                  </div>

                  {/* Future Nurses Spotlight Consent */}
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-100">
                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        id="consentToFeature"
                        name="consentToFeature"
                        checked={formData.consentToFeature}
                        onChange={handleChange}
                        className="mt-1 h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        required
                      />
                      <label htmlFor="consentToFeature" className="ml-3">
                        <span className="font-bold text-gray-900">Feature my story!</span>
                        <p className="text-gray-700 text-sm mt-1">
                          I grant IntelliResume Health permission to download, share, and publish my video submission on their website and socials as part of the <strong>Future Nurses Spotlight</strong>, regardless of scholarship outcome.
                        </p>
                        <p className="text-gray-500 text-xs mt-2 italic">
                          This consent is required to apply. We believe every nursing student&apos;s story deserves to be celebrated.
                        </p>
                      </label>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-colors ${
                      isSubmitting
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Application'}
                  </button>

                  <p className="text-xs text-gray-500 text-center">
                    This site is protected by reCAPTCHA and the Google{' '}
                    <a href="https://policies.google.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Privacy Policy</a> and{' '}
                    <a href="https://policies.google.com/terms" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Terms of Service</a> apply.
                  </p>
                </form>
              )}
            </div>

            {/* FAQ */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
              <div className="bg-gray-50 rounded-xl p-6">
                <FAQItem
                  question="What if I don't have a .edu email address?"
                  isOpen={openFAQ === 0}
                  onClick={() => setOpenFAQ(openFAQ === 0 ? null : 0)}
                >
                  Some nursing programs use different email domains. If you don&apos;t have a .edu email but are enrolled in an accredited nursing program, please{' '}
                  <Link href="/contact" className="text-blue-600 hover:underline">reach out through our contact page</Link>{' '}
                  and we&apos;ll work with you on verification.
                </FAQItem>

                <FAQItem
                  question="What should my video include?"
                  isOpen={openFAQ === 1}
                  onClick={() => setOpenFAQ(openFAQ === 1 ? null : 1)}
                >
                  Just 60 seconds about why you chose nursing. It can be filmed on your phone - we&apos;re not judging production quality. We want to hear your authentic story and passion for nursing.
                </FAQItem>

                <FAQItem
                  question="What nursing programs are eligible?"
                  isOpen={openFAQ === 2}
                  onClick={() => setOpenFAQ(openFAQ === 2 ? null : 2)}
                >
                  Programs that lead to RN licensure (NCLEX eligibility): ADN (Associate Degree in Nursing), BSN (Bachelor of Science in Nursing), Accelerated BSN (second-degree programs), and Direct Entry MSN programs. LPN/LVN and non-degree certificate programs are not eligible.
                </FAQItem>

                <FAQItem
                  question="Can I apply if I've been accepted but haven't started yet?"
                  isOpen={openFAQ === 3}
                  onClick={() => setOpenFAQ(openFAQ === 3 ? null : 3)}
                >
                  Yes! You&apos;re eligible if you&apos;ve been accepted into an accredited nursing program and have not yet graduated. Just provide your acceptance letter as your enrollment proof.
                </FAQItem>

                <FAQItem
                  question="How is the winner selected?"
                  isOpen={openFAQ === 4}
                  onClick={() => setOpenFAQ(openFAQ === 4 ? null : 4)}
                >
                  We review all submissions and select based on authenticity, passion for nursing, and how well your story comes through. There&apos;s no &quot;perfect&quot; answer - we want to see the real you.
                </FAQItem>

                <FAQItem
                  question="What is the Future Nurses Spotlight?"
                  isOpen={openFAQ === 5}
                  onClick={() => setOpenFAQ(openFAQ === 5 ? null : 5)}
                >
                  It&apos;s our initiative to celebrate nursing students and share their inspiring stories. By consenting, you allow us to feature your video on our website and social media, helping inspire others considering the nursing profession. All applicants are eligible for the Spotlight, not just the scholarship winner.
                </FAQItem>

                <FAQItem
                  question="When will I hear back?"
                  isOpen={openFAQ === 6}
                  onClick={() => setOpenFAQ(openFAQ === 6 ? null : 6)}
                >
                  The scholarship recipient will be notified via email within 30 days after the December 1st deadline. All applicants will receive a follow-up email about their application status.
                </FAQItem>
              </div>
            </div>

            {/* About IntelliResume */}
            <div className="border-t pt-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">About IntelliResume Health</h2>
              <p className="text-gray-700 leading-relaxed">
                IntelliResume Health is a nursing job board dedicated to connecting nurses with their next
                career opportunity. We aggregate nursing positions from top healthcare employers
                across the United States, making it easier for nurses to find jobs that match their
                specialty, location, and career goals.
              </p>
              <p className="text-gray-700 leading-relaxed mt-4">
                <Link href="/jobs/nursing" className="text-blue-600 hover:text-blue-800">
                  Browse nursing jobs →
                </Link>
              </p>
            </div>

          </div>
        </section>

        {/* Contact */}
        <section className="max-w-4xl mx-auto px-4 pb-12">
          <div className="text-center text-gray-600">
            <p>
              Questions?{' '}
              <Link
                href="/contact"
                className="text-blue-600 hover:text-blue-800"
              >
                Contact us
              </Link>
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
