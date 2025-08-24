import { useState, useEffect } from 'react';
import { Calculator, TrendingUp } from 'lucide-react';

interface ROIInputs {
  workers: number;
  wageBill: number;
  premiumRate: number;
  managers: number;
  currentIncidents: number;
}

interface ROIResults {
  premiumReduction: number;
  adminSavings: number;
  complianceSavings: number;
  totalSavings: number;
  roi: number;
  paybackWeeks: number;
}

const ROICalculator = () => {
  const [inputs, setInputs] = useState<ROIInputs>({
    workers: 250,
    wageBill: 25000000,
    premiumRate: 4.84,
    managers: 5,
    currentIncidents: 18
  });

  const [results, setResults] = useState<ROIResults>({
    premiumReduction: 183000,
    adminSavings: 247000,
    complianceSavings: 45000,
    totalSavings: 475000,
    roi: 892,
    paybackWeeks: 6
  });

  const calculateROI = (newInputs: ROIInputs) => {
    // Premium reduction calculation (15% avg reduction from improved RTW)
    const currentPremium = (newInputs.wageBill * newInputs.premiumRate) / 100;
    const premiumReduction = currentPremium * 0.15;

    // Admin time savings (10.5 hours/week × $90/hour × 52 weeks)
    const adminSavings = newInputs.managers * 10.5 * 90 * 52;

    // Compliance penalties avoided (avg $9K per incident)
    const complianceSavings = newInputs.currentIncidents * 9000 * 0.5; // 50% reduction

    const totalSavings = premiumReduction + adminSavings + complianceSavings;
    const annualCost = 53000; // Platform cost estimate
    const roi = ((totalSavings - annualCost) / annualCost) * 100;
    const paybackWeeks = (annualCost / (totalSavings / 52));

    return {
      premiumReduction: Math.round(premiumReduction),
      adminSavings: Math.round(adminSavings),
      complianceSavings: Math.round(complianceSavings),
      totalSavings: Math.round(totalSavings),
      roi: Math.round(roi),
      paybackWeeks: Math.round(paybackWeeks)
    };
  };

  useEffect(() => {
    const newResults = calculateROI(inputs);
    setResults(newResults);
  }, [inputs]);

  const handleInputChange = (field: keyof ROIInputs, value: number) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-200">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Input Section */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <Calculator className="w-6 h-6 text-blue-600" />
              <h3 className="text-xl font-semibold text-gray-900">Your Company Details</h3>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Workers
                </label>
                <input 
                  type="number" 
                  value={inputs.workers}
                  onChange={(e) => handleInputChange('workers', Number(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Annual Wage Bill (AUD)
                </label>
                <input 
                  type="number" 
                  value={inputs.wageBill}
                  onChange={(e) => handleInputChange('wageBill', Number(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Premium Rate (%)
                </label>
                <input 
                  type="number" 
                  step="0.01"
                  value={inputs.premiumRate}
                  onChange={(e) => handleInputChange('premiumRate', Number(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Managers
                </label>
                <input 
                  type="number" 
                  value={inputs.managers}
                  onChange={(e) => handleInputChange('managers', Number(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Incidents per Year
                </label>
                <input 
                  type="number" 
                  value={inputs.currentIncidents}
                  onChange={(e) => handleInputChange('currentIncidents', Number(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-6 h-6 text-green-600" />
              <h3 className="text-xl font-semibold text-gray-900">Projected Annual Savings</h3>
            </div>
            
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Premium Reduction</span>
                  <span className="text-2xl font-bold text-green-600">
                    {formatCurrency(results.premiumReduction)}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  Through improved RTW and claims management
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Admin Time Saved</span>
                  <span className="text-2xl font-bold text-green-600">
                    {formatCurrency(results.adminSavings)}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  10.5 hours/week per manager eliminated
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Compliance Penalties Avoided</span>
                  <span className="text-2xl font-bold text-green-600">
                    {formatCurrency(results.complianceSavings)}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  Automated deadline and requirement management
                </div>
              </div>
              
              <div className="bg-blue-600 rounded-lg p-6 text-white">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-lg font-semibold">Total Annual Savings</span>
                  <span className="text-3xl font-bold">
                    {formatCurrency(results.totalSavings)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-blue-100">
                  <span>ROI: {results.roi}%</span>
                  <span>Payback: {results.paybackWeeks} weeks</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <button className="px-8 py-4 bg-blue-600 text-white rounded-lg text-lg font-medium hover:bg-blue-700 transition-colors">
            Get Detailed ROI Report →
          </button>
          <p className="text-sm text-gray-600 mt-3">
            Based on average results from 47 NSW construction companies
          </p>
        </div>
      </div>
    </div>
  );
};

export default ROICalculator;