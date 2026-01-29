'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Lock, Mail, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if already authenticated
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();
      if (response.ok && data.authenticated) {
        if (data.user?.role === 'manager') {
          router.push('/manager');

        } else if (data.user?.role === 'member') {
          router.push('/member');
        } else {
          // Instead of redirecting to root (which redirects to login), show error or stay on page
          console.error('Unknown role:', data.user?.role);
          setError('Account has no assigned role. Contact support.');
        }
      }
    } catch (error) {
      // Not authenticated, stay on login page
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        router.push(data.redirectUrl || '/member');
        router.refresh();
      } else {
        setError(data.error || 'Invalid email or password');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gray-200 rounded-full opacity-20 blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gray-200 rounded-full opacity-20 blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="w-full max-w-md relative z-10 animate-in fade-in duration-500 slide-in-from-bottom-4">
        <Card className="border-2 border-gray-200 shadow-2xl backdrop-blur-sm bg-white/95 hover:shadow-3xl transition-shadow duration-500">
          <CardHeader className="space-y-3 text-center pb-6">
            <div className="mx-auto w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mb-4 animate-in fade-in slide-in-from-top duration-700 hover:scale-110 transition-transform duration-300">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold text-gray-900 tracking-tight">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-gray-600 text-base">
              Sign in to access your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2 animate-in fade-in slide-in-from-left duration-500 delay-150">
                <Label htmlFor="email" className="text-sm font-semibold text-gray-900">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="shoghi@tcules.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 h-12 border-2 border-gray-300 focus:border-gray-900 transition-all duration-300 hover:border-gray-400 focus:ring-2 focus:ring-gray-900/20"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2 animate-in fade-in slide-in-from-left duration-500 delay-300">
                <Label htmlFor="password" className="text-sm font-semibold text-gray-900">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10 h-12 border-2 border-gray-300 focus:border-gray-900 transition-all duration-300 hover:border-gray-400 focus:ring-2 focus:ring-gray-900/20"
                    disabled={loading}
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3 animate-in fade-in slide-in-from-bottom duration-300">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-900 font-medium">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white text-base font-semibold transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed animate-in fade-in slide-in-from-bottom duration-500 delay-400"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
