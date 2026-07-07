import { Link } from 'wouter';
import { ArrowLeft, Shield } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-5 py-8 pb-16">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button className="p-2 rounded-full hover:bg-card transition-colors" onClick={() => window.history.back()}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-black">Privacy Policy</h1>
        </div>

        <p className="text-sm text-muted-foreground mb-8">
          Last updated: May 30, 2026
        </p>

        <div className="space-y-8 text-sm leading-relaxed">
          <Section title="1. Introduction">
            <p>
              S.S.C ("we", "us", or "our") is committed to protecting your privacy.
              This Privacy Policy explains how we collect, use, and safeguard your information
              when you use the S.S.C application.
            </p>
          </Section>

          <Section title="2. Information We Collect">
            <p className="mb-3">We collect the following types of information:</p>
            <ul className="list-disc list-inside space-y-1.5 text-muted-foreground">
              <li><span className="text-foreground font-medium">Account Data:</span> Username, authentication provider (Pi Network or Google), and user ID.</li>
              <li><span className="text-foreground font-medium">Gameplay Data:</span> Match history, scores, level progress, DN$ balance, achievements, and league standings.</li>
              <li><span className="text-foreground font-medium">Usage Data:</span> Session times, features used, and in-app interactions.</li>
              <li><span className="text-foreground font-medium">Device Data:</span> Browser type, operating system, and approximate timezone — used for session management only.</li>
            </ul>
          </Section>

          <Section title="3. How We Use Your Information">
            <ul className="list-disc list-inside space-y-1.5 text-muted-foreground">
              <li>To provide and maintain the game service</li>
              <li>To track and display your progress, rankings, and rewards</li>
              <li>To improve gameplay balance and detect cheating</li>
              <li>To send in-app notifications about rewards and events</li>
              <li>To comply with legal obligations</li>
            </ul>
          </Section>

          <Section title="4. Data Storage">
            <p>
              Most gameplay data is stored locally on your device using browser localStorage.
              Some data (such as leaderboard entries and session records) may be stored on
              our servers. We do not sell your personal data to third parties.
            </p>
          </Section>

          <Section title="5. Pi Network Integration">
            <p>
              If you sign in with Pi Network, authentication is handled through the Pi Network
              SDK. We receive your Pi username and a unique user ID. We do not access your
              Pi wallet balance, private keys, or transaction history.
            </p>
          </Section>

          <Section title="6. Third-Party Services">
            <p className="mb-3">We use the following third-party services:</p>
            <ul className="list-disc list-inside space-y-1.5 text-muted-foreground">
              <li><span className="text-foreground font-medium">Pi Network SDK:</span> For authentication and Pi Browser integration</li>
              <li><span className="text-foreground font-medium">Google OAuth:</span> For optional Google sign-in</li>
            </ul>
            <p className="mt-3">
              These services have their own privacy policies. We encourage you to review them.
            </p>
          </Section>

          <Section title="7. Data Retention">
            <p>
              Local data remains on your device until you clear your browser storage or
              uninstall the app. Server-side data is retained for the duration of your account.
              You may request deletion of your account data by contacting us.
            </p>
          </Section>

          <Section title="8. Children's Privacy">
            <p>
              S.S.C is not directed to children under the age of 13. We do not knowingly
              collect personal information from children under 13. If you believe a child has
              provided us with personal data, please contact us and we will delete it.
            </p>
          </Section>

          <Section title="9. Your Rights">
            <p className="mb-3">Depending on your location, you may have the right to:</p>
            <ul className="list-disc list-inside space-y-1.5 text-muted-foreground">
              <li>Access the personal data we hold about you</li>
              <li>Request correction or deletion of your data</li>
              <li>Object to or restrict processing of your data</li>
              <li>Data portability</li>
            </ul>
          </Section>

          <Section title="10. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. We will notify you of
              significant changes via an in-app notice. Continued use of the app after
              changes constitutes acceptance of the updated policy.
            </p>
          </Section>

          <Section title="11. Contact Us">
            <p>
              If you have questions or concerns about this Privacy Policy, please contact us
              through the S.S.C support channel or via the feedback widget in the app.
            </p>
          </Section>
        </div>

        <div className="mt-10 pt-6 border-t border-border text-xs text-muted-foreground text-center">
          S.S.C · Privacy Policy · v1.0
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-base font-bold mb-3 text-foreground">{title}</h2>
      <div className="text-muted-foreground">{children}</div>
    </div>
  );
}
