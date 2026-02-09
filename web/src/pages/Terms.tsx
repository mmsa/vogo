import { FileText, Mail, Globe, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Card, CardContent } from "@/components/ui/Card";

export default function Terms() {
  const lastUpdated = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-accent/5 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="lg" showText={true} />
          </div>
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            Terms of Service
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Last Updated: {lastUpdated}
          </p>
        </div>

        <Card className="mb-8">
          <CardContent className="p-8 prose prose-zinc dark:prose-invert max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
                Agreement to Terms
              </h2>
              <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                These Terms of Service ("Terms") govern your access to and use
                of vogoplus.app (the "Service"), including the vogoplus.app
                website, web application, and Chrome Extension. By accessing or
                using the Service, you agree to be bound by these Terms. If you
                do not agree, do not use the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
                Use License
              </h2>
              <p className="text-zinc-700 dark:text-zinc-300 mb-3">
                We grant you a limited, non-exclusive, non-transferable,
                revocable license to access and use the Service for your
                personal, non-commercial purposes. You agree not to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-zinc-700 dark:text-zinc-300 ml-4">
                <li>Copy, modify, or distribute any part of the Service.</li>
                <li>Reverse engineer, decompile, or attempt to extract source code.</li>
                <li>Use the Service for unlawful, fraudulent, or abusive purposes.</li>
                <li>Interfere with or disrupt the Service or its infrastructure.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
                User Accounts & Passwords
              </h2>
              <p className="text-zinc-700 dark:text-zinc-300">
                You are responsible for maintaining the confidentiality of your
                account credentials and for all activities that occur under
                your account. Notify us immediately of any unauthorized access
                or security breach. We are not liable for losses caused by
                unauthorized use of your account.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
                User Data & Financial Information
              </h2>
              <p className="text-zinc-700 dark:text-zinc-300 mb-3">
                The Service may analyze membership and benefit information you
                provide to deliver personalized recommendations. We do not sell
                your personal information. Details about data collection and
                usage are described in our Privacy Policy.
              </p>
              <p className="text-zinc-700 dark:text-zinc-300">
                You represent that you have the right to provide any data you
                submit and that it is accurate and current.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
                Intellectual Property
              </h2>
              <p className="text-zinc-700 dark:text-zinc-300">
                The Service and its content, features, and functionality are
                owned by vogoplus.app and its licensors, and are protected by
                intellectual property laws. You retain ownership of content you
                submit, but you grant us a license to use it to operate and
                improve the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                Disclaimer of Warranties
              </h2>
              <p className="text-zinc-700 dark:text-zinc-300">
                The Service is provided "as is" and "as available" without
                warranties of any kind. We do not guarantee that the Service
                will be uninterrupted, error-free, or that recommendations will
                result in savings or benefits.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
                Limitation of Liability
              </h2>
              <p className="text-zinc-700 dark:text-zinc-300">
                To the maximum extent permitted by law, vogoplus.app shall not
                be liable for any indirect, incidental, special, consequential,
                or punitive damages, or any loss of profits or revenues, arising
                from your use of the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
                Termination
              </h2>
              <p className="text-zinc-700 dark:text-zinc-300">
                We may suspend or terminate your access to the Service at any
                time for violation of these Terms or for any reason. You may
                stop using the Service at any time. Upon termination, your
                right to use the Service will cease.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
                Modifications to Terms
              </h2>
              <p className="text-zinc-700 dark:text-zinc-300">
                We may update these Terms from time to time. We will post the
                updated Terms on this page and revise the "Last Updated" date.
                Continued use of the Service after changes become effective
                constitutes acceptance of the new Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
                Governing Law & Dispute Resolution
              </h2>
              <p className="text-zinc-700 dark:text-zinc-300">
                These Terms are governed by the laws of the jurisdiction where
                vogoplus.app is headquartered, without regard to conflict of
                law principles. Any disputes will be resolved in the courts of
                that jurisdiction unless otherwise required by law.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                <Mail className="h-6 w-6 text-primary" />
                Contact Information
              </h2>
              <p className="text-zinc-700 dark:text-zinc-300 mb-4">
                If you have questions about these Terms, please contact us:
              </p>
              <ul className="space-y-2 text-zinc-700 dark:text-zinc-300">
                <li className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  <strong>Website:</strong>{" "}
                  <a
                    href="https://app.vogoplus.app"
                    className="text-primary hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    https://app.vogoplus.app
                  </a>
                </li>
              </ul>
            </section>
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
