import { Link } from 'wouter';
import { ArrowLeft, FileText } from 'lucide-react';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-5 py-8 pb-16">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button className="p-2 rounded-full hover:bg-card transition-colors" onClick={() => window.history.back()}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <FileText className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-black">Terms of Service</h1>
        </div>

        <p className="text-sm text-muted-foreground mb-8">
          Last updated: May 30, 2026
        </p>

        <div className="space-y-8 text-sm leading-relaxed">
          <Section title="1. Acceptance of Terms">
            <p>
              By accessing or using SkillLeague ("the App", "the Service"), you agree to be
              bound by these Terms of Service. If you do not agree to these terms, please do
              not use the App.
            </p>
          </Section>

          <Section title="2. Eligibility">
            <p>
              You must be at least 13 years old to use SkillLeague. By using the App you
              represent that you meet this requirement. If you are under 18, you must have
              consent from a parent or legal guardian.
            </p>
          </Section>

          <Section title="3. User Accounts">
            <p className="mb-3">
              You may sign in using Pi Network or Google. You are responsible for:
            </p>
            <ul className="list-disc list-inside space-y-1.5">
              <li>Maintaining the security of your account credentials</li>
              <li>All activity that occurs under your account</li>
              <li>Providing accurate information when creating your profile</li>
            </ul>
            <p className="mt-3">
              We reserve the right to suspend or terminate accounts that violate these terms.
            </p>
          </Section>

          <Section title="4. In-App Currency and Rewards">
            <p className="mb-3">
              SkillLeague uses DN$ (virtual points) and Pi for gameplay. Please note:
            </p>
            <ul className="list-disc list-inside space-y-1.5">
              <li>DN$ (virtual points) have no real-world monetary value unless explicitly stated</li>
              <li>DN$ and rewards are non-transferable between accounts</li>
              <li>We reserve the right to modify DN$ balances if obtained through exploits</li>
              <li>Virtual items and DN$ may be forfeited upon account termination</li>
            </ul>
          </Section>

          <Section title="5. Pi Network Integration">
            <p>
              Features involving Pi Network are subject to Pi Network's own Terms of Service.
              Any Pi-related transactions are governed by Pi Network's policies. SkillLeague
              is not responsible for Pi Network's availability or changes to their platform.
            </p>
          </Section>

          <Section title="6. Prohibited Conduct">
            <p className="mb-3">You agree not to:</p>
            <ul className="list-disc list-inside space-y-1.5">
              <li>Cheat, hack, or exploit bugs to gain unfair advantages</li>
              <li>Use bots, scripts, or automated tools to play the game</li>
              <li>Impersonate other users or SkillLeague staff</li>
              <li>Harass, threaten, or abuse other users</li>
              <li>Attempt to reverse-engineer or modify the App</li>
              <li>Post spam, offensive, or illegal content in community features</li>
              <li>Violate any applicable local, national, or international law</li>
            </ul>
          </Section>

          <Section title="7. Intellectual Property">
            <p>
              All content in SkillLeague — including graphics, code, game mechanics, and
              branding — is the property of SkillLeague and its licensors. You may not
              reproduce, distribute, or create derivative works without written permission.
            </p>
          </Section>

          <Section title="8. User-Generated Content">
            <p>
              By posting content in community features (such as posts or comments), you grant
              SkillLeague a non-exclusive, royalty-free license to display and moderate that
              content. You retain ownership of your content but are responsible for ensuring
              it does not violate these terms or any third-party rights.
            </p>
          </Section>

          <Section title="9. Disclaimer of Warranties">
            <p>
              SkillLeague is provided "as is" without warranties of any kind. We do not
              guarantee that the service will be uninterrupted, error-free, or free of harmful
              components. Use of the App is at your own risk.
            </p>
          </Section>

          <Section title="10. Limitation of Liability">
            <p>
              To the maximum extent permitted by law, SkillLeague shall not be liable for any
              indirect, incidental, special, or consequential damages arising from your use of
              the App, including loss of virtual items, data, or access to the service.
            </p>
          </Section>

          <Section title="11. Modifications to the Service">
            <p>
              We reserve the right to modify, suspend, or discontinue any part of the App at
              any time. We may also update these Terms of Service. Significant changes will be
              communicated via in-app notices. Continued use after changes constitutes
              acceptance.
            </p>
          </Section>

          <Section title="12. Termination">
            <p>
              We may suspend or terminate your access to SkillLeague at our discretion,
              including for violations of these terms. Upon termination, your right to use
              the App ceases immediately. Provisions that by their nature should survive
              termination will remain in effect.
            </p>
          </Section>

          <Section title="13. Governing Law">
            <p>
              These Terms are governed by and construed in accordance with applicable law.
              Any disputes arising from these Terms or the use of the App shall be resolved
              through good-faith negotiation, and if unresolved, through binding arbitration.
            </p>
          </Section>

          <Section title="14. Contact">
            <p>
              For questions regarding these Terms of Service, please contact us through the
              in-app feedback widget or support channel.
            </p>
          </Section>
        </div>

        <div className="mt-10 pt-6 border-t border-border space-y-2 text-xs text-muted-foreground text-center">
          <div>
            <Link href="/privacy">
              <span className="underline cursor-pointer hover:text-foreground transition-colors">Privacy Policy</span>
            </Link>
            {' · '}
            SkillLeague Terms of Service · v1.0
          </div>
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
