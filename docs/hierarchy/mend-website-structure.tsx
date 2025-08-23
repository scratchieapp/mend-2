import React, { useState } from 'react';
import { 
  Shield, 
  TrendingDown, 
  Clock, 
  Users, 
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Building,
  BarChart3,
  Smartphone,
  Globe,
  ArrowRight,
  Play,
  X,
  Menu,
  ChevronDown,
  MessageSquare,
  FileText,
  Award,
  Zap,
  Target,
  Link,
  Phone,
  Mail
} from 'lucide-react';

const MendWebsite = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

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
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Book Demo
              </button>
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
                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg">
                  Book Demo
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section - Lead with the Problem */}
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

      {/* Problem Deep Dive */}
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

      {/* Solution Overview */}
      <section id="solution" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              One Platform. Every Stakeholder. Zero Paperwork.
            </h2>
            <p className="text-xl text-gray-600">
              Mend connects your entire injury management ecosystem in real-time
            </p>
          </div>

          {/* Interactive Solution Display */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-12">
            <div className="grid md:grid-cols-2 gap-12">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6">
                  Transform Your Operations
                </h3>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Instant Incident Reporting</h4>
                      <p className="text-gray-600 text-sm mt-1">
                        Mobile-first, offline-capable, multilingual support for 26.9% non-English speakers
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Automated Compliance</h4>
                      <p className="text-gray-600 text-sm mt-1">
                        Never miss a deadline with automated SIRA, SafeWork NSW, and icare submissions
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Real-Time Premium Impact</h4>
                      <p className="text-gray-600 text-sm mt-1">
                        See exactly how each incident affects your premium for the next 3 years
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Subcontractor Management</h4>
                      <p className="text-gray-600 text-sm mt-1">
                        Track insurance, verify compliance, manage liability across contractor chains
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-6">
                <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-sm text-gray-500">Premium Forecast</p>
                      <p className="text-2xl font-bold text-gray-900">$1,495,000</p>
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                      -8.3% saved
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full w-3/4 bg-green-500 rounded-full"></div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="bg-white rounded-lg p-3 flex justify-between items-center">
                    <span className="text-sm text-gray-600">Active Incidents</span>
                    <span className="font-semibold">12</span>
                  </div>
                  <div className="bg-white rounded-lg p-3 flex justify-between items-center">
                    <span className="text-sm text-gray-600">RTW Success Rate</span>
                    <span className="font-semibold text-green-600">94%</span>
                  </div>
                  <div className="bg-white rounded-lg p-3 flex justify-between items-center">
                    <span className="text-sm text-gray-600">Compliance Score</span>
                    <span className="font-semibold">A+</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Key Features Grid */}
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Smartphone className="w-8 h-8 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Mobile-First</h4>
              <p className="text-sm text-gray-600">
                Works offline on any device at remote sites
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Globe className="w-8 h-8 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Multilingual</h4>
              <p className="text-sm text-gray-600">
                Supports CALD workforce (87.5% of claims)
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Link className="w-8 h-8 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Integrated</h4>
              <p className="text-sm text-gray-600">
                Direct connections to icare, SIRA, SafeWork
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Automated</h4>
              <p className="text-sm text-gray-600">
                Eliminate 90% of manual documentation
              </p>
            </div>
          </div>
        </div>
      </section>

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

          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-200">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Your Company Details</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Number of Workers
                      </label>
                      <input 
                        type="number" 
                        defaultValue="250"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Annual Wage Bill
                      </label>
                      <input 
                        type="text" 
                        defaultValue="$25,000,000"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Current Premium Rate
                      </label>
                      <input 
                        type="text" 
                        defaultValue="4.84%"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Projected Annual Savings</h3>
                  <div className="space-y-4">
                    <div className="bg-white rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-600">Premium Reduction</span>
                        <span className="text-2xl font-bold text-green-600">$183,000</span>
                      </div>
                      <div className="text-xs text-gray-500">Through improved RTW and claims management</div>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-600">Admin Time Saved</span>
                        <span className="text-2xl font-bold text-green-600">$247,000</span>
                      </div>
                      <div className="text-xs text-gray-500">10.5 hours/week per manager × 5 managers</div>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-600">Compliance Penalties Avoided</span>
                        <span className="text-2xl font-bold text-green-600">$45,000</span>
                      </div>
                      <div className="text-xs text-gray-500">Automated deadline management</div>
                    </div>
                    <div className="border-t-2 border-blue-300 pt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold">Total Annual Savings</span>
                        <span className="text-3xl font-bold text-blue-600">$475,000</span>
                      </div>
                      <div className="text-sm text-gray-600 mt-2">ROI: 892% | Payback: 6 weeks</div>
                    </div>
                  </div>
                </div>
              </div>

              <button className="w-full mt-8 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
                Get Detailed ROI Report →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Case Studies */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Success Stories from NSW Construction Leaders
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-8 shadow-lg">
              <div className="flex items-center gap-4 mb-6">
                <img 
                  src="/api/placeholder/80/80" 
                  alt="BuildCorp"
                  className="w-20 h-20 rounded-lg bg-gray-200"
                />
                <div>
                  <h4 className="font-semibold text-gray-900">BuildCorp NSW</h4>
                  <p className="text-sm text-gray-500">2,340 workers • 3 major projects</p>
                </div>
              </div>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">RTW Rate Improved</span>
                  <span className="font-semibold text-green-600">84% → 96%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Premium Saved</span>
                  <span className="font-semibold text-green-600">$420,000/yr</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Admin Time Reduced</span>
                  <span className="font-semibold text-green-600">75%</span>
                </div>
              </div>
              <p className="text-gray-600 italic text-sm">
                "Mend transformed our injury management. We went from chaos to complete control in 3 months."
              </p>
              <p className="text-sm font-medium text-gray-900 mt-3">
                - Sarah Chen, Safety Director
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-lg">
              <div className="flex items-center gap-4 mb-6">
                <img 
                  src="/api/placeholder/80/80" 
                  alt="Western Constructions"
                  className="w-20 h-20 rounded-lg bg-gray-200"
                />
                <div>
                  <h4 className="font-semibold text-gray-900">Western Constructions</h4>
                  <p className="text-sm text-gray-500">890 workers • Regional projects</p>
                </div>
              </div>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Incidents Reduced</span>
                  <span className="font-semibold text-green-600">-47%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Compliance Score</span>
                  <span className="font-semibold text-green-600">C → A+</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Claims Processing</span>
                  <span className="font-semibold text-green-600">6 weeks → 5 days</span>
                </div>
              </div>
              <p className="text-gray-600 italic text-sm">
                "The multilingual support alone saved us. 40% of our workforce speaks languages other than English."
              </p>
              <p className="text-sm font-medium text-gray-900 mt-3">
                - Marcus Rodriguez, Operations Manager
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-lg">
              <div className="flex items-center gap-4 mb-6">
                <img 
                  src="/api/placeholder/80/80" 
                  alt="Metro Builders"
                  className="w-20 h-20 rounded-lg bg-gray-200"
                />
                <div>
                  <h4 className="font-semibold text-gray-900">Metro Builders Group</h4>
                  <p className="text-sm text-gray-500">450 workers • 47 subcontractors</p>
                </div>
              </div>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subcontractor Compliance</span>
                  <span className="font-semibold text-green-600">100%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Liability Exposure</span>
                  <span className="font-semibold text-green-600">-$380K</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Audit Preparation</span>
                  <span className="font-semibold text-green-600">2 weeks → 2 hours</span>
                </div>
              </div>
              <p className="text-gray-600 italic text-sm">
                "Managing 47 subcontractors was a nightmare. Now it's automated and we have zero compliance gaps."
              </p>
              <p className="text-sm font-medium text-gray-900 mt-3">
                - David Park, CFO
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Integration Partners */}
      <section id="integrations" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Seamlessly Integrated with Your Existing Systems
            </h2>
            <p className="text-xl text-gray-600">
              Mend connects with the tools and agencies you already use
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { name: 'icare NSW', category: 'Insurance' },
              { name: 'SIRA', category: 'Regulator' },
              { name: 'SafeWork NSW', category: 'Compliance' },
              { name: 'Allianz', category: 'Claims Provider' },
              { name: 'QBE', category: 'Claims Provider' },
              { name: 'GIO', category: 'Claims Provider' },
              { name: 'Xero', category: 'Accounting' },
              { name: 'MYOB', category: 'Accounting' },
            ].map((partner) => (
              <div key={partner.name} className="text-center">
                <div className="w-24 h-24 bg-gray-100 rounded-xl mx-auto mb-3 flex items-center justify-center">
                  <span className="text-gray-400 font-medium">{partner.name}</span>
                </div>
                <p className="text-sm text-gray-500">{partner.category}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Pricing That Pays for Itself
            </h2>
            <p className="text-xl text-gray-600">
              Average payback period: 6 weeks
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white rounded-xl p-8 border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Starter</h3>
              <p className="text-gray-600 text-sm mb-6">For smaller builders</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">$899</span>
                <span className="text-gray-500">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700">Up to 50 workers</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700">1 site</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700">Basic integrations</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700">Email support</span>
                </li>
              </ul>
              <button className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                Start Free Trial
              </button>
            </div>

            <div className="bg-blue-600 rounded-xl p-8 text-white relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="px-3 py-1 bg-green-500 text-white rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Professional</h3>
              <p className="text-blue-100 text-sm mb-6">For growing companies</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">$2,499</span>
                <span className="text-blue-100">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-white" />
                  <span>Up to 500 workers</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-white" />
                  <span>Unlimited sites</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-white" />
                  <span>All integrations</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-white" />
                  <span>Priority support</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-white" />
                  <span>Premium forecasting</span>
                </li>
              </ul>
              <button className="w-full px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50">
                Book Demo
              </button>
            </div>

            <div className="bg-white rounded-xl p-8 border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Enterprise</h3>
              <p className="text-gray-600 text-sm mb-6">For major contractors</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">Custom</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700">Unlimited workers</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700">Multi-company</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700">Custom integrations</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700">Dedicated success manager</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700">SLA guarantee</span>
                </li>
              </ul>
              <button className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Save $475,000 Per Year?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join 47 NSW construction companies already transforming their injury management
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-4 bg-white text-blue-600 rounded-lg text-lg font-medium hover:bg-blue-50">
              Book Your Demo Today
            </button>
            <button className="px-8 py-4 border-2 border-white text-white rounded-lg text-lg font-medium hover:bg-blue-800">
              Download ROI Calculator
            </button>
          </div>
          <p className="text-blue-100 mt-8 text-sm">
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
                <li><a href="#" className="hover:text-white">Features</a></li>
                <li><a href="#" className="hover:text-white">Integrations</a></li>
                <li><a href="#" className="hover:text-white">Pricing</a></li>
                <li><a href="#" className="hover:text-white">ROI Calculator</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Case Studies</a></li>
                <li><a href="#" className="hover:text-white">Compliance Guide</a></li>
                <li><a href="#" className="hover:text-white">API Docs</a></li>
                <li><a href="#" className="hover:text-white">Support</a></li>
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

export default MendWebsite;