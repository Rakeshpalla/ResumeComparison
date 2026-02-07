import Link from "next/link";

export const metadata = {
  title: "Terms of Service | Resume Comparison Engine",
  description: "Terms of Service for the Resume Comparison Engine service"
};

export default function TermsPage() {
  return (
    <article className="prose prose-slate max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Terms of Service</h1>
      <p className="text-sm text-slate-500">Last updated: {new Date().toLocaleDateString("en-US")}</p>

      <section className="mt-6 space-y-4 text-slate-700">
        <h2 className="text-lg font-semibold text-slate-800">1. Acceptance</h2>
        <p>
          By using the Resume Comparison Engine (&quot;Service&quot;), you agree to these Terms of Service.
          If you do not agree, do not use the Service.
        </p>

        <h2 className="text-lg font-semibold text-slate-800">2. Description of Service</h2>
        <p>
          The Service allows you to upload resumes and job descriptions, compare candidates, and
          export results. We may change or discontinue features with reasonable notice where possible.
        </p>

        <h2 className="text-lg font-semibold text-slate-800">3. Your Responsibilities</h2>
        <p>
          You are responsible for: (a) keeping your account credentials secure; (b) ensuring you have
          the right to upload any documents you provide; (c) complying with applicable laws when using the Service.
        </p>

        <h2 className="text-lg font-semibold text-slate-800">4. Acceptable Use</h2>
        <p>
          You may not use the Service for illegal purposes, to infringe others&apos; rights, or to
          attempt to gain unauthorized access to our systems or other users&apos; data.
        </p>

        <h2 className="text-lg font-semibold text-slate-800">5. Data and Privacy</h2>
        <p>
          Our handling of data is described in our{" "}
          <Link href="/privacy" className="text-indigo-600 hover:underline">Privacy Policy</Link>.
        </p>

        <h2 className="text-lg font-semibold text-slate-800">6. Disclaimer</h2>
        <p>
          The Service is provided as is. We do not guarantee uninterrupted operation. Results are for
          assistance only and do not constitute legal or professional advice.
        </p>

        <h2 className="text-lg font-semibold text-slate-800">7. Limitation of Liability</h2>
        <p>
          To the extent permitted by law, we are not liable for indirect or consequential damages
          arising from your use of the Service.
        </p>

        <h2 className="text-lg font-semibold text-slate-800">8. Changes and Contact</h2>
        <p>
          We may update these terms from time to time. For questions, contact us at the support
          address provided in the Service.
        </p>
      </section>

      <p className="mt-8">
        <Link href="/login" className="text-indigo-600 hover:underline">Back to login</Link>
      </p>
    </article>
  );
}
