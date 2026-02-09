import { Sparkles, Shield, Globe, CreditCard, Gift, Chrome } from "lucide-react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Card, CardContent } from "@/components/ui/Card";

const features = [
  {
    title: "Membership Tracking",
    description:
      "Connect your memberships in one place and keep them organized with a single, secure dashboard.",
    icon: CreditCard,
  },
  {
    title: "Benefit Discovery",
    description:
      "Surface hidden perks from your memberships so you can actually use what you pay for.",
    icon: Gift,
  },
  {
    title: "AI Recommendations",
    description:
      "Get personalized suggestions to optimize costs, avoid duplicates, and unlock new perks.",
    icon: Sparkles,
  },
  {
    title: "Privacy-First Design",
    description:
      "We never sell your data. Security and privacy are built into every workflow.",
    icon: Shield,
  },
  {
    title: "Chrome Extension",
    description:
      "Receive real-time alerts while browsing when you have benefits available on a site.",
    icon: Chrome,
  },
  {
    title: "Anywhere Access",
    description:
      "Access your benefits from the web app anytime, on any device.",
    icon: Globe,
  },
];

export default function Features() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-accent/5 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <Logo size="lg" showText={true} />
          </div>
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100 mb-3">
            Features
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Everything you need to uncover, organize, and maximize the benefits
            you already have.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="p-6">
                <CardContent className="p-0 space-y-3">
                  <Icon className="w-8 h-8 text-primary" />
                  <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                    {feature.title}
                  </h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="mb-10">
          <CardContent className="p-8 space-y-4">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              How to access these features
            </h2>
            <ul className="list-disc list-inside text-sm text-zinc-600 dark:text-zinc-400 space-y-2">
              <li>Use the web app for dashboards, benefits, and recommendations.</li>
              <li>Install the Chrome Extension for real-time alerts on the web.</li>
              <li>Add memberships anytime to refresh your recommendations.</li>
            </ul>
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
