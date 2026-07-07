import { Link } from 'wouter';
import { ArrowLeft, FileText, AlertTriangle, UserCheck, Ban, Gavel, RefreshCw, ShieldAlert } from 'lucide-react';

export default function TermsOfService() {
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
            <FileText className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-black tracking-tight">Terms of Service</h1>
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
          <FileText className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            Please read these Terms of Service carefully before using{" "}
            <span className="font-semibold text-foreground">SkillLeague Social Channel (S.S.C)</span>.
            By accessing or using the platform, you agree to be bound by these terms. If you do not
            agree, you must not use S.S.C.
          </p>
        </div>

        <div className="space-y-10 text-sm leading-relaxed">

          <Section icon={<Gavel className="w-4 h-4" />} title="1. Acceptance of Terms">
            <p>
              By registering for, accessing, or using SkillLeague Social Channel ("S.S.C", "the App",
              "the Platform", "the Service"), you agree to be legally bound by these Terms of Service
              and our{" "}
              <Link href="/privacy">
                <span className="text-primary underline underline-offset-2 cursor-pointer">Privacy Policy</span>
              </Link>
              , which is incorporated herein by reference. These Terms constitute a legally binding
              agreement between you and S.S.C.
            </p>
            <p className="mt-3">
              S.S.C is built on the Pi Network ecosystem. Your use of Pi-related features is also
              governed by Pi Network's own Terms of Service and policies, which apply independently
              of these Terms.
            </p>
          </Section>

          <Section icon={<UserCheck className="w-4 h-4" />} title="2. Eligibility">
            <p>
              You must be at least <span className="font-semibold text-foreground">13 years of age</span> to
              use S.S.C. If you are between 13 and 18 years old, you represent that you have obtained
              consent from a parent or legal guardian to use the platform. By using S.S.C, you represent
              and warrant that you meet these eligibility requirements.
            </p>
          </Section>

          <Section icon={<UserCheck className="w-4 h-4" />} title="3. User Accounts and Responsibilities">
            <p className="mb-4">
              You may access S.S.C using your Pi Network account. You are solely responsible for:
            </p>
            <ul className="space-y-2.5 text-muted-foreground mb-4">
              {[
                "Maintaining the confidentiality and security of your account credentials",
                "All activity that occurs under your account, whether authorized by you or not",
                "Ensuring that any information you provide is accurate, current, and complete",
                "Complying with all applicable local, national, and international laws and regulations while using the platform",
                "Promptly notifying us of any unauthorized use of your account",
              ].map((item, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="text-primary font-bold shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p>
              You agree to use S.S.C in compliance with all applicable laws and regulations. You must
              not use the platform in any way that violates any law or regulation in your jurisdiction
              or any other jurisdiction.
            </p>
          </Section>

          <Section icon={<Ban className="w-4 h-4" />} title="4. Prohibited Activities">
            <p className="mb-4">
              You agree not to engage in any of the following prohibited activities:
            </p>

            <div className="space-y-3">
              <ProhibitedBlock label="Fraudulent or Deceptive Conduct">
                Engaging in fraud, phishing, impersonating other users or S.S.C staff, creating
                fake accounts, or misrepresenting your identity or affiliation in any way.
              </ProhibitedBlock>

              <ProhibitedBlock label="Spam and Unsolicited Content">
                Sending spam, bulk unsolicited messages, chain letters, or any form of
                unauthorized commercial communications through the platform.
              </ProhibitedBlock>

              <ProhibitedBlock label="Abusive or Harmful Behavior">
                Harassment, bullying, threatening, intimidating, or abusing other users in any way,
                including through private messages, public posts, or in-app interactions.
              </ProhibitedBlock>

              <ProhibitedBlock label="Hate Speech and Illegal Content">
                Publishing, uploading, or sharing content that promotes hate speech, discrimination,
                violence, or content that is illegal, obscene, defamatory, or infringes on any
                third-party rights including copyright.
              </ProhibitedBlock>

              <ProhibitedBlock label="Malicious Software and Security Attacks">
                Introducing viruses, malware, ransomware, spyware, or any other malicious code;
                attempting to gain unauthorized access to any part of the platform, its servers,
                databases, or connected systems; launching denial-of-service attacks.
              </ProhibitedBlock>

              <ProhibitedBlock label="Cheating and Platform Manipulation">
                Using bots, scripts, automated tools, exploits, or any unauthorized means to gain
                unfair advantages in gameplay, manipulate leaderboards, or interfere with the fair
                operation of the platform.
              </ProhibitedBlock>

              <ProhibitedBlock label="Intellectual Property Violations">
                Reproducing, distributing, or creating derivative works from any S.S.C content —
                including code, graphics, game mechanics, and branding — without explicit written
                permission. Uploading content that infringes copyright, trademark, or other
                intellectual property rights of any third party.
              </ProhibitedBlock>
            </div>
          </Section>

          <Section icon={<UserCheck className="w-4 h-4" />} title="5. User-Generated Content">
            <p className="mb-3">
              S.S.C allows users to create and share content including posts, comments, images, videos,
              and messages. You retain ownership of the content you create, but by publishing it on the
              platform you grant S.S.C a non-exclusive, royalty-free, worldwide license to display,
              store, and moderate that content as necessary to operate the platform.
            </p>
            <p>
              <span className="font-semibold text-foreground">You are solely responsible</span> for all
              content you publish. You represent and warrant that your content does not violate these
              Terms, any applicable law, or any third-party intellectual property rights. S.S.C reserves
              the right to remove any content that violates these Terms without prior notice.
            </p>
          </Section>

          <Section icon={<FileText className="w-4 h-4" />} title="6. Premium Subscriptions, Digital Products, and Pi Transactions">
            <p className="mb-3">
              S.S.C offers premium subscriptions and digital features accessible through Pi payments.
              All such transactions are subject to the following:
            </p>
            <ul className="space-y-2.5 text-muted-foreground">
              {[
                "All Pi payments are processed exclusively through the official Pi Network payment system and are governed by Pi Network's Terms of Service",
                "Premium subscriptions are tied to your Pi account and are valid for the stated duration (30 days); renewal requires a new payment",
                "DN$ (Denous) are non-monetary virtual points used within the platform; they have no real-world monetary value and are non-transferable between accounts",
                "Virtual items, DN$ balances, and rewards may be forfeited if your account is suspended or terminated for violations of these Terms",
                "We reserve the right to modify subscription pricing, features, digital products, and reward structures with reasonable notice",
                "Payments made through Pi Network are final and subject to Pi Network's own refund policies",
              ].map((item, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="text-primary font-bold shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section icon={<FileText className="w-4 h-4" />} title="7. Intellectual Property">
            <p>
              All content in S.S.C that is not user-generated — including but not limited to graphics,
              code, game mechanics, branding, logos, UI design, and written content — is the exclusive
              property of S.S.C and its licensors and is protected by applicable intellectual property
              laws. You are granted a limited, non-exclusive, non-transferable license to use the
              platform solely for its intended purpose.
            </p>
            <p className="mt-3">
              You may not reproduce, distribute, modify, create derivative works from, publicly display,
              or otherwise exploit any S.S.C intellectual property without express written permission.
            </p>
          </Section>

          <Section icon={<ShieldAlert className="w-4 h-4" />} title="8. Account Suspension and Termination">
            <p className="mb-3">
              S.S.C reserves the right to suspend, restrict, or permanently terminate your account at
              our sole discretion, with or without prior notice, for any of the following reasons:
            </p>
            <ul className="space-y-2.5 text-muted-foreground mb-4">
              {[
                "Violation of any provision of these Terms of Service",
                "Engaging in prohibited activities listed in Section 4",
                "Conduct that is harmful to other users, the platform, or third parties",
                "Providing false information during registration or use",
                "Any activity that we determine, in our sole discretion, to be inappropriate or harmful",
              ].map((item, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="text-primary font-bold shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p>
              Upon termination, your right to access and use S.S.C ceases immediately. Any provisions
              of these Terms that by their nature should survive termination — including intellectual
              property rights, disclaimers, and limitations of liability — shall remain in effect.
            </p>
          </Section>

          <Section icon={<AlertTriangle className="w-4 h-4" />} title="9. Disclaimers and Limitation of Liability">
            <p className="mb-3">
              <span className="font-semibold text-foreground">Service provided "as is":</span> S.S.C is
              provided on an "as is" and "as available" basis without warranties of any kind, whether
              express or implied. We do not guarantee that the service will be uninterrupted,
              error-free, secure, or free of harmful components.
            </p>
            <p className="mb-3">
              <span className="font-semibold text-foreground">No guarantee of availability:</span> We
              do not warrant continuous, uninterrupted, or secure access to the platform. Service may
              be affected by factors outside our control including network outages, maintenance, or
              third-party service disruptions (including Pi Network).
            </p>
            <p>
              <span className="font-semibold text-foreground">Limitation of liability:</span> To the
              maximum extent permitted by applicable law, S.S.C shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages arising from your use of or
              inability to use the platform, including loss of virtual items, data, access, or
              revenue.
            </p>
          </Section>

          <Section icon={<RefreshCw className="w-4 h-4" />} title="10. Modifications to the Service and Terms">
            <p className="mb-3">
              S.S.C reserves the right to modify, suspend, or discontinue any feature, subscription
              tier, service, or aspect of the platform at any time and without prior notice. We may
              add or remove features, change pricing, or adjust platform policies based on operational,
              legal, or business needs.
            </p>
            <p>
              We may also update these Terms of Service from time to time. When we do, we will update
              the effective date at the top of this document and may provide in-app notification of
              significant changes.{" "}
              <span className="font-semibold text-foreground">
                Your continued use of S.S.C after any changes to these Terms constitutes your
                acceptance of the revised Terms.
              </span>{" "}
              If you do not agree with updated Terms, you must stop using the platform.
            </p>
          </Section>

          <Section icon={<Gavel className="w-4 h-4" />} title="11. Governing Law and Dispute Resolution">
            <p>
              These Terms of Service and any disputes arising from them or from your use of S.S.C
              shall be governed by and construed in accordance with applicable international law.
              Any disputes shall first be attempted to be resolved through good-faith negotiation.
              If a dispute cannot be resolved informally, the parties agree to resolve it through
              binding arbitration or as otherwise required by applicable law.
            </p>
          </Section>

          <Section icon={<FileText className="w-4 h-4" />} title="12. Contact Us">
            <p>
              For questions, concerns, or legal requests regarding these Terms of Service, please
              contact us through:
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
            <Link href="/privacy">
              <span className="underline underline-offset-2 cursor-pointer hover:text-foreground transition-colors">
                Privacy Policy
              </span>
            </Link>
            <span>·</span>
            <span>Terms of Service</span>
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

function ProhibitedBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-red-500/15 bg-red-500/5 p-4">
      <p className="font-semibold text-red-400 text-xs uppercase tracking-wider mb-1.5">{label}</p>
      <p className="text-muted-foreground">{children}</p>
    </div>
  );
}
