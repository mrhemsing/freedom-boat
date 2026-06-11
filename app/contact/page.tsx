import type { Metadata } from 'next';
import { canonicalUrl } from '../../lib/seo-slugs';
import GlobalHeader from '../GlobalHeader';

export const metadata: Metadata = {
  title: 'Contact Fair Tide',
  description: 'Contact Fair Tide with boating planner questions, corrections, marina updates, or partnership notes.',
  alternates: {
    canonical: canonicalUrl('/contact')
  }
};

export default function ContactPage({
  searchParams
}: {
  searchParams?: { sent?: string };
}) {
  const isSent = searchParams?.sent === '1';

  return (
    <main className="container seoPage contactPage">
      <GlobalHeader active="contact" contextLabel="Contact" />
      <header className="seoHero contactHero">
        <nav className="seoBreadcrumb" aria-label="Breadcrumb">
          <a href="/">Home</a>
          <span>/</span>
          <span>Contact</span>
        </nav>
        <h1>Contact Fair Tide</h1>
        <p>Send marina corrections, forecast issues, partnership notes, or anything else that would make the planner more useful.</p>
      </header>

      <section className="contactPanel" aria-label="Contact form">
        {isSent ? (
          <div className="contactStatus success" role="status">
            <strong>Message sent.</strong>
            <span>Thanks for reaching out. We will review it soon.</span>
          </div>
        ) : null}
        <form className="contactForm" action="https://formsubmit.co/contact@fairtide.app" method="post">
          <input type="hidden" name="_subject" value="Fair Tide contact form" />
          <input type="hidden" name="_captcha" value="false" />
          <input type="hidden" name="_template" value="table" />
          <input type="hidden" name="_next" value="https://fairtide.app/contact?sent=1" />
          <label>
            <span>Name</span>
            <input name="name" type="text" autoComplete="name" required />
          </label>
          <label>
            <span>Email</span>
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            <span>Message</span>
            <textarea name="message" rows={7} required />
          </label>
          <button className="seoButton seoButtonPrimary" type="submit">Send message</button>
        </form>
      </section>
    </main>
  );
}
