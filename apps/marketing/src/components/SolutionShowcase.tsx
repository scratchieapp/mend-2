import { useState } from 'react';
import { 
  CheckCircle, 
  Smartphone, 
  BarChart3, 
  Users, 
  FileText, 
  Clock,
  TrendingUp,
  AlertTriangle,
  Shield
} from 'lucide-react';

const SolutionShowcase = () => {
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    {
      id: 0,
      icon: Smartphone,
      title: "Instant Mobile Reporting",
      description: "Report incidents in 60 seconds with offline capability",
      details: [
        "Works offline at remote construction sites",
        "Multilingual interface for 26.9% non-English speakers",
        "Voice-to-text for faster reporting",
        "Photo capture with GPS location",
        "Digital signatures from witnesses"
      ],
      mockup: {
        type: "mobile",
        title: "Incident Report",
        status: "In Progress",
        progress: 75,
        fields: [
          { label: "Worker", value: "John Smith" },
          { label: "Location", value: "Site 3 - Level 5" },
          { label: "Time", value: "14:30 today" },
          { label: "Type", value: "Minor injury" }
        ]
      }
    },
    {
      id: 1,
      icon: BarChart3,
      title: "Real-Time Premium Impact",
      description: "See exactly how each incident affects your 3-year premium",
      details: [
        "Live premium forecasting engine",
        "Compare scenarios before decisions",
        "Track RTW rate impact on costs",
        "Identify high-risk patterns",
        "Benchmark against industry averages"
      ],
      mockup: {
        type: "dashboard",
        title: "Premium Forecast Dashboard",
        currentPremium: "$1,495,000",
        projectedSavings: "-8.3%",
        metrics: [
          { label: "Active Claims", value: "12", trend: "down" },
          { label: "RTW Success Rate", value: "94%", trend: "up" },
          { label: "Compliance Score", value: "A+", trend: "stable" }
        ]
      }
    },
    {
      id: 2,
      icon: Users,
      title: "Subcontractor Management",
      description: "Track compliance across your entire contractor chain",
      details: [
        "Automated insurance verification",
        "Digital certificate tracking",
        "Compliance deadline alerts",
        "Liability exposure reporting",
        "Contractor performance scoring"
      ],
      mockup: {
        type: "table",
        title: "Subcontractor Compliance",
        contractors: [
          { name: "ABC Plumbing", status: "Compliant", expires: "Dec 2024", score: "A+" },
          { name: "XYZ Electrical", status: "Renewal Due", expires: "Jan 2024", score: "B" },
          { name: "BuildRight Conc.", status: "Compliant", expires: "Mar 2024", score: "A" }
        ]
      }
    },
    {
      id: 3,
      icon: FileText,
      title: "Automated Compliance",
      description: "Never miss another SIRA, SafeWork NSW, or icare deadline",
      details: [
        "Direct API connections to all agencies",
        "Automated form population",
        "Deadline tracking and alerts",
        "Compliance checklist automation",
        "Audit trail documentation"
      ],
      mockup: {
        type: "timeline",
        title: "Compliance Timeline",
        events: [
          { agency: "SIRA", task: "Claim lodged", status: "complete", time: "2 hours ago" },
          { agency: "SafeWork NSW", task: "Incident notified", status: "complete", time: "1 hour ago" },
          { agency: "icare", task: "Premium updated", status: "pending", time: "Processing..." }
        ]
      }
    }
  ];

  const renderMockup = (feature: typeof features[0]) => {
    const { mockup } = feature;
    
    switch (mockup.type) {
      case "mobile":
        return (
          <div className="bg-gray-900 rounded-[2rem] p-2 w-80 mx-auto">
            <div className="bg-white rounded-[1.5rem] p-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-semibold">{mockup.title}</h4>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {mockup.status}
                </span>
              </div>
              <div className="space-y-3 mb-4">
                {mockup.fields?.map((field, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-gray-600">{field.label}:</span>
                    <span className="font-medium">{field.value}</span>
                  </div>
                ))}
              </div>
              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progress</span>
                  <span>{mockup.progress}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${mockup.progress}%` }}
                  />
                </div>
              </div>
              <button className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm">
                Continue Report
              </button>
            </div>
          </div>
        );
        
      case "dashboard":
        return (
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h4 className="font-semibold text-lg mb-1">{mockup.title}</h4>
                <p className="text-3xl font-bold text-gray-900">{mockup.currentPremium}</p>
              </div>
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                {mockup.projectedSavings} saved
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {mockup.metrics?.map((metric, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-sm text-gray-600 mb-1">{metric.label}</div>
                  <div className="text-lg font-bold text-gray-900">{metric.value}</div>
                </div>
              ))}
            </div>
          </div>
        );
        
      case "table":
        return (
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h4 className="font-semibold text-lg mb-4">{mockup.title}</h4>
            <div className="space-y-3">
              {mockup.contractors?.map((contractor, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">{contractor.name}</div>
                    <div className="text-sm text-gray-600">Expires: {contractor.expires}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${
                      contractor.status === 'Compliant' ? 'text-green-600' : 'text-amber-600'
                    }`}>
                      {contractor.status}
                    </div>
                    <div className="text-xs text-gray-500">Score: {contractor.score}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
        
      case "timeline":
        return (
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h4 className="font-semibold text-lg mb-4">{mockup.title}</h4>
            <div className="space-y-4">
              {mockup.events?.map((event, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className={`w-3 h-3 rounded-full mt-2 ${
                    event.status === 'complete' ? 'bg-green-500' : 'bg-amber-500'
                  }`} />
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <span className="font-medium">{event.agency}</span>
                      <span className="text-xs text-gray-500">{event.time}</span>
                    </div>
                    <div className="text-sm text-gray-600">{event.task}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <section id="solution" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            One Platform. Every Stakeholder. Zero Paperwork.
          </h2>
          <p className="text-xl text-gray-600">
            Mend connects your entire injury management ecosystem in real-time
          </p>
        </div>

        {/* Interactive Feature Showcase */}
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Feature List */}
          <div className="space-y-4">
            {features.map((feature, index) => (
              <div
                key={feature.id}
                className={`p-6 rounded-xl cursor-pointer transition-all ${
                  activeFeature === index
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-white hover:bg-gray-50 shadow-sm'
                }`}
                onClick={() => setActiveFeature(index)}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${
                    activeFeature === index ? 'bg-blue-500' : 'bg-blue-100'
                  }`}>
                    <feature.icon className={`w-6 h-6 ${
                      activeFeature === index ? 'text-white' : 'text-blue-600'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                    <p className={`text-sm mb-4 ${
                      activeFeature === index ? 'text-blue-100' : 'text-gray-600'
                    }`}>
                      {feature.description}
                    </p>
                    
                    {activeFeature === index && (
                      <ul className="space-y-2">
                        {feature.details.map((detail, detailIndex) => (
                          <li key={detailIndex} className="flex items-start gap-2 text-sm text-blue-100">
                            <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Feature Mockup */}
          <div className="sticky top-8">
            {renderMockup(features[activeFeature])}
          </div>
        </div>

        {/* Key Benefits Summary */}
        <div className="mt-16 grid md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-green-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">90% Less Paperwork</h4>
            <p className="text-sm text-gray-600">
              Automated forms and workflows eliminate manual documentation
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">15% Premium Reduction</h4>
            <p className="text-sm text-gray-600">
              Improved RTW rates and claims management lower your premiums
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-purple-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">100% Compliance</h4>
            <p className="text-sm text-gray-600">
              Never miss a deadline with automated regulatory submissions
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Real-Time Alerts</h4>
            <p className="text-sm text-gray-600">
              Instant notifications keep all stakeholders informed and responsive
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SolutionShowcase;