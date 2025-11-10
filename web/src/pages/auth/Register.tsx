import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, Loader2, Mail, Lock, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/store/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Logo } from "@/components/Logo";

export default function Register() {
  const navigate = useNavigate();
  const login = useAuth((state) => state.login);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const passwordRequirements = {
    minLength: password.length >= 8,
    hasNumber: /\d/.test(password),
  };

  const isPasswordValid = passwordRequirements.minLength && passwordRequirements.hasNumber;
  const passwordsMatch = password === confirmPassword && password.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isPasswordValid) {
      setError("Password must be at least 8 characters and contain a number");
      return;
    }

    if (!passwordsMatch) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      // Register
      const registerResponse = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!registerResponse.ok) {
        const data = await registerResponse.json().catch(() => ({}));
        throw new Error(data.detail || "Registration failed");
      }

      // Auto-login after successful registration
      const loginResponse = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (loginResponse.ok) {
        const data = await loginResponse.json();
        await login(data.access_token, data.refresh_token);
        navigate("/");
      } else {
        // Registration succeeded but login failed, redirect to login page
        navigate("/login");
      }
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-white to-accent/5 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Logo size="lg" showText={true} />
          </div>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm mt-2">
            Intelligence for your benefits
          </p>
        </div>

        {/* Register Card */}
        <Card>
          <CardHeader>
            <CardTitle>Create your account</CardTitle>
            <CardDescription>
              Get started with vogoplus.app to unlock your benefits
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10"
                  />
                </div>
                {password && (
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2
                        className={`h-4 w-4 ${
                          passwordRequirements.minLength
                            ? "text-green-500"
                            : "text-zinc-300 dark:text-zinc-600"
                        }`}
                      />
                      <span
                        className={
                          passwordRequirements.minLength
                            ? "text-green-600 dark:text-green-400"
                            : "text-zinc-500"
                        }
                      >
                        At least 8 characters
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2
                        className={`h-4 w-4 ${
                          passwordRequirements.hasNumber
                            ? "text-green-500"
                            : "text-zinc-300 dark:text-zinc-600"
                        }`}
                      />
                      <span
                        className={
                          passwordRequirements.hasNumber
                            ? "text-green-600 dark:text-green-400"
                            : "text-zinc-500"
                        }
                      >
                        Contains a number
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="pl-10"
                  />
                </div>
                {confirmPassword && (
                  <div className="flex items-center gap-2 text-xs">
                    <CheckCircle2
                      className={`h-4 w-4 ${
                        passwordsMatch
                          ? "text-green-500"
                          : "text-zinc-300 dark:text-zinc-600"
                      }`}
                    />
                    <span
                      className={
                        passwordsMatch
                          ? "text-green-600 dark:text-green-400"
                          : "text-zinc-500"
                      }
                    >
                      Passwords match
                    </span>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                disabled={loading || !isPasswordValid || !passwordsMatch}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Creating account...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    Create account
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">
                Already have an account?{" "}
              </span>
              <Link
                to="/login"
                className="font-medium text-primary hover:text-primary-dark transition-colors"
              >
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

