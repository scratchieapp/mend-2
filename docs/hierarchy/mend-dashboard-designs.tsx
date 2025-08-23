import React, { useState } from 'react';
import { 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  FileText, 
  Calendar,
  DollarSign,
  Activity,
  Clock,
  Bell,
  Shield,
  Smartphone,
  Globe,
  BarChart3,
  Building,
  UserCheck,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Menu,
  X,
  Download,
  Upload,
  MessageSquare
} from 'lucide-react';

const DashboardShowcase = () => {
  const [selectedRole, setSelectedRole] = useState('executive');
  const [mobileView, setMobileView] = useState(false);

  const roles = [
    { id: 'executive', name: 'Executive Manager', icon: TrendingUp },
    { id: 'safety', name: 'Safety Manager', icon: Shield },
    { id: 'site', name: 'Site Supervisor', icon: Building },
    { id: 'project', name: 'Project Admin', icon: FileText },
    { id: 'medical', name: 'Medical Professional', icon: Activity },
    { id: 'claims', name: 'Claims Provider', icon: DollarSign },
  ];

  // Executive Dashboard Component
  const ExecutiveDashboard = () => (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Executive Dashboard</h1>
          <p className="text-gray-600 mt-1">Real-time safety performance & financial impact</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700">
            <Download className="w-4 h-4" />
            Board Report
          </button>
          <button className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50">
            <Bell className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Premium Impact Alert */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-amber-900">Premium Impact Alert</h3>
            <p className="text-amber-800 text-sm mt-1">Recent incidents projected to increase premium by 8.3% ($124,000) next cycle</p>
            <button className="text-amber-700 font-medium text-sm mt-2 hover:underline">View mitigation strategies →</button>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Incidents (YTD)</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">47</p>
              <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 rotate-180" />
                12% vs last year
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">RTW Success Rate</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">84%</p>
              <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                3% improvement
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Claims Cost (Quarter)</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">$483K</p>
              <p className="text-sm text-gray-500 mt-1">18 active claims</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Safety Score</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">B+</p>
              <p className="text-sm text-gray-500 mt-1">Industry: B-</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Project Overview */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Major Projects Safety Status</h2>
        <div className="space-y-3">
          {[
            { name: 'Western Sydney Airport', incidents: 3, workers: 2340, status: 'stable', completion: 67 },
            { name: 'Sydney Metro West', incidents: 7, workers: 1850, status: 'attention', completion: 45 },
            { name: 'Parramatta Light Rail', incidents: 1, workers: 890, status: 'good', completion: 82 },
          ].map((project) => (
            <div key={project.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <p className="font-medium text-gray-900">{project.name}</p>
                <p className="text-sm text-gray-600 mt-1">{project.workers} active workers • {project.completion}% complete</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-gray-600">Incidents (30d)</p>
                  <p className="font-semibold text-lg">{project.incidents}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  project.status === 'good' ? 'bg-green-100 text-green-700' :
                  project.status === 'attention' ? 'bg-amber-100 text-amber-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {project.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Predictive Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Premium Forecast Model</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Current Premium</span>
              <span className="font-medium">$1,495,000</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Projected Next Cycle</span>
              <span className="font-medium text-red-600">$1,619,000</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">If RTW improves to 95%</span>
              <span className="font-medium text-green-600">$1,420,000</span>
            </div>
            <div className="pt-3 mt-3 border-t">
              <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Run Scenario Analysis
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Subcontractor Liability</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Active Subcontractors</span>
              <span className="font-medium">47</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Insurance Verified</span>
              <span className="font-medium text-green-600">45/47</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Outstanding Premiums</span>
              <span className="font-medium text-red-600">$23,400</span>
            </div>
            <div className="pt-3 mt-3 border-t">
              <button className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                Review Compliance
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Safety Manager Dashboard
  const SafetyDashboard = () => (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Safety & Compliance Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage incidents, compliance, and return-to-work programs</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700">
            <Upload className="w-4 h-4" />
            Submit to SafeWork
          </button>
        </div>
      </div>

      {/* Compliance Calendar Alert */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900">Urgent Compliance Deadlines</h3>
            <div className="mt-2 space-y-1">
              <p className="text-red-800 text-sm">• SIRA wage declaration due in 3 days</p>
              <p className="text-red-800 text-sm">• SafeWork NSW incident report #2847 due today</p>
              <p className="text-red-800 text-sm">• 2 workers missing health monitoring certificates</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Incidents Grid */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Active Incidents Requiring Action</h2>
          <button className="text-blue-600 text-sm font-medium hover:underline">View All →</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Incident</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Worker</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Site</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Status</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Next Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="py-3">
                  <div>
                    <p className="font-medium text-gray-900">#2851</p>
                    <p className="text-sm text-gray-500">Fall from height</p>
                  </div>
                </td>
                <td className="py-3">
                  <div>
                    <p className="text-gray-900">John Chen</p>
                    <p className="text-sm text-gray-500">Carpenter</p>
                  </div>
                </td>
                <td className="py-3 text-gray-900">Metro West</td>
                <td className="py-3">
                  <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                    Medical Review
                  </span>
                </td>
                <td className="py-3">
                  <button className="text-blue-600 hover:underline text-sm">Approve treatment →</button>
                </td>
              </tr>
              <tr>
                <td className="py-3">
                  <div>
                    <p className="font-medium text-gray-900">#2850</p>
                    <p className="text-sm text-gray-500">Manual handling</p>
                  </div>
                </td>
                <td className="py-3">
                  <div>
                    <p className="text-gray-900">Maria Santos</p>
                    <p className="text-sm text-gray-500">Site Admin</p>
                  </div>
                </td>
                <td className="py-3 text-gray-900">Airport Site</td>
                <td className="py-3">
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                    RTW Planning
                  </span>
                </td>
                <td className="py-3">
                  <button className="text-blue-600 hover:underline text-sm">Assign duties →</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* RTW Program Management */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Return to Work Pipeline</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium">Ready for suitable duties</span>
              </div>
              <span className="text-lg font-semibold">7</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                <span className="text-sm font-medium">Awaiting medical clearance</span>
              </div>
              <span className="text-lg font-semibold">12</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium">In graduated RTW</span>
              </div>
              <span className="text-lg font-semibold">5</span>
            </div>
          </div>
          <button className="w-full mt-4 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
            Suitable Duties Matcher →
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">SWMS Library Status</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total SWMS Documents</span>
              <span className="font-medium">147</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">High-Risk Categories Covered</span>
              <span className="font-medium text-green-600">18/18</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Requiring Update</span>
              <span className="font-medium text-amber-600">23</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Multi-language Available</span>
              <span className="font-medium">45%</span>
            </div>
            <button className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Update SWMS Templates
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Site Supervisor Dashboard (Mobile-First)
  const SiteDashboard = () => (
    <div className={`p-4 space-y-4 ${mobileView ? 'max-w-sm mx-auto' : ''}`}>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Site Dashboard</h1>
          <p className="text-sm text-gray-600 mt-0.5">Western Sydney Airport - Zone 3</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2 py-1 bg-green-100 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-medium text-green-700">Online</span>
          </div>
          <button className="p-2 rounded-lg bg-gray-100">
            <Bell className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Quick Actions - Mobile Optimized */}
      <div className="grid grid-cols-2 gap-3">
        <button className="bg-red-600 text-white rounded-xl p-4 flex flex-col items-center gap-2 hover:bg-red-700">
          <AlertTriangle className="w-6 h-6" />
          <span className="text-sm font-medium">Report Incident</span>
        </button>
        <button className="bg-blue-600 text-white rounded-xl p-4 flex flex-col items-center gap-2 hover:bg-blue-700">
          <Users className="w-6 h-6" />
          <span className="text-sm font-medium">Toolbox Talk</span>
        </button>
        <button className="bg-green-600 text-white rounded-xl p-4 flex flex-col items-center gap-2 hover:bg-green-700">
          <UserCheck className="w-6 h-6" />
          <span className="text-sm font-medium">Worker Check-in</span>
        </button>
        <button className="bg-purple-600 text-white rounded-xl p-4 flex flex-col items-center gap-2 hover:bg-purple-700">
          <Shield className="w-6 h-6" />
          <span className="text-sm font-medium">SWMS</span>
        </button>
      </div>

      {/* Today's Safety Status */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="font-semibold text-gray-900 mb-3">Today's Safety Status</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Workers on site</span>
            <span className="font-medium text-lg">127</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Active permits</span>
            <span className="font-medium text-lg">8</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Weather delays</span>
            <span className="font-medium text-lg text-amber-600">High wind warning</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Incidents today</span>
            <span className="font-medium text-lg text-green-600">0</span>
          </div>
        </div>
      </div>

      {/* Recent Incidents */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold text-gray-900">Recent Site Incidents</h2>
          <button className="text-blue-600 text-sm hover:underline">View all</button>
        </div>
        <div className="space-y-3">
          {[
            { id: '2849', type: 'Near miss', worker: 'T. Johnson', time: '2 hours ago', status: 'reported' },
            { id: '2847', type: 'First aid', worker: 'M. Lee', time: 'Yesterday', status: 'resolved' },
          ].map((incident) => (
            <div key={incident.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-sm">#{incident.id} - {incident.type}</p>
                <p className="text-xs text-gray-500">{incident.worker} • {incident.time}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                incident.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {incident.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Offline Mode Banner */}
      {mobileView && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Smartphone className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">Offline Mode Available</p>
              <p className="text-sm text-blue-700 mt-1">All incident reports will sync when connection restored</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Medical Professional Dashboard
  const MedicalDashboard = () => (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Medical Portal</h1>
          <p className="text-gray-600 mt-1">Injury assessment and return-to-work management</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <MessageSquare className="w-4 h-4 inline mr-2" />
            Contact Insurer
          </button>
        </div>
      </div>

      {/* Patient Queue */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Construction Worker Assessments</h2>
        <div className="space-y-3">
          {[
            { name: 'John Chen', company: 'BuildCorp', injury: 'Fall from height - back injury', days: 14, status: 'Initial assessment' },
            { name: 'Maria Santos', company: 'Western Constructions', injury: 'Manual handling - shoulder', days: 7, status: 'RTW planning' },
            { name: 'Ahmed Hassan', company: 'BuildCorp', injury: 'Cut laceration - hand', days: 3, status: 'Follow-up' },
          ].map((patient) => (
            <div key={patient.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
              <div className="flex-1">
                <p className="font-medium text-gray-900">{patient.name}</p>
                <p className="text-sm text-gray-600 mt-1">{patient.company} • {patient.injury}</p>
                <p className="text-xs text-gray-500 mt-1">Day {patient.days} post-injury</p>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                  {patient.status}
                </span>
                <button className="block mt-2 text-sm text-blue-600 hover:underline">Open record →</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Construction-Specific Protocols */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Common Construction Injuries</h2>
          <div className="space-y-2">
            <button className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 flex justify-between items-center">
              <span className="text-sm">Fall from height protocol</span>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
            <button className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 flex justify-between items-center">
              <span className="text-sm">Manual handling assessment</span>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
            <button className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 flex justify-between items-center">
              <span className="text-sm">Struck by object evaluation</span>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">RTW Suitable Duties Guide</h2>
          <div className="space-y-2 text-sm">
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="font-medium text-green-900">Light duties available:</p>
              <p className="text-green-700 mt-1">Traffic control, tool maintenance, documentation</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg">
              <p className="font-medium text-amber-900">Restricted duties:</p>
              <p className="text-amber-700 mt-1">Ground-level work only, no lifting >10kg</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="font-medium text-red-900">Not suitable:</p>
              <p className="text-red-700 mt-1">Heights, confined spaces, heavy machinery</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Claims Provider Dashboard
  const ClaimsDashboard = () => (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Claims Management Portal</h1>
          <p className="text-gray-600 mt-1">Construction sector claims processing and analysis</p>
        </div>
        <div className="flex gap-3">
          <span className="px-3 py-2 bg-gray-100 rounded-lg text-sm font-medium">
            icare Integration: <span className="text-green-600">Connected</span>
          </span>
        </div>
      </div>

      {/* Claims Processing Queue */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Construction Claims Queue</h2>
          <div className="flex gap-2">
            <button className="px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Pending (23)</button>
            <button className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm">Review (8)</button>
            <button className="px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Approved (47)</button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Claim ID</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Company</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Type</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Cost Est.</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Premium Impact</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="py-3 font-medium">WC-2024-8745</td>
                <td className="py-3">BuildCorp NSW</td>
                <td className="py-3">
                  <span className="text-sm">Fall from scaffolding</span>
                </td>
                <td className="py-3 font-medium">$127,000</td>
                <td className="py-3">
                  <span className="text-red-600 font-medium">+2.3%</span>
                </td>
                <td className="py-3">
                  <button className="text-blue-600 hover:underline text-sm">Approve →</button>
                </td>
              </tr>
              <tr>
                <td className="py-3 font-medium">WC-2024-8744</td>
                <td className="py-3">Western Constructions</td>
                <td className="py-3">
                  <span className="text-sm">Manual handling</span>
                </td>
                <td className="py-3 font-medium">$18,500</td>
                <td className="py-3">
                  <span className="text-amber-600 font-medium">+0.4%</span>
                </td>
                <td className="py-3">
                  <button className="text-blue-600 hover:underline text-sm">Review →</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Cost Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Average Claim Cost</h3>
          <p className="text-3xl font-bold text-gray-900">$18,500</p>
          <p className="text-sm text-gray-500 mt-1">Industry avg: $15,200</p>
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-gray-600">Top injury types:</p>
            <div className="mt-2 space-y-1">
              <div className="text-xs">Falls: $45,000 avg</div>
              <div className="text-xs">Manual: $12,000 avg</div>
              <div className="text-xs">Struck by: $8,500 avg</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">RTW Performance</h3>
          <p className="text-3xl font-bold text-gray-900">8.5 weeks</p>
          <p className="text-sm text-gray-500 mt-1">Average time lost</p>
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-gray-600">By severity:</p>
            <div className="mt-2 space-y-1">
              <div className="text-xs">Minor: 2.3 weeks</div>
              <div className="text-xs">Moderate: 8.7 weeks</div>
              <div className="text-xs">Severe: 26.4 weeks</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Premium Forecast</h3>
          <p className="text-3xl font-bold text-gray-900">+8.3%</p>
          <p className="text-sm text-gray-500 mt-1">Next cycle projection</p>
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-gray-600">Key drivers:</p>
            <div className="mt-2 space-y-1">
              <div className="text-xs">Claims frequency: +12%</div>
              <div className="text-xs">Severity increase: +18%</div>
              <div className="text-xs">RTW delays: -4%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Project Admin Dashboard  
  const ProjectAdminDashboard = () => (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Project Administration</h1>
          <p className="text-gray-600 mt-1">Documentation, compliance, and contractor coordination</p>
        </div>
        <div className="flex gap-3">
          <span className="px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium">
            3 Urgent Deadlines
          </span>
        </div>
      </div>

      {/* Administrative Workload Tracker */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Admin Efficiency Gains</h2>
            <p className="text-sm text-gray-600 mt-1">Time saved this week through automation</p>
            <p className="text-3xl font-bold text-blue-600 mt-3">14.5 hours</p>
            <p className="text-sm text-gray-500 mt-1">Previously 25% of workforce on admin → Now 12%</p>
          </div>
          <div className="text-right">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
              <TrendingUp className="w-4 h-4" />
              42% improvement
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Contractor Coordination */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Contractor Compliance Status</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Contractor</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Workers</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Insurance</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">SWMS</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Wage Dec</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="py-3">
                  <div>
                    <p className="font-medium">ABC Electrical</p>
                    <p className="text-sm text-gray-500">Tier 2 Sub</p>
                  </div>
                </td>
                <td className="py-3">24</td>
                <td className="py-3">
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">Verified</span>
                  </span>
                </td>
                <td className="py-3">
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">18/18</span>
                  </span>
                </td>
                <td className="py-3">
                  <span className="flex items-center gap-1 text-amber-600">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">Due 3d</span>
                  </span>
                </td>
                <td className="py-3">
                  <button className="text-blue-600 hover:underline text-sm">Send reminder →</button>
                </td>
              </tr>
              <tr>
                <td className="py-3">
                  <div>
                    <p className="font-medium">XYZ Concrete</p>
                    <p className="text-sm text-gray-500">Tier 1 Sub</p>
                  </div>
                </td>
                <td className="py-3">87</td>
                <td className="py-3">
                  <span className="flex items-center gap-1 text-red-600">
                    <X className="w-4 h-4" />
                    <span className="text-sm">Expired</span>
                  </span>
                </td>
                <td className="py-3">
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">18/18</span>
                  </span>
                </td>
                <td className="py-3">
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">Current</span>
                  </span>
                </td>
                <td className="py-3">
                  <button className="text-red-600 hover:underline text-sm font-medium">Urgent action →</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Document Generation Center */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Document Generation</h2>
          <div className="space-y-2">
            <button className="w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 text-left flex justify-between items-center">
              <span className="text-sm font-medium">Generate SIRA wage declaration</span>
              <FileText className="w-4 h-4 text-gray-400" />
            </button>
            <button className="w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 text-left flex justify-between items-center">
              <span className="text-sm font-medium">SafeWork NSW incident report</span>
              <FileText className="w-4 h-4 text-gray-400" />
            </button>
            <button className="w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 text-left flex justify-between items-center">
              <span className="text-sm font-medium">Contractor compliance pack</span>
              <FileText className="w-4 h-4 text-gray-400" />
            </button>
            <button className="w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 text-left flex justify-between items-center">
              <span className="text-sm font-medium">Multi-language safety notice</span>
              <Globe className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Compliance Calendar</h2>
          <div className="space-y-3">
            <div className="p-3 bg-red-50 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-red-900 text-sm">SIRA Wage Declaration</p>
                  <p className="text-xs text-red-700 mt-1">Q4 2024 submission</p>
                </div>
                <span className="text-xs font-medium text-red-600">3 days</span>
              </div>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-amber-900 text-sm">Workers Comp Audit</p>
                  <p className="text-xs text-amber-700 mt-1">Annual icare audit</p>
                </div>
                <span className="text-xs font-medium text-amber-600">2 weeks</span>
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-blue-900 text-sm">Safety Management Review</p>
                  <p className="text-xs text-blue-700 mt-1">Quarterly board report</p>
                </div>
                <span className="text-xs font-medium text-blue-600">1 month</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => {
    switch(selectedRole) {
      case 'executive': return <ExecutiveDashboard />;
      case 'safety': return <SafetyDashboard />;
      case 'site': return <SiteDashboard />;
      case 'medical': return <MedicalDashboard />;
      case 'claims': return <ClaimsDashboard />;
      case 'project': return <ProjectAdminDashboard />;
      default: return <ExecutiveDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Mend Platform</h1>
                <p className="text-xs text-gray-500">Construction Injury Management System</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileView(!mobileView)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  mobileView ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {mobileView ? 'Desktop View' : 'Mobile View'}
              </button>
              <span className="text-sm text-gray-500">BuildCorp NSW</span>
            </div>
          </div>
        </div>
      </div>

      {/* Role Selector */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 py-3 overflow-x-auto">
            {roles.map((role) => {
              const Icon = role.icon;
              return (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedRole === role.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {role.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        {renderDashboard()}
      </div>

      {/* Footer */}
      <div className="mt-12 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">
              Mend Platform v2.0 - Optimized for NSW Construction Industry
            </p>
            <div className="flex gap-6 text-sm text-gray-500">
              <span>SafeWork NSW Compliant</span>
              <span>SIRA Integrated</span>
              <span>icare Connected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardShowcase;