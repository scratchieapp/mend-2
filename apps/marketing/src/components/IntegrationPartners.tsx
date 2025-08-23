import { CheckCircle, Zap, Shield, FileText } from 'lucide-react';

const IntegrationPartners = () => {
  const partners = [
    {
      name: 'icare NSW',
      category: 'Workers Compensation',
      description: 'Direct premium calculations and claims lodging',
      status: 'live',
      logo: '🏢'
    },
    {
      name: 'SIRA',
      category: 'State Insurance Regulatory Authority',
      description: 'Automated compliance reporting',
      status: 'live',
      logo: '⚖️'
    },
    {
      name: 'SafeWork NSW',
      category: 'Work Health & Safety',
      description: 'Incident notifications and SWMS integration',
      status: 'live',
      logo: '🛡️'
    },
    {
      name: 'Allianz',
      category: 'Claims Provider',
      description: 'Streamlined claims processing',
      status: 'live',
      logo: '🏪'
    },
    {
      name: 'QBE',
      category: 'Claims Provider',
      description: 'Real-time claim status updates',
      status: 'live',
      logo: '🏪'
    },
    {
      name: 'GIO',
      category: 'Claims Provider',
      description: 'Automated documentation submission',
      status: 'live',
      logo: '🏪'
    },
    {
      name: 'Xero',
      category: 'Accounting Software',
      description: 'Payroll and premium reconciliation',
      status: 'live',
      logo: '📊'
    },
    {
      name: 'MYOB',
      category: 'Accounting Software',
      description: 'Financial reporting integration',
      status: 'live',
      logo: '📊'
    }
  ];

  const benefits = [
    {
      icon: Zap,
      title: "Automated Data Flow",
      description: "Information flows automatically between systems - no manual data entry"
    },
    {
      icon: Shield,
      title: "Compliance Guaranteed",
      description: "Never miss a deadline with direct connections to regulatory bodies"
    },
    {
      icon: FileText,
      title: "Single Source of Truth",
      description: "All stakeholders see the same real-time information"
    },
    {
      icon: CheckCircle,
      title: "Zero Setup Required",
      description: "Integrations work out-of-the-box with your existing accounts"
    }
  ];

  return (
    <section id="integrations" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Seamlessly Integrated with Your Existing Systems
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Mend connects with the tools and agencies you already use - no disruption, just efficiency
          </p>
          
          {/* Integration Benefits */}
          <div className="grid md:grid-cols-4 gap-6 mb-12">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <benefit.icon className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">{benefit.title}</h4>
                <p className="text-sm text-gray-600">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Partner Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          {partners.map((partner, index) => (
            <div key={index} className="relative group">
              <div className="bg-gray-50 hover:bg-blue-50 rounded-xl p-6 text-center transition-colors border hover:border-blue-200">
                <div className="text-4xl mb-3">{partner.logo}</div>
                <h4 className="font-semibold text-gray-900 mb-1">{partner.name}</h4>
                <p className="text-xs text-gray-500 mb-3">{partner.category}</p>
                
                {partner.status === 'live' && (
                  <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                    <CheckCircle className="w-3 h-3" />
                    Live
                  </div>
                )}
              </div>
              
              {/* Hover tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                {partner.description}
              </div>
            </div>
          ))}
        </div>

        {/* Integration Flow Diagram */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-200">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              How Integration Works
            </h3>
            <p className="text-gray-600">
              One incident report triggers updates across all connected systems
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1 text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold">1</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Report Incident</h4>
              <p className="text-sm text-gray-600">Worker reports injury via mobile app</p>
            </div>
            
            <div className="flex-shrink-0">
              <div className="w-8 h-8 text-blue-400">→</div>
            </div>
            
            <div className="flex-1 text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold">2</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Auto-Process</h4>
              <p className="text-sm text-gray-600">Mend validates and routes information</p>
            </div>
            
            <div className="flex-shrink-0">
              <div className="w-8 h-8 text-blue-400">→</div>
            </div>
            
            <div className="flex-1 text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold">3</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Update All Systems</h4>
              <p className="text-sm text-gray-600">icare, SIRA, insurers get real-time updates</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <button className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
            See All Integrations
          </button>
          <p className="text-sm text-gray-500 mt-3">
            New integrations added regularly based on customer needs
          </p>
        </div>
      </div>
    </section>
  );
};

export default IntegrationPartners;