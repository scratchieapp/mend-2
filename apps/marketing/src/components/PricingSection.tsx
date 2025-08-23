import { CheckCircle, Star, Zap, Phone } from 'lucide-react';

const PricingSection = () => {
  const plans = [
    {
      name: "Starter",
      description: "Perfect for smaller builders getting started",
      price: 899,
      period: "month",
      popular: false,
      features: [
        "Up to 50 workers",
        "1 construction site",
        "Basic integrations (icare, SIRA)",
        "Email support",
        "Mobile incident reporting",
        "Basic analytics dashboard",
        "Compliance tracking"
      ],
      limitations: [
        "Limited customization",
        "Standard templates only"
      ],
      cta: "Start Free Trial",
      savings: "Save $127K/year on average"
    },
    {
      name: "Professional",
      description: "Most popular for growing construction companies",
      price: 2499,
      period: "month",
      popular: true,
      features: [
        "Up to 500 workers",
        "Unlimited construction sites",
        "All integrations included",
        "Priority support (4-hour response)",
        "Advanced analytics & reporting",
        "Premium forecasting tools",
        "Custom workflow automation",
        "Subcontractor management",
        "Multilingual support (12 languages)",
        "Dedicated customer success manager"
      ],
      limitations: [],
      cta: "Book Demo",
      savings: "Save $475K/year on average",
      highlight: true
    },
    {
      name: "Enterprise",
      description: "For major contractors and multi-company operations",
      price: "Custom",
      period: "",
      popular: false,
      features: [
        "Unlimited workers & sites",
        "Multi-company management",
        "Custom integrations & APIs",
        "Dedicated success manager",
        "24/7 phone support",
        "SLA guarantee (99.9% uptime)",
        "Advanced security features",
        "Custom training & onboarding",
        "White-label options",
        "Priority feature development"
      ],
      limitations: [],
      cta: "Contact Sales",
      savings: "Save $850K+ per year"
    }
  ];

  const testimonial = {
    quote: "ROI was immediate. We recouped our annual investment in just 6 weeks through reduced admin time alone.",
    author: "Michael Thompson",
    company: "Thompson Construction Group",
    position: "CEO",
    workers: "1,200 workers"
  };

  return (
    <section id="pricing" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Pricing That Pays for Itself
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Average payback period: 6 weeks. Choose the plan that fits your operation.
          </p>
          
          {/* Value Proposition */}
          <div className="inline-flex items-center gap-6 bg-green-50 border border-green-200 rounded-full px-6 py-3 text-sm mb-8">
            <span className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-4 h-4" />
              No setup fees
            </span>
            <span className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-4 h-4" />
              30-day free trial
            </span>
            <span className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-4 h-4" />
              Cancel anytime
            </span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
          {plans.map((plan, index) => (
            <div 
              key={index} 
              className={`bg-white rounded-2xl p-8 shadow-lg relative ${
                plan.popular 
                  ? 'ring-2 ring-blue-500 scale-105 z-10' 
                  : 'hover:shadow-xl transition-shadow'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium">
                    <Star className="w-4 h-4" />
                    Most Popular
                  </div>
                </div>
              )}
              
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-gray-600 text-sm mb-6">{plan.description}</p>
                
                <div className="mb-4">
                  {typeof plan.price === 'number' ? (
                    <div>
                      <span className="text-5xl font-bold text-gray-900">
                        ${plan.price.toLocaleString()}
                      </span>
                      <span className="text-gray-500 text-lg">/{plan.period}</span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-5xl font-bold text-gray-900">{plan.price}</span>
                    </div>
                  )}
                </div>
                
                <p className="text-sm font-medium text-green-600 mb-6">
                  {plan.savings}
                </p>
              </div>
              
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <button 
                className={`w-full py-4 px-6 rounded-lg font-medium text-lg transition-colors ${
                  plan.popular
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'border-2 border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {plan.cta}
              </button>
              
              {plan.period && (
                <p className="text-center text-xs text-gray-500 mt-3">
                  Billed annually. Cancel anytime.
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Social Proof */}
        <div className="bg-white rounded-2xl p-8 shadow-lg mb-12">
          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">47+</div>
              <div className="text-sm text-gray-600">Companies</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">$8.3M+</div>
              <div className="text-sm text-gray-600">Saved in Premiums</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">94%</div>
              <div className="text-sm text-gray-600">Avg RTW Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">6 weeks</div>
              <div className="text-sm text-gray-600">Avg Payback</div>
            </div>
          </div>
        </div>

        {/* Customer Testimonial */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-white text-center">
          <div className="max-w-3xl mx-auto">
            <blockquote className="text-xl font-medium mb-6">
              "{testimonial.quote}"
            </blockquote>
            <div className="flex items-center justify-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <span className="font-bold">{testimonial.author.split(' ').map(n => n[0]).join('')}</span>
              </div>
              <div className="text-left">
                <div className="font-semibold">{testimonial.author}</div>
                <div className="text-blue-100 text-sm">{testimonial.position}, {testimonial.company}</div>
                <div className="text-blue-100 text-xs">{testimonial.workers}</div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Snippet */}
        <div className="text-center mt-12">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Questions about pricing?
          </h3>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Phone className="w-5 h-5" />
              Call Sales: 1300 MEND AU
            </button>
            <button className="flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
              <Zap className="w-5 h-5" />
              Calculate Your Savings
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;