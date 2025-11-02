import { useState } from 'react';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Building2, AlertCircle, Loader2 } from 'lucide-react';
import type { User, OrganizationMembership } from '../App';

// Mock data for demonstration
const MOCK_USER: User = {
  id: '1',
  email: 'john.doe@example.com',
  first_name: 'John',
  last_name: 'Doe',
  avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John'
};

const MOCK_ORGANIZATIONS: OrganizationMembership[] = [
  {
    organization: {
      id: '1',
      name: 'Soundwave Productions',
      type: 'ProductionCompany',
      url: 'https://soundwaveprod.com',
      city: 'Los Angeles',
      state: 'CA',
      country: 'USA',
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z'
    },
    role: 'Admin'
  },
  {
    organization: {
      id: '2',
      name: 'Lumina Lighting Co.',
      type: 'SoundLightingCompany',
      url: 'https://luminalighting.com',
      city: 'Nashville',
      state: 'TN',
      country: 'USA',
      created_at: '2024-02-20T10:00:00Z',
      updated_at: '2024-02-20T10:00:00Z'
    },
    role: 'Manager'
  },
  {
    organization: {
      id: '3',
      name: 'The Roxy Theater',
      type: 'Venue',
      address_line1: '9009 Sunset Blvd',
      city: 'West Hollywood',
      state: 'CA',
      postal_code: '90069',
      country: 'USA',
      created_at: '2024-03-10T10:00:00Z',
      updated_at: '2024-03-10T10:00:00Z'
    },
    role: 'Staff'
  }
];

interface LoginScreenProps {
  onLogin: (user: User, organizations: OrganizationMembership[]) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);

    // Simulate OAuth flow
    setTimeout(() => {
      // Simulate random error (10% chance)
      if (Math.random() < 0.1) {
        setError('Authentication failed. Please try again.');
        setIsLoading(false);
        return;
      }

      // Success - call onLogin with mock data
      onLogin(MOCK_USER, MOCK_ORGANIZATIONS);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-blue-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo and Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-sky-500 rounded-2xl mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-sky-900 mb-2">Gig Manager</h1>
          <p className="text-gray-600">Production and event management platform</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-gray-900 mb-6 text-center">Sign in to your account</h2>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Google OAuth Button */}
          <Button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full h-12 bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-300 hover:border-gray-400"
            variant="outline"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign in with Google
              </>
            )}
          </Button>

          {/* Additional Info */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Secure authentication powered by Google OAuth
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>© 2025 Gig Manager. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
