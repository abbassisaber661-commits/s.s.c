import { Link } from 'wouter';
import { ArrowLeft, Shield, Lock, Eye, Trash2, Bell, Database, Globe } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-5 py-8 pb-20">

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <button
            className="p-2 rounded-full hover:bg-card transition-colors"
            onClick={() => window.history.back()}
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-black tracking-tight">Privacy Policy</h1>
          </div>
        </div>

        <div className="ml-11 mb-8 space-y-1">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">SkillLeague Social Channel (S.S.C)</span>
          </p>
          <p className="text-xs text-muted-foreground">Effective date: July 1, 2026 · Last updated: July 7, 2026</p>
        </div>

        {/* Intro banner */}
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 mb-10 flex gap-3">
          <Lock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            At <span className="font-semibold text-foreground">SkillLeague Social Channel (S.S.C)</span>, your
            privacy matters. This Privacy Policy explains what information we collect, how we use it, and the
            choices you have. We are committed to handling your personal data responsibly and transparently.
          </p>
        </div>

        <div className="space-y-10 text-sm leading-relaxed">

          <Section icon={<Globe className="w-4 h-4" />} title="1. About SkillLeague (S.S.C)">
            <p>
              SkillLeague Social Channel (S.S.C) is a competitive social platform that combines skill-based
              games, live tournaments, social features, a creator economy, and digital rewards in one
              integrated experience. The platform is built on the Pi Network ecosystem and is accessible
              through the Pi Browser.
            </p>
            <p className="mt-3">
              By using S.S.C, you acknowledge that you have read and understood this Privacy Policy and
              consent to the practices described herein.
            </p>
          </Section>

          <Section icon={<Database className="w-4 h-4" />} title="2. Information We Collect">
            <p className="mb-4">
              We collect only the information necessary to operate and improve the platform. This includes:
            </p>

            <div className="space-y-4">
              <InfoBlock label="Pi Network Account Information">
                When you authenticate through the Pi Network SDK, we receive your Pi username and
                a unique Pi user ID (UID) provided by the official Pi SDK. We do not access your
                Pi wallet balance, private keys, seed phrase, or full transaction history beyond
                what is explicitly shared through an approved Pi payment.
              </InfoBlock>

              <InfoBlock label="User Profile Information">
                Display name, profile photo (if uploaded), bio, and any other optional profile
                details you choose to provide within the platform.
              </InfoBlock>

              <InfoBlock label="User-Generated Content">
                Posts, comments, images, videos, messages, and any other content you publish or
                share through the platform's social and community features.
              </InfoBlock>

              <InfoBlock label="Gameplay and Platform Activity">
                Match history, scores, league standings, achievements, DN$ balance, XP progress,
                subscription status, and in-app interactions.
              </InfoBlock>

              <InfoBlock label="Device and Usage Information">
                Browser type, operating system, approximate timezone, session timestamps, and
                feature usage patterns. This data is used solely for platform security, fraud
                prevention, and improving the application experience.
              </InfoBlock>
            </div>
          </Section>

          <Section icon={<Eye className="w-4 h-4" />} title="3. How We Use Your Information">
            <p className="mb-4">
              Information collected is used exclusively for the following purposes:
            </p>
            <ul className="space-y-2.5">
              {[
                "Authentication — verifying your identity through the Pi Network SDK",
                "Platform functionality — enabling gameplay, leagues, social features, and the creator economy",
                "Security and fraud prevention — detecting cheating, abuse, and unauthorized access",
                "Community moderation — enforcing community standards and these Terms of Service",
                "Social features — powering profiles, posts, follows, messages, gifts, and notifications",
                "Premium subscriptions — managing your subscription status and access level",
                "Pi transactions — processing payments through the official Pi Network payment system",
                "Platform improvement — understanding how features are used to make S.S.C better",
              ].map((item, i) => (
                <li key={i} className="flex gap-2.5 text-muted-foreground">
                  <span className="text-primary font-bold shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 rounded-xl border border-green-500/20 bg-green-500/5 p-4">
              <p className="font-semibold text-green-400 text-xs uppercase tracking-wider mb-1">Our Commitment</p>
              <p className="text-muted-foreground">
                We <span className="font-semibold text-foreground">never sell, rent, or trade</span> your
                personal information to third parties for marketing, advertising, or any other commercial
                purpose. Your data is used solely to provide and improve S.S.C.
              </p>
            </div>
          </Section>

          <Section icon={<Shield className="w-4 h-4" />} title="4. Pi Network Payments">
            <p>
              All Pi transactions within S.S.C — including premium subscriptions, digital gifts, and
              in-app purchases — are processed exclusively through the
              <span className="font-semibold text-foreground"> official Pi Network payment system</span>.
              We do not process, store, or have access to any payment credentials outside of the Pi SDK's
              approved payment flow.
            </p>
            <p className="mt-3">
              Pi payment identifiers and transaction records are stored in our database solely to fulfill
              your subscription or purchase and to prevent duplicate processing. These records are governed
              by Pi Network's own Terms and Privacy Policy in addition to ours.
            </p>
          </Section>

          <Section icon={<Globe className="w-4 h-4" />} title="5. Third-Party Services">
            <p className="mb-4">
              S.S.C integrates with the following third-party service:
            </p>
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div>
                <p className="font-semibold text-foreground text-xs uppercase tracking-wider mb-1">Pi Network SDK</p>
                <p className="text-muted-foreground">
                  Used for user authentication, identity verification, and processing Pi payments.
                  Subject to Pi Network's own Privacy Policy at{" "}
                  <a
                    href="https://minepi.com/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-2"
                  >
                    minepi.com/privacy-policy
                  </a>.
                </p>
              </div>
            </div>
            <p className="mt-4 text-muted-foreground">
              We encourage you to review the privacy policies of any third-party services we use, as their
              practices are independent of ours.
            </p>
          </Section>

          <Section icon={<Database className="w-4 h-4" />} title="6. Data Storage and Security">
            <p className="mb-3">
              Your data is stored on secure servers. We implement reasonable and industry-standard
              security measures to protect your information against unauthorized access, alteration,
              disclosure, or destruction. These measures include:
            </p>
            <ul className="space-y-2 text-muted-foreground">
              {[
                "Encrypted connections (HTTPS/TLS) for all data in transit",
                "Server-side authentication and authorization checks on all API endpoints",
                "Rate limiting and anomaly detection to prevent abuse",
                "Access controls that limit who within our team can access user data",
              ].map((item, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="text-primary font-bold shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-muted-foreground">
              While we take these precautions seriously, no method of transmission or storage over the
              internet is completely secure. We cannot guarantee absolute security, but we are committed
              to promptly addressing any breach we become aware of.
            </p>
          </Section>

          <Section icon={<Eye className="w-4 h-4" />} title="7. Data Retention">
            <p>
              We retain your account data for as long as your account is active or as needed to provide
              services. Server-side records (gameplay history, social content, subscription records) are
              retained for the duration of your account existence and for a reasonable period thereafter
              to comply with legal obligations and resolve disputes.
            </p>
          </Section>

          <Section icon={<Trash2 className="w-4 h-4" />} title="8. Your Rights and Account Deletion">
            <p className="mb-4">
              You have the following rights with respect to your personal data:
            </p>
            <ul className="space-y-2.5 text-muted-foreground">
              {[
                "Access — request a summary of the personal data we hold about you",
                "Correction — request correction of inaccurate or incomplete data",
                "Deletion — request deletion of your account and associated personal data",
                "Restriction — object to or request restriction of certain processing activities",
                "Portability — request a copy of your data in a structured, machine-readable format (where applicable)",
              ].map((item, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="text-primary font-bold shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4">
              To exercise any of these rights, please use the in-app feedback channel or contact us
              through the S.S.C support system. We will respond to your request within a reasonable
              timeframe. Note that certain data may be retained where required by law or for legitimate
              business purposes even after an account deletion request.
            </p>
          </Section>

          <Section icon={<Shield className="w-4 h-4" />} title="9. Children's Privacy">
            <p>
              S.S.C is not directed to children under the age of 13. We do not knowingly collect
              personal information from children under 13. If you believe that a child under 13 has
              provided personal information to us, please contact us immediately and we will take
              steps to delete such information.
            </p>
          </Section>

          <Section icon={<Bell className="w-4 h-4" />} title="10. Changes to This Privacy Policy">
            <p>
              We may update this Privacy Policy from time to time to reflect changes in our practices,
              technology, legal requirements, or other factors. When we make material changes, we will
              update the effective date at the top of this document. We may also provide an in-app
              notification for significant updates.
            </p>
            <p className="mt-3">
              <span className="font-semibold text-foreground">
                Your continued use of S.S.C after any changes to this Privacy Policy constitutes your
                acceptance of the revised policy.
              </span>{" "}
              If you do not agree with the updated policy, you should discontinue use of the platform.
            </p>
          </Section>

          <Section icon={<Globe className="w-4 h-4" />} title="11. Contact Us">
            <p>
              If you have questions, concerns, or requests regarding this Privacy Policy or the handling
              of your personal data, please contact us through:
            </p>
            <div className="mt-4 rounded-xl border border-border bg-card p-4 space-y-2 text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">In-app support:</span>{" "}
                Use the feedback or support option within the S.S.C application.
              </p>
              <p>
                <span className="font-medium text-foreground">Platform:</span>{" "}
                SkillLeague Social Channel (S.S.C) — available on Pi Browser
              </p>
            </div>
          </Section>

        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-border text-center space-y-3">
          <div className="flex justify-center gap-4 text-xs text-muted-foreground">
            <Link href="/terms">
              <span className="underline underline-offset-2 cursor-pointer hover:text-foreground transition-colors">
                Terms of Service
              </span>
            </Link>
            <span>·</span>
            <span>Privacy Policy</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2026 SkillLeague Social Channel (S.S.C) · All rights reserved
          </p>
        </div>

      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-primary">{icon}</span>
        <h2 className="text-base font-bold text-foreground">{title}</h2>
      </div>
      <div className="text-muted-foreground pl-6">{children}</div>
    </div>
  );
}

function InfoBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card/50 p-4">
      <p className="font-semibold text-foreground text-xs uppercase tracking-wider mb-2">{label}</p>
      <p className="text-muted-foreground">{children}</p>
    </div>
  );
}
