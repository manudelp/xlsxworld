import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | XLSX World",
  description: "Learn how XLSX World handles your data, files, and privacy.",
};

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <h1 className="text-4xl font-semibold mb-4 text-foreground text-center">
        Privacy Policy
      </h1>
      <p className="mb-10 text-lg leading-relaxed text-muted text-center">
        Last updated: {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
      </p>

      <div className="space-y-8 text-base leading-relaxed text-muted">
        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">File Handling</h2>
          <p>
            Files you upload are processed temporarily on our servers solely to
            perform the requested operation (convert, merge, split, inspect,
            etc.). Files are automatically deleted shortly after processing is
            complete. We do not read, inspect, sell, or share the contents of
            your files.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">Data We Collect</h2>
          <p>
            We collect only the minimum information needed to operate the
            service:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Contact form submissions (name, email, message) — used only to respond to you.</li>
            <li>Basic server logs (IP address, request timestamps) — used for security and abuse prevention.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">Cookies</h2>
          <p>
            We use essential cookies required for the site to function. We do
            not use tracking or advertising cookies.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">Third-Party Services</h2>
          <p>
            We use Cloudflare Turnstile for CAPTCHA verification on our contact
            form. Please refer to{" "}
            <a
              href="https://www.cloudflare.com/privacypolicy/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Cloudflare&apos;s Privacy Policy
            </a>{" "}
            for details on their data handling.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">Your Rights</h2>
          <p>
            You may contact us at any time to request deletion of any personal
            data we may hold. Use our{" "}
            <a href="/contact" className="text-primary hover:underline">
              contact form
            </a>{" "}
            to make a request.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">Changes</h2>
          <p>
            We may update this policy from time to time. Changes will be
            reflected on this page with an updated date.
          </p>
        </section>
      </div>
    </main>
  );
}
