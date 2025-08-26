import React, { useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';

export default function ClerkDebug() {
  const { isLoaded, userId, sessionId, getToken } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();
  const [envVars, setEnvVars] = useState<Record<string, string | boolean | undefined>>({});

  useEffect(() => {
    // Get environment variables for debugging
    setEnvVars({
      VITE_CLERK_PUBLISHABLE_KEY: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
      NODE_ENV: import.meta.env.NODE_ENV,
      MODE: import.meta.env.MODE,
      DEV: import.meta.env.DEV,
      PROD: import.meta.env.PROD,
    });
  }, []);

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Clerk Debug Information</h1>
      
      <div className="space-y-6">
        {/* Environment Variables */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Environment Variables</h2>
          <pre className="bg-white p-4 rounded border overflow-auto">
            {JSON.stringify(envVars, null, 2)}
          </pre>
        </div>

        {/* Clerk Auth State */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Clerk Auth State</h2>
          <div className="space-y-2">
            <p><strong>Auth Loaded:</strong> {isLoaded ? 'Yes' : 'No'}</p>
            <p><strong>User Loaded:</strong> {userLoaded ? 'Yes' : 'No'}</p>
            <p><strong>User ID:</strong> {userId || 'None'}</p>
            <p><strong>Session ID:</strong> {sessionId || 'None'}</p>
          </div>
        </div>

        {/* User Information */}
        {user && (
          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">User Information</h2>
            <pre className="bg-white p-4 rounded border overflow-auto">
              {JSON.stringify({
                id: user.id,
                emailAddresses: user.emailAddresses.map(e => e.emailAddress),
                firstName: user.firstName,
                lastName: user.lastName,
                fullName: user.fullName,
                hasImage: !!user.imageUrl,
                createdAt: user.createdAt,
                lastSignInAt: user.lastSignInAt,
              }, null, 2)}
            </pre>
          </div>
        )}

        {/* Clerk Instance Info */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Clerk Instance Info</h2>
          <p className="text-sm text-gray-600 mb-2">
            The Clerk publishable key starts with: 
            <code className="bg-white px-2 py-1 rounded ml-2">
              {envVars.VITE_CLERK_PUBLISHABLE_KEY?.substring(0, 20)}...
            </code>
          </p>
          
          {!isLoaded && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
              <strong>Warning:</strong> Clerk is not loaded. This could indicate:
              <ul className="list-disc list-inside mt-2">
                <li>Invalid publishable key</li>
                <li>Network connectivity issues</li>
                <li>Clerk service is down</li>
              </ul>
            </div>
          )}

          {isLoaded && !userId && (
            <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
              <strong>Info:</strong> Clerk is loaded but user is not authenticated.
              <br />
              <a href="/sign-in" className="underline">Click here to sign in</a>
            </div>
          )}

          {isLoaded && userId && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              <strong>Success:</strong> Clerk is loaded and user is authenticated!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}