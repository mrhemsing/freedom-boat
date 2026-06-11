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

export default function ContactPage() {
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
        <p>Contact delivery is being set up. The form is staged here so it is ready to wire to an inbox.</p>
      </header>

      <section className="contactPanel" aria-label="Contact form">
        <form className="contactForm" aria-describedby="contactStatus">
          <fieldset disabled>
            <label>
              <span>Name</span>
              <input name="name" type="text" autoComplete="name" />
            </label>
            <label>
              <span>Email</span>
              <input name="email" type="email" autoComplete="email" />
            </label>
            <label>
              <span>Message</span>
              <textarea name="message" rows={7} />
            </label>
            <button className="seoButton seoButtonPrimary" type="submit">Email setup pending</button>
          </fieldset>
          <p id="contactStatus" className="contactStatus">This form is not connected to email yet.</p>
        </form>
      </section>
    </main>
  );
}
