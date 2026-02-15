import Link from "next/link";
import { buildMetadata } from "../../../lib/metadata";

export const metadata = buildMetadata({
  title: "Privacy Policy",
  description:
    "Privacy Policy for Resume Comparison Engine: what data we collect, how we use it, and your choices. We respect your privacy.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <article className="prose prose-slate max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Privacy Policy</h1>
      <p className="text-sm text-slate-500">Last updated: {new Date().toLocaleDateString("en-US")}</p>

      <section className="mt-6 space-y-4 text-slate-700">
        <h2 className="text-lg font-semibold text-slate-800">1. Overview</h2>
        <p>
          Resume Comparison Engine (&quot;we,&quot; &quot;our,&quot; or &quot;the Service&quot;) respects your privacy.
          This policy describes what data we collect, how we use it, and your choices.
        </p>

        <h2 className="text-lg font-semibold text-slate-800">2. Data We Collect</h2>
        <p>
          We collect: (a) account information (e.g. email, hashed password); (b) documents you upload
          (resumes, job descriptions) and metadata; (c) usage data (e.g. session activity) necessary to
          operate and improve the Service.
        </p>

        <h2 className="text-lg font-semibold text-slate-800">3. How We Use Data</h2>
        <p>
          We use your data to: provide and maintain the Service, process comparisons and exports,
          enforce our Terms of Service, and improve our product. We do not sell your personal data
          or documents to third parties.
        </p>

        <h2 className="text-lg font-semibold text-slate-800">4. Storage and Retention</h2>
        <p>
          Documents and session data are stored on secure infrastructure. We may retain data for the
          period described in the Service (e.g. document retention settings) and as required by law.
        </p>

        <h2 className="text-lg font-semibold text-slate-800">5. Sharing</h2>
        <p>
          We may share data with service providers that help us operate the Service (e.g. hosting,
          databases) under strict confidentiality. We may disclose data when required by law or to
          protect our rights and safety.
        </p>

        <h2 className="text-lg font-semibold text-slate-800">6. Security</h2>
        <p>
          We use industry-standard measures (encryption, access controls, secure storage) to protect
          your data. You are responsible for keeping your password secure.
        </p>

        <h2 className="text-lg font-semibold text-slate-800">7. Your Rights</h2>
        <p>
          Depending on your jurisdiction, you may have rights to access, correct, delete, or export
          your data. Contact us to exercise these rights. You may close your account at any time.
        </p>

        <h2 className="text-lg font-semibold text-slate-800">8. Cookies and Similar Technologies</h2>
        <p>
          We use session and authentication-related technologies necessary for the Service to function.
          We do not use third-party advertising cookies.
        </p>

        <h2 className="text-lg font-semibold text-slate-800">9. Changes</h2>
        <p>
          We may update this policy from time to time. We will indicate the &quot;Last updated&quot; date above.
          Continued use after changes constitutes acceptance.
        </p>

        <h2 className="text-lg font-semibold text-slate-800">10. Contact</h2>
        <p>
          For privacy-related questions or requests, contact us at the support or contact address
          provided in the Service or on our website.
        </p>
      </section>

      <p className="mt-8">
        <Link href="/login" className="text-indigo-600 hover:underline">← Back to login</Link>
      </p>
    </article>
  );
}
