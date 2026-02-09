import { HeartHandshake, Target, Users, Shield, Mail, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-accent/5 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <Logo size="lg" showText={true} />
          </div>
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100 mb-3">
            About vogoplus.app
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            We help people unlock the full value of their memberships with
            privacy-first insights and AI-powered recommendations.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          <Card className="p-6">
            <CardContent className="p-0 space-y-3">
              <Target className="w-8 h-8 text-primary" />
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                Mission & Vision
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Our mission is to make membership benefits effortless to
                discover and use. We envision a world where everyone gets the
                value they pay for, without the fine print.
              </p>
            </CardContent>
          </Card>
          <Card className="p-6">
            <CardContent className="p-0 space-y-3">
              <HeartHandshake className="w-8 h-8 text-primary" />
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                Our Story
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                vogoplus.app was founded to solve a simple problem: valuable
                benefits go unused. We built a platform that turns scattered
                memberships into clear, actionable savings.
              </p>
            </CardContent>
          </Card>
          <Card className="p-6">
            <CardContent className="p-0 space-y-3">
              <Users className="w-8 h-8 text-primary" />
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                Team
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                We are a small team of builders and analysts with backgrounds
                in fintech, consumer subscriptions, and product design.
              </p>
              <p className="text-xs text-zinc-500">
                Founder and team bios will be added after review.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-10">
          <CardContent className="p-8 space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
                Company Values
              </h2>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="secondary">Privacy-first</Badge>
                <Badge variant="secondary">Transparency</Badge>
                <Badge variant="secondary">User empowerment</Badge>
              </div>
              <ul className="list-disc list-inside text-sm text-zinc-600 dark:text-zinc-400 space-y-2">
                <li>
                  We never sell user data. We design with privacy as the default.
                </li>
                <li>
                  We explain how recommendations are generated and what impacts them.
                </li>
                <li>
                  We help members take action and get real savings.
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
                Contact
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                Have questions or want to share feedback? We would love to hear
                from you.
              </p>
              <div className="flex flex-col gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <span>Security and privacy inquiries available on request.</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  <span>Support email to be confirmed by the team.</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" />
                  <a
                    href="https://app.vogoplus.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    https://app.vogoplus.app
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center space-x-4">
          <Link
            to="/login"
            className="text-primary hover:text-primary-dark transition-colors text-sm font-medium"
          >
            Sign In
          </Link>
          <span className="text-zinc-400">•</span>
          <Link
            to="/register"
            className="text-primary hover:text-primary-dark transition-colors text-sm font-medium"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
