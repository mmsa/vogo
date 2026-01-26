import { Shield, Mail, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Card, CardContent } from "@/components/ui/Card";

export default function Privacy() {
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
            Privacy Policy
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Last Updated: {lastUpdated}
          </p>
        </div>

        {/* Privacy Policy Content */}
        <Card className="mb-8">
          <CardContent className="p-8 prose prose-zinc dark:prose-invert max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                Introduction
              </h2>
              <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                vogoplus.app ("we," "our," or "us") is committed to protecting
                your privacy. This Privacy Policy explains how we collect, use,
                and safeguard your information when you use the vogoplus.app
                Chrome Extension (the "Extension") and our web service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
                Information We Collect
              </h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                    Authentication Information
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-zinc-700 dark:text-zinc-300 ml-4">
                    <li>
                      <strong>Email Address</strong>: We collect your email
                      address when you create an account or sign in to the
                      Extension.
                    </li>
                    <li>
                      <strong>Password</strong>: Passwords are securely hashed
                      and never stored in plain text.
                    </li>
                    <li>
                      <strong>Access Tokens</strong>: We store authentication
                      tokens locally in your browser to maintain your login
                      session.
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                    Website Information
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-zinc-700 dark:text-zinc-300 ml-4">
                    <li>
                      <strong>URLs</strong>: When you browse the web, the
                      Extension sends the URL of the current page to our secure
                      backend API to check for relevant membership benefits.
                    </li>
                    <li>
                      <strong>Hostnames</strong>: We use website hostnames to
                      identify which sites match your registered membership
                      benefits.
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                    Usage Data
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-zinc-700 dark:text-zinc-300 ml-4">
                    <li>
                      <strong>Extension Interactions</strong>: We may collect
                      information about how you interact with the Extension
                      (e.g., when you open the popup, click buttons).
                    </li>
                    <li>
                      <strong>Tab Navigation</strong>: We access information
                      about your current browser tab only when you actively use
                      the Extension.
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                    Local Storage
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-zinc-700 dark:text-zinc-300 ml-4">
                    <li>
                      <strong>Preferences</strong>: We store your Extension
                      preferences (such as auto-open settings) locally in your
                      browser.
                    </li>
                    <li>
                      <strong>Cache</strong>: We cache benefit matching results
                      locally to improve performance and reduce API calls.
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
                How We Use Your Information
              </h2>
              <p className="text-zinc-700 dark:text-zinc-300 mb-3">
                We use the information we collect to:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-zinc-700 dark:text-zinc-300 ml-4">
                <li>
                  <strong>Provide Core Functionality</strong>: Match websites
                  you visit with your registered membership benefits and display
                  relevant alerts.
                </li>
                <li>
                  <strong>Authentication</strong>: Verify your identity and
                  maintain your login session.
                </li>
                <li>
                  <strong>Personalization</strong>: Provide personalized benefit
                  recommendations based on your memberships.
                </li>
                <li>
                  <strong>Performance</strong>: Cache results locally to improve
                  Extension performance and reduce server load.
                </li>
                <li>
                  <strong>Support</strong>: Respond to your inquiries and
                  provide customer support.
                </li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
                Data Storage and Security
              </h2>
              <ul className="list-disc list-inside space-y-2 text-zinc-700 dark:text-zinc-300 ml-4">
                <li>
                  <strong>Local Storage</strong>: Authentication tokens and
                  preferences are stored locally in your browser using Chrome's
                  secure storage API.
                </li>
                <li>
                  <strong>Backend Storage</strong>: Your membership and benefit
                  data is stored securely on our servers at app.vogoplus.app.
                </li>
                <li>
                  <strong>Encryption</strong>: All data transmitted between the
                  Extension and our servers is encrypted using HTTPS/TLS.
                </li>
                <li>
                  <strong>Access Control</strong>: We implement appropriate
                  technical and organizational measures to protect your data
                  against unauthorized access, alteration, disclosure, or
                  destruction.
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
                Data Sharing
              </h2>
              <p className="text-zinc-700 dark:text-zinc-300 mb-3 font-semibold">
                We do not sell, trade, or rent your personal information to
                third parties.
              </p>
              <p className="text-zinc-700 dark:text-zinc-300 mb-3">
                We may share your information only in the following
                circumstances:
              </p>
              <ul className="list-disc list-inside space-y-2 text-zinc-700 dark:text-zinc-300 ml-4">
                <li>
                  <strong>Service Providers</strong>: We may share data with
                  trusted service providers who assist us in operating our
                  service, subject to strict confidentiality agreements.
                </li>
                <li>
                  <strong>Legal Requirements</strong>: We may disclose
                  information if required by law or in response to valid legal
                  requests.
                </li>
                <li>
                  <strong>Business Transfers</strong>: In the event of a merger,
                  acquisition, or sale of assets, your information may be
                  transferred as part of that transaction.
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
                Your Rights
              </h2>
              <p className="text-zinc-700 dark:text-zinc-300 mb-3">
                You have the right to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-zinc-700 dark:text-zinc-300 ml-4">
                <li>
                  <strong>Access</strong>: Request access to the personal
                  information we hold about you.
                </li>
                <li>
                  <strong>Correction</strong>: Request correction of inaccurate
                  or incomplete information.
                </li>
                <li>
                  <strong>Deletion</strong>: Request deletion of your account
                  and associated data.
                </li>
                <li>
                  <strong>Opt-Out</strong>: Disable the Extension or delete your
                  account at any time.
                </li>
              </ul>
              <p className="text-zinc-700 dark:text-zinc-300 mt-4">
                To exercise these rights, contact us through the Extension's
                options page or via email.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
                Permissions Explained
              </h2>
              <p className="text-zinc-700 dark:text-zinc-300 mb-3">
                The Extension requests the following permissions:
              </p>
              <ul className="list-disc list-inside space-y-2 text-zinc-700 dark:text-zinc-300 ml-4">
                <li>
                  <strong>Storage</strong>: Used to store your authentication
                  token and preferences locally.
                </li>
                <li>
                  <strong>activeTab</strong>: Used to read the current tab's URL
                  when you open the Extension popup.
                </li>
                <li>
                  <strong>tabs</strong>: Used to query the active tab and open
                  new tabs to our web dashboard.
                </li>
                <li>
                  <strong>Host Permissions (&lt;all_urls&gt;)</strong>: Used to
                  send URLs to our API for benefit matching. We do not read or
                  modify page content.
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
                Children's Privacy
              </h2>
              <p className="text-zinc-700 dark:text-zinc-300">
                Our Extension is not intended for users under the age of 13. We
                do not knowingly collect personal information from children
                under 13.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
                Changes to This Privacy Policy
              </h2>
              <p className="text-zinc-700 dark:text-zinc-300">
                We may update this Privacy Policy from time to time. We will
                notify you of any changes by posting the new Privacy Policy on
                this page and updating the "Last Updated" date.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                <Mail className="h-6 w-6 text-primary" />
                Contact Us
              </h2>
              <p className="text-zinc-700 dark:text-zinc-300 mb-4">
                If you have questions about this Privacy Policy or our data
                practices, please contact us:
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

        {/* Footer Links */}
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
