import Link from 'next/link';

/**
 * Reusable Calculator CTA Banner for Salary Stats Pages
 * Displays a conversion-focused banner promoting the RN Salary Calculator
 */
export default function SalaryCalculatorBanner({ location }) {
  return (
    <div className="my-8">
      <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-2xl p-6 md:p-8 text-white relative overflow-hidden">
        {/* Decorative Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/3 translate-y-1/3"></div>
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Left Side: Content */}
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-3">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              
              {/* RN Salary Calculator Badge - LEFT */}
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-white/95 text-blue-700 text-sm font-bold rounded-lg uppercase shadow-md border border-blue-200">
                
                RN Salary Calculator
              </span>
              
              {/* FREE TOOL Badge - RIGHT */}
              <span className="inline-block px-4 py-1.5 bg-yellow-400 text-yellow-900 text-sm font-bold rounded-lg uppercase tracking-wide shadow-md">
                Free Tool
              </span>
            </div>
            
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
              How MUCH Should You Be Making?
            </h2>
            
            <p className="text-blue-100 text-base md:text-lg mb-4">
              Get a customized {location} RN salary estimate based on your experience level, specialty, and job type. Compare with state and national averages instantly.
            </p>
            
            <div className="flex flex-wrap gap-2 justify-center md:justify-start text-sm">
              <div className="flex items-center gap-1">
                <svg className="w-5 h-5 text-green-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Takes 10 seconds</span>
              </div>
              <div className="flex items-center gap-1">
                <svg className="w-5 h-5 text-green-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>100% Free</span>
              </div>
              <div className="flex items-center gap-1">
                <svg className="w-5 h-5 text-green-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>No signup required</span>
              </div>
            </div>
          </div>

          {/* Right Side: CTA Button */}
          <div className="flex-shrink-0">
            <Link href="/jobs/nursing/rn-salary-calculator" className="group inline-flex items-center gap-3 bg-white text-blue-600 font-bold text-lg px-8 py-4 rounded-xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200">
              <span>Calculate My RN Pay</span>
              <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            
            <p className="text-center text-blue-100 text-xs mt-2">
              💡 Trusted by RNs
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

