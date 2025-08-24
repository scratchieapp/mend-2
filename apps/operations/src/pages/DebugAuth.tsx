import { useClerkAuthContext } from '@/lib/clerk/ClerkAuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DebugAuth() {
  const { user, isLoading, isAuthenticated } = useClerkAuthContext();

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>🐛 Authentication Debug</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}
            </div>
            <div>
              <strong>Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}
            </div>
            <div>
              <strong>User Email:</strong> {user?.email || 'None'}
            </div>
            <div>
              <strong>Role ID:</strong> {user?.role?.role_id || 'None'}
            </div>
            <div>
              <strong>Role Name:</strong> {user?.role?.role_name || 'None'}
            </div>
            <div>
              <strong>Current Path:</strong> {window.location.pathname}
            </div>
            <div className="mt-4">
              <strong>Full User Data:</strong>
              <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
                {JSON.stringify(user, null, 2)}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}