import { Link } from 'react-router-dom';
import { Zap, ArrowLeft, Mail, Phone, MapPin } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Business / contact details — SINGLE SOURCE OF TRUTH for every legal page.
// ⚠️ Replace `phone` with your real number before submitting the site to Razorpay.
// ─────────────────────────────────────────────────────────────────────────────
const BUSINESS = {
  name: 'ProjectPilot',
  owner: 'Aryan Damai',
  email: 'aryan123damai@gmail.com',
  phone: '+91 6001590207', // TODO: replace with your real phone number
  location: 'Tinsukia, Assam, India',
  updated: '15 June 2026',
};

// Shared page chrome so all four pages look identical and professional.
function LegalLayout({ title, children }) {
  return (
    <div className="min-h-screen bg-surface pt-20">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors mb-8">
          <ArrowLeft size={13} /> Back to home
        </Link>

        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-md bg-brand-500 flex items-center justify-center">
            <Zap size={12} className="text-white" />
          </div>
          <span className="text-sm font-medium text-white">Project<span className="text-brand-400">Pilot</span></span>
        </div>

        <h1 className="text-3xl font-bold text-white mb-1.5">{title}</h1>
        <p className="text-xs text-slate-500 mb-10">Last updated: {BUSINESS.updated}</p>

        <div className="space-y-8">{children}</div>

        <div className="mt-14 pt-6 border-t border-surface-border">
          <p className="text-xs text-slate-600">
            Questions about this page? Email us at{' '}
            <a href={`mailto:${BUSINESS.email}`} className="text-brand-400 hover:text-brand-300">{BUSINESS.email}</a>.
          </p>
        </div>
      </div>
    </div>
  );
}

// Small typographic helpers — keep the prose consistent across pages.
function H2({ children }) {
  return <h2 className="text-base font-semibold text-white mb-3">{children}</h2>;
}
function P({ children }) {
  return <p className="text-sm text-slate-400 leading-relaxed">{children}</p>;
}
function Section({ title, children }) {
  return (
    <section>
      <H2>{title}</H2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
function Bullets({ items }) {
  return (
    <ul className="space-y-2 list-disc list-inside marker:text-slate-600">
      {items.map((it, i) => (
        <li key={i} className="text-sm text-slate-400 leading-relaxed">{it}</li>
      ))}
    </ul>
  );
}

// ── Terms & Conditions ───────────────────────────────────────────────────────
export function TermsPage() {
  return (
    <LegalLayout title="Terms & Conditions">
      <P>
        Welcome to {BUSINESS.name} (“we”, “us”, “our”), a service operated by {BUSINESS.owner},
        based in {BUSINESS.location}. By accessing or using {BUSINESS.name} (the “Service”), you
        agree to these Terms &amp; Conditions. If you do not agree, please do not use the Service.
      </P>

      <Section title="1. What the Service does">
        <P>
          {BUSINESS.name} is an AI-powered tool that generates tailored software project ideas and
          detailed build plans (“deep dives”) to help students strengthen their portfolios for
          campus placements and job applications. Generating project ideas is free. A one-time
          payment unlocks unlimited deep dives.
        </P>
      </Section>

      <Section title="2. Accounts">
        <P>
          You can generate project ideas without an account. To save your history and access deep
          dives, you sign in with Google. You are responsible for activity under your account and
          for keeping your Google login secure. You must be at least 16 years old to create an account.
        </P>
      </Section>

      <Section title="3. Pricing & payments">
        <Bullets items={[
          'Generating the 5 project ideas is free.',
          'Signed-in users receive one full deep dive at no cost.',
          'A one-time payment of ₹49 unlocks unlimited deep dives, permanently, for your account ("lifetime unlock").',
          'Payments are processed securely by Razorpay. We do not collect or store your card, UPI, or banking details on our servers.',
          'Prices are shown in Indian Rupees (INR) and are inclusive of applicable taxes unless stated otherwise.',
        ]} />
      </Section>

      <Section title="4. Acceptable use">
        <P>You agree not to:</P>
        <Bullets items={[
          'Use the Service for any unlawful purpose or in violation of these Terms.',
          'Attempt to bypass the payment system, access controls, or rate limits.',
          'Scrape, resell, or commercially redistribute generated content as your own product.',
          'Disrupt, overload, or attempt to gain unauthorised access to our systems.',
        ]} />
      </Section>

      <Section title="5. Generated content & intellectual property">
        <P>
          Project ideas and deep dives are generated by AI for your personal educational use. You are
          free to build the projects described and use them in your own portfolio. The {BUSINESS.name}
          name, branding, website, and underlying software remain our property. AI-generated content
          is provided “as is” and may contain inaccuracies — always review and verify before relying on it.
        </P>
      </Section>

      <Section title="6. No guarantee of outcomes">
        <P>
          {BUSINESS.name} is an educational aid. We do not guarantee any job, internship, interview
          call, placement, or specific result. Outcomes depend on your own effort, skills, and many
          factors outside our control.
        </P>
      </Section>

      <Section title="7. Limitation of liability">
        <P>
          To the maximum extent permitted by law, {BUSINESS.name} and its operator shall not be liable
          for any indirect, incidental, or consequential damages arising from your use of the Service.
          Our total liability for any claim shall not exceed the amount you paid us in the preceding
          three months.
        </P>
      </Section>

      <Section title="8. Changes & termination">
        <P>
          We may update the Service or these Terms from time to time. Continued use after changes
          means you accept the updated Terms. We may suspend or terminate accounts that violate these Terms.
        </P>
      </Section>

      <Section title="9. Governing law">
        <P>
          These Terms are governed by the laws of India, and any disputes are subject to the
          jurisdiction of the courts of Assam, India.
        </P>
      </Section>

      <Section title="10. Contact">
        <P>
          For any questions about these Terms, email us at{' '}
          <a href={`mailto:${BUSINESS.email}`} className="text-brand-400 hover:text-brand-300">{BUSINESS.email}</a>.
        </P>
      </Section>
    </LegalLayout>
  );
}

// ── Privacy Policy ───────────────────────────────────────────────────────────
export function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy">
      <P>
        This Privacy Policy explains what information {BUSINESS.name} collects, how we use it, and the
        choices you have. By using the Service, you agree to this policy.
      </P>

      <Section title="1. Information we collect">
        <Bullets items={[
          'Account information: when you sign in with Google, we receive your name, email address, and profile picture.',
          'Generation inputs: the skills, target role, company, and available time you enter to generate projects.',
          'Resume content (optional): if you upload a resume, we process its text to extract your skills. We use it to pre-fill your inputs and do not permanently store the uploaded file.',
          'Saved generations: for signed-in users, we store your generated project ideas and deep dives so you can revisit them.',
          'Technical data: basic logs needed to operate and secure the Service.',
        ]} />
      </Section>

      <Section title="2. What we do NOT collect">
        <P>
          We do not collect or store your payment card numbers, UPI IDs, or bank details. All payments
          are handled directly by Razorpay on their secure systems.
        </P>
      </Section>

      <Section title="3. How we use your information">
        <Bullets items={[
          'To generate project ideas and deep dives tailored to your inputs.',
          'To create your account, save your history, and apply your purchase.',
          'To operate, secure, and improve the Service.',
          'To respond to your support requests.',
        ]} />
      </Section>

      <Section title="4. Third-party services">
        <P>We rely on trusted third parties to run {BUSINESS.name}:</P>
        <Bullets items={[
          'Google — for sign-in (OAuth) and for the AI model that generates content.',
          'Razorpay — to securely process payments.',
          'Cloud infrastructure providers — to host our application and database.',
        ]} />
        <P>
          Your inputs (such as skills and target role) are sent to the AI provider solely to generate
          your results. These providers have their own privacy policies.
        </P>
      </Section>

      <Section title="5. Cookies">
        <P>
          We use a single secure, httpOnly authentication cookie to keep you signed in. It cannot be
          read by JavaScript and is used only to identify your session. We do not use third-party
          advertising or tracking cookies.
        </P>
      </Section>

      <Section title="6. Data retention">
        <P>
          We keep your account and saved generations for as long as your account is active. You can
          request deletion of your account and data at any time (see “Your rights” below).
        </P>
      </Section>

      <Section title="7. Security">
        <P>
          We protect your data with industry-standard measures, including encrypted connections (HTTPS)
          and secure authentication. No method of transmission over the internet is 100% secure, but we
          take reasonable steps to safeguard your information.
        </P>
      </Section>

      <Section title="8. Your rights">
        <P>
          You may request access to, correction of, or deletion of your personal data by emailing{' '}
          <a href={`mailto:${BUSINESS.email}`} className="text-brand-400 hover:text-brand-300">{BUSINESS.email}</a>.
          We will respond within a reasonable timeframe.
        </P>
      </Section>

      <Section title="9. Children">
        <P>
          The Service is intended for users aged 16 and above. We do not knowingly collect data from
          children under 16.
        </P>
      </Section>

      <Section title="10. Changes to this policy">
        <P>
          We may update this Privacy Policy from time to time. The “Last updated” date above reflects
          the latest version.
        </P>
      </Section>
    </LegalLayout>
  );
}

// ── Refund & Cancellation Policy ─────────────────────────────────────────────
export function RefundPage() {
  return (
    <LegalLayout title="Refund & Cancellation Policy">
      <P>
        This policy explains refunds and cancellations for purchases made on {BUSINESS.name}.
      </P>

      <Section title="1. Our product">
        <P>
          {BUSINESS.name} sells a one-time ₹49 “lifetime unlock” that instantly gives your account
          unlimited access to project deep dives. This is a digital product delivered immediately upon
          successful payment.
        </P>
      </Section>

      <Section title="2. Refunds">
        <P>
          Because deep dives are delivered instantly upon payment, the ₹49 unlock is non-refundable.
          However, we want every payment to be fair:
        </P>
        <Bullets items={[
          'If you were charged but did not receive access, contact us and we will fix it or refund you.',
          'If you were accidentally charged more than once for the same account, we will refund the duplicate charge.',
          'Verified refunds are processed to your original payment method within 5–7 business days.',
        ]} />
      </Section>

      <Section title="3. Cancellation">
        <P>
          The ₹49 unlock is a one-time purchase, not a subscription. There is no recurring billing, so
          there is nothing to cancel and you will never be charged again.
        </P>
      </Section>

      <Section title="4. How to request help">
        <P>
          Email{' '}
          <a href={`mailto:${BUSINESS.email}`} className="text-brand-400 hover:text-brand-300">{BUSINESS.email}</a>{' '}
          with your registered email address and your Razorpay Payment ID (from the payment receipt).
          We will respond within 2 business days.
        </P>
      </Section>
    </LegalLayout>
  );
}

// ── Contact Us ───────────────────────────────────────────────────────────────
export function ContactPage() {
  const rows = [
    { icon: <Mail size={16} className="text-brand-400" />, label: 'Email', value: BUSINESS.email, href: `mailto:${BUSINESS.email}` },
    { icon: <Phone size={16} className="text-brand-400" />, label: 'Phone', value: BUSINESS.phone, href: `tel:${BUSINESS.phone.replace(/\s/g, '')}` },
    { icon: <MapPin size={16} className="text-brand-400" />, label: 'Location', value: BUSINESS.location },
  ];

  return (
    <LegalLayout title="Contact Us">
      <P>
        Have a question, a payment issue, or feedback? We'd genuinely like to hear from you.
        {BUSINESS.name} is operated by {BUSINESS.owner}. Reach us through any of the channels below.
      </P>

      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-4 glass-card rounded-xl p-4">
            <div className="w-9 h-9 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
              {r.icon}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500">{r.label}</p>
              {r.href
                ? <a href={r.href} className="text-sm text-white hover:text-brand-400 transition-colors break-all">{r.value}</a>
                : <p className="text-sm text-white break-all">{r.value}</p>}
            </div>
          </div>
        ))}
      </div>

      <Section title="Support hours">
        <P>
          We typically respond to emails within 2 business days (Monday–Saturday). For payment-related
          issues, please include your registered email and Razorpay Payment ID so we can help faster.
        </P>
      </Section>
    </LegalLayout>
  );
}
