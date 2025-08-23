import { TrendingUp, Clock, Shield, Users, Award, Target } from 'lucide-react';

const CaseStudies = () => {
  const caseStudies = [
    {
      company: "BuildCorp NSW",
      logo: "/api/placeholder/80/80",
      workers: "2,340 workers",
      projects: "3 major projects",
      quote: "Mend transformed our injury management. We went from chaos to complete control in 3 months.",
      author: "Sarah Chen",
      position: "Safety Director",
      metrics: [
        { label: "RTW Rate Improved", before: "84%", after: "96%", icon: TrendingUp },
        { label: "Premium Saved", value: "$420,000/yr", icon: Target },
        { label: "Admin Time Reduced", value: "75%", icon: Clock }
      ],
      highlight: true
    },
    {
      company: "Western Constructions",
      logo: "/api/placeholder/80/80",
      workers: "890 workers",
      projects: "Regional projects",
      quote: "The multilingual support alone saved us. 40% of our workforce speaks languages other than English.",
      author: "Marcus Rodriguez",
      position: "Operations Manager",
      metrics: [
        { label: "Incidents Reduced", value: "-47%", icon: Shield },
        { label: "Compliance Score", before: "C", after: "A+", icon: Award },
        { label: "Claims Processing", before: "6 weeks", after: "5 days", icon: Clock }
      ]
    },
    {
      company: "Metro Builders Group",
      logo: "/api/placeholder/80/80",
      workers: "450 workers",
      projects: "47 subcontractors",
      quote: "Managing 47 subcontractors was a nightmare. Now it's automated and we have zero compliance gaps.",
      author: "David Park",
      position: "CFO",
      metrics: [
        { label: "Subcontractor Compliance", value: "100%", icon: Users },
        { label: "Liability Exposure", value: "-$380K", icon: Target },
        { label: "Audit Preparation", before: "2 weeks", after: "2 hours", icon: Clock }
      ]
    }
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Success Stories from NSW Construction Leaders
          </h2>
          <p className="text-xl text-gray-600">
            See how leading construction companies transformed their operations
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {caseStudies.map((study, index) => (
            <div 
              key={index} 
              className={`bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow ${
                study.highlight ? 'ring-2 ring-blue-500 relative' : ''
              }`}
            >
              {study.highlight && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="px-4 py-1 bg-blue-600 text-white rounded-full text-sm font-medium">
                    Featured Success
                  </span>
                </div>
              )}
              
              <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                  <span className="text-lg font-bold text-blue-700">
                    {study.company.split(' ')[0].substring(0, 2)}
                  </span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-lg">{study.company}</h4>
                  <p className="text-sm text-gray-500">{study.workers} • {study.projects}</p>
                </div>
              </div>
              
              <div className="space-y-4 mb-6">
                {study.metrics.map((metric, metricIndex) => (
                  <div key={metricIndex} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <metric.icon className="w-4 h-4 text-blue-600" />
                      <span className="text-gray-600 text-sm">{metric.label}</span>
                    </div>
                    <div className="text-right">
                      {metric.before && metric.after ? (
                        <span className="font-semibold text-green-600">
                          {metric.before} → {metric.after}
                        </span>
                      ) : (
                        <span className="font-semibold text-green-600">{metric.value}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <blockquote className="text-gray-600 italic text-sm mb-4 leading-relaxed">
                "{study.quote}"
              </blockquote>
              
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-900">{study.author}</p>
                <p className="text-xs text-gray-500">{study.position}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center mt-12">
          <div className="inline-flex items-center gap-8 text-sm text-gray-600 mb-8">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span>47+ Companies</span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              <span>$8.3M+ Saved</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <span>94% Avg RTW Rate</span>
            </div>
          </div>
          
          <button className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
            Join These Success Stories
          </button>
        </div>
      </div>
    </section>
  );
};

export default CaseStudies;