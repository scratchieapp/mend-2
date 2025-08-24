import { Shield, Home } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <Shield className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">Page Not Found</h2>
          <p className="text-gray-600">
            Sorry, the page you're looking for doesn't exist. It might have been moved or deleted.
          </p>
        </div>
        
        <div className="space-y-4">
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Home className="w-5 h-5" />
            Back to Home
          </a>
          
          <div className="text-sm text-gray-500">
            <p>Or try these popular sections:</p>
            <div className="flex flex-wrap justify-center gap-4 mt-2">
              <a href="/#solution" className="text-blue-600 hover:text-blue-800">Solution</a>
              <a href="/#roi" className="text-blue-600 hover:text-blue-800">ROI Calculator</a>
              <a href="/#pricing" className="text-blue-600 hover:text-blue-800">Pricing</a>
              <a href="/operations" className="text-blue-600 hover:text-blue-800">Operations Platform</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;