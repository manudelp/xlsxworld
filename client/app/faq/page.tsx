import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Frequently Asked Questions | XLSX World",
  description: "Find answers to common questions about XLSX World, our tools, file safety, and more.",
};

const faqs = [
  {
    category: "General Information",
    questions: [
      {
        q: "What is XLSX World?",
        a: "XLSX World is a comprehensive toolkit designed to help you quickly convert, merge, split, and inspect Microsoft Excel (.xlsx) and CSV files directly from your browser without needing to install heavy software."
      },
      {
        q: "Do I need an account to use the tools?",
        a: "No, you don't need an account. Core features are available immediately, allowing you to optimize your workflow in seconds."
      },
      {
        q: "Is it completely free?",
        a: "Yes, our standard file processing tools are free to use. We aim to keep basic file manipulation accessible for everyone."
      }
    ]
  },
  {
    category: "Data & Privacy",
    questions: [
      {
        q: "Are my files safe?",
        a: "Absolutely. We take your privacy and data security very seriously. Your files are processed securely over encrypted connections safely."
      },
      {
        q: "Do you store my uploaded spreadsheets?",
        a: "No. Files are only kept temporarily while they are actively being processed by our automated systems and are automatically deleted shortly after your task is complete. We do not inspect or sell your data."
      }
    ]
  },
  {
    category: "Technical & Features",
    questions: [
      {
        q: "What file formats are supported?",
        a: "Our core tools support Microsoft Excel files (.xlsx) and Comma Separated Values (.csv). Some specific tools may only accept one format depending on the operation."
      },
      {
        q: "Is there a file size limit?",
        a: "To ensure fast processing speeds for all users, we enforce a reasonable file size limit per upload. Most typical spreadsheets will process without any issues."
      },
      {
        q: "Why did my conversion fail?",
        a: "Conversions usually fail if the file is corrupted, password-protected, or contains intricate macros/formatting that our automated parser cannot read. Try saving the file as a standard, unprotected .xlsx or .csv and trying again."
      }
    ]
  }
];

export default function FAQPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.flatMap(category => 
      category.questions.map(item => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.a
        }
      }))
    )
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="max-w-3xl mx-auto px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <h1 className="text-4xl font-semibold mb-4 text-foreground text-center">
          Frequently Asked Questions
        </h1>
        <p className="mb-10 text-lg leading-relaxed text-muted text-center">
          Find quick answers to common questions about our platform and tools.
        </p>

        <div className="space-y-12">
          {faqs.map((group, index) => (
            <section key={index}>
              <h2 className="text-2xl font-medium mb-6 text-foreground border-b border-border pb-2">
                {group.category}
              </h2>
              <div className="space-y-4">
                {group.questions.map((item, itemIdx) => (
                  <details
                    key={itemIdx}
                    className="group rounded-xl border border-border bg-primary-soft p-3 sm:p-5 [&_summary::-webkit-details-marker]:hidden"
                  >
                    <summary className="flex cursor-pointer items-center justify-between gap-1.5 text-foreground font-medium outline-none">
                      <span className="text-lg">{item.q}</span>
                      <span className="shrink-0 transition duration-300 group-open:-rotate-180">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-muted hover:text-foreground transition-colors"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </span>
                    </summary>

                    <p className="mt-4 leading-relaxed text-muted text-base">
                      {item.a}
                    </p>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="mt-16 text-center rounded-xl border border-border bg-primary-soft p-8">
          <h2 className="text-xl font-medium text-foreground mb-3">
            Still have questions?
          </h2>
          <p className="text-muted mb-6">
            If you couldn&apos;t find the answer you were looking for, our team is always happy to help.
          </p>
          <Link
            href="/contact"
            className="inline-flex justify-center items-center rounded-md bg-foreground text-background px-6 py-2.5 text-sm font-medium transition-all hover:bg-muted focus:outline-none focus:ring-2 focus:ring-foreground focus:ring-offset-2"
          >
            Contact Support
          </Link>
        </section>
      </main>
    </>
  );
}