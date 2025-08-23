import { useState } from 'react';
import { 
  Shield, 
  TrendingDown, 
  Clock, 
  Users, 
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Building,
  ArrowRight,
  Play,
  X,
  Menu,
  Phone,
  Mail
} from 'lucide-react';
import ROICalculator from '../components/ROICalculator';
import CaseStudies from '../components/CaseStudies';
import IntegrationPartners from '../components/IntegrationPartners';
import PricingSection from '../components/PricingSection';
import SolutionShowcase from '../components/SolutionShowcase';
import { UserMenu } from '../components/UserMenu';
import { useClerkAuth } from '../lib/clerk/ClerkProvider';
import { trackConversion, trackFunnel } from '../lib/analytics/ga4';

const HomePage = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isSignedIn } = useClerkAuth();
  
  const handleBookDemo = () => {
    trackConversion.demoBookingStarted();
    trackFunnel.conversionAction('demo');
    // Add actual demo booking logic here
    alert('Demo booking feature coming soon!');
  };
  
  const handleLoginClick = (source: string) => {
    trackConversion.loginClicked(source);
    trackFunnel.conversionAction('login');
    window.location.href = '/operations';
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Top Banner - Compliance Trust Signal */}
      <div className="bg-blue-900 text-white py-2">
        <div className="max-w-7xl mx-auto px-4 flex justify-center items-center gap-6 text-sm">
          <span className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            SafeWork NSW Compliant
          </span>
          <span className="hidden sm:flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            SIRA Integrated
          </span>
          <span className="hidden md:flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            icare Connected
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">Mend</span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#problem" className="text-gray-700 hover:text-blue-600 font-medium">The Problem</a>
              <a href="#solution" className="text-gray-700 hover:text-blue-600 font-medium">Solution</a>
              <a href="#roi" className="text-gray-700 hover:text-blue-600 font-medium">ROI Calculator</a>
              <a href="#integrations" className="text-gray-700 hover:text-blue-600 font-medium">Integrations</a>
              <a href="#pricing" className="text-gray-700 hover:text-blue-600 font-medium">Pricing</a>
              {isSignedIn ? (
                <UserMenu />
              ) : (
                <>
                  <button 
                    onClick={() => handleLoginClick('header')}
                    className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-medium"
                  >
                    Login
                  </button>
                  <button 
                    onClick={handleBookDemo}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Book Demo
                  </button>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t">
              <div className="flex flex-col gap-3">
                <a href="#problem" className="text-gray-700 py-2">The Problem</a>
                <a href="#solution" className="text-gray-700 py-2">Solution</a>
                <a href="#roi" className="text-gray-700 py-2">ROI Calculator</a>
                <a href="#integrations" className="text-gray-700 py-2">Integrations</a>
                <a href="#pricing" className="text-gray-700 py-2">Pricing</a>
                {isSignedIn ? (
                  <div className="py-2">
                    <UserMenu />
                  </div>
                ) : (
                  <>
                    <button 
                      onClick={() => handleLoginClick('mobile_menu')}
                      className="text-blue-600 py-2 font-medium text-left"
                    >
                      Login
                    </button>
                    <button 
                      onClick={handleBookDemo}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg"
                    >
                      Book Demo
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-gray-50 to-white py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-full text-sm font-medium mb-6">
              <AlertTriangle className="w-4 h-4" />
              NSW Construction Crisis: $28.6B Annual Impact from Workplace Injuries
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Stop Losing 25% of Your Workforce to 
              <span className="text-blue-600"> Paperwork</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8">
              While your team drowns in compliance documentation, premiums increase 8% annually, 
              and return-to-work rates plummet to 84%. There's a better way.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <button className="px-8 py-4 bg-blue-600 text-white rounded-lg text-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2">
                See How BuildCorp Saved $420K
                <ArrowRight className="w-5 h-5" />
              </button>
              <button className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-lg text-lg font-medium hover:bg-gray-50 flex items-center justify-center gap-2">
                <Play className="w-5 h-5" />
                Watch 2-Min Demo
              </button>
            </div>

            {/* Trust Signals */}
            <div className="flex justify-center items-center gap-8 text-gray-500 text-sm">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                <span>47 Construction Companies</span>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <Users className="w-5 h-5" />
                <span>12,000+ Workers Protected</span>
              </div>
              <div className="hidden md:flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                <span>$8.3M Premiums Saved</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section id="problem" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              The Hidden Costs Destroying Your Bottom Line
            </h2>
            <p className="text-xl text-gray-600">
              Every minute spent on admin is a minute not building. Here's what it's really costing you:
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-red-50 rounded-xl p-8 border border-red-200">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">10.5 Hours/Week</h3>
              <p className="text-gray-600 mb-4">
                Lost per manager on fragmented systems and paper processes
              </p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">•</span>
                  <span>6 different claim providers to coordinate</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">•</span>
                  <span>18 SWMS categories to manage</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">•</span>
                  <span>Multiple agencies with different deadlines</span>
                </li>
              </ul>
            </div>

            <div className="bg-amber-50 rounded-xl p-8 border border-amber-200">
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
                <TrendingDown className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">84% RTW Rate</h3>
              <p className="text-gray-600 mb-4">
                Down from 96% in 2016, costing millions in extended claims
              </p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span>8.5 weeks average time lost</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span>42% perceive duties too demanding</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span>6-week medical approval delays</span>
                </li>
              </ul>
            </div>

            <div className="bg-purple-50 rounded-xl p-8 border border-purple-200">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">+600% Premiums</h3>
              <p className="text-gray-600 mb-4">
                Poor performers face catastrophic premium increases
              </p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-1">•</span>
                  <span>3-year impact from single incident</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-1">•</span>
                  <span>15.49% rates for high-risk work</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-1">•</span>
                  <span>Hidden subcontractor liabilities</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <SolutionShowcase />

      {/* ROI Calculator Section */}
      <section id="roi" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Calculate Your Savings
            </h2>
            <p className="text-xl text-gray-600">
              See how much Mend can save your construction business
            </p>
          </div>
          <ROICalculator />
        </div>
      </section>

      {/* Case Studies */}
      <CaseStudies />

      {/* Integration Partners */}
      <IntegrationPartners />

      {/* Pricing Section */}
      <PricingSection />

      {/* Final CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Save $475,000 Per Year?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join 47 NSW construction companies already transforming their injury management
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-4 bg-white text-blue-600 rounded-lg text-lg font-medium hover:bg-blue-50 flex items-center justify-center gap-2">
              Book Your Demo Today
              <ArrowRight className="w-5 h-5" />
            </button>
            <button className="px-8 py-4 border-2 border-white text-white rounded-lg text-lg font-medium hover:bg-blue-800">
              Download ROI Calculator
            </button>
          </div>
          <div className="mt-8">
            <a 
              href="/operations" 
              className="text-blue-200 hover:text-white underline text-sm"
            >
              Already a customer? Access your operations platform →
            </a>
          </div>
          <p className="text-blue-100 mt-4 text-sm">
            No credit card required • 30-day free trial • Implementation in 2 weeks
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-8 h-8 text-blue-500" />
                <span className="text-xl font-bold text-white">Mend</span>
              </div>
              <p className="text-sm">
                The injury management platform built for NSW construction
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#solution" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#integrations" className="hover:text-white transition-colors">Integrations</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#roi" className="hover:text-white transition-colors">ROI Calculator</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Platform Access</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="/operations" className="hover:text-white transition-colors">Operations Dashboard</a></li>
                <li><a href="/operations" className="hover:text-white transition-colors">Incident Reporting</a></li>
                <li><a href="/operations" className="hover:text-white transition-colors">Analytics & Reports</a></li>
                <li><a href="/operations" className="hover:text-white transition-colors">User Management</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Contact</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>1300 MEND AU</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span>sales@mend.com.au</span>
                </li>
                <li className="flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  <span>Sydney, NSW</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm">© 2024 Mend Services. All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0 text-sm">
              <a href="#" className="hover:text-white">Privacy Policy</a>
              <a href="#" className="hover:text-white">Terms of Service</a>
              <a href="#" className="hover:text-white">Security</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;