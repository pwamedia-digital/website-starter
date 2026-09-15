import { ArrowDownRight, ArrowUpRight, Mail, Menu, Phone } from 'lucide-react'
import Image from 'next/image'
import site from '@/content/site.json'

type ManagedImage = { src: string; original?: string; alt: string }
type SiteWithImages = typeof site & {
  hero: typeof site.hero & { image?: ManagedImage }
  intro: typeof site.intro & { image?: ManagedImage }
  project: typeof site.project & { image?: ManagedImage }
}

export default function Home() {
  const content = site as SiteWithImages
  return (
    <main>
      <header className="site-header shell">
        <a className="brand" href="#top" aria-label={`${site.company.name} — naar boven`}>
          <span className="brand-mark">SN</span>
          <span>{site.company.name}</span>
        </a>
        <nav aria-label="Hoofdnavigatie">
          <a href="#over">Over ons</a>
          <a href="#diensten">Diensten</a>
          <a href="#project">Project</a>
          <a className="nav-cta" href="#contact">Contact <ArrowUpRight size={16} /></a>
        </nav>
        <details className="mobile-menu">
          <summary aria-label="Menu openen"><Menu /></summary>
          <div>
            <a href="#over">Over ons</a>
            <a href="#diensten">Diensten</a>
            <a href="#project">Project</a>
            <a href="#contact">Contact</a>
          </div>
        </details>
      </header>

      <section className="hero shell" id="top">
        <div className="hero-copy">
          <p className="eyebrow">{site.hero.eyebrow}</p>
          <h1>{site.hero.title}</h1>
          <p className="hero-text">{site.hero.text}</p>
          <div className="actions">
            <a className="button button-primary" href="#contact">{site.hero.primaryLabel}<ArrowDownRight size={18} /></a>
            <a className="button button-ghost" href="#project">{site.hero.secondaryLabel}</a>
          </div>
        </div>
        <div className={`hero-panel ${content.hero.image?.src ? 'has-image' : ''}`} aria-label={content.hero.image?.alt || 'Voorbeeld van een flexibel websiteblok'}>
          {content.hero.image?.src && <Image className="hero-panel-image" src={content.hero.image.src} alt={content.hero.image.alt} fill priority sizes="(max-width: 800px) calc(100vw - 30px), 280px" />}
          {content.hero.image?.src && <span className="image-shade" aria-hidden="true" />}
          <div className="panel-number">01</div>
          <div className="panel-copy"><span>Doordacht digitaal</span><strong>{site.company.tagline}</strong></div>
        </div>
      </section>

      <div className="ticker" aria-hidden="true">
        <div>Strategie <span>•</span> Ontwerp <span>•</span> Ontwikkeling <span>•</span> Opvolging <span>•</span> Strategie <span>•</span> Ontwerp</div>
      </div>

      <section className="intro shell section" id="over">
        <p className="eyebrow">{content.intro.eyebrow}</p>
        <div className={`intro-grid ${content.intro.image?.src ? 'has-image' : ''}`}>
          {content.intro.image?.src && <div className="intro-image"><Image src={content.intro.image.src} alt={content.intro.image.alt} fill sizes="(max-width: 800px) calc(100vw - 30px), 48vw" /></div>}
          <h2>{content.intro.title}</h2>
          <p>{content.intro.text}</p>
        </div>
      </section>

      <section className="services section" id="diensten">
        <div className="shell section-heading">
          <p className="eyebrow">Onze aanpak</p>
          <h2>Van richting naar resultaat.</h2>
        </div>
        <div className="service-grid shell">
          {site.services.map((service) => (
            <article className="service-card" key={service.number}>
              <span>{service.number}</span>
              <div><h3>{service.title}</h3><p>{service.text}</p></div>
              <ArrowUpRight aria-hidden="true" />
            </article>
          ))}
        </div>
      </section>

      <section className="project shell section" id="project">
        <div className={`project-visual ${content.project.image?.src ? 'has-image' : ''}`}>{content.project.image?.src ? <Image src={content.project.image.src} alt={content.project.image.alt} fill sizes="(max-width: 800px) calc(100vw - 30px), 52vw" /> : <><span>Case study</span><strong>2026</strong></>}</div>
        <div className="project-copy">
          <p className="eyebrow">{site.project.eyebrow}</p>
          <h2>{site.project.title}</h2>
          <p>{site.project.text}</p>
          <a href="#contact">Bekijk de aanpak <ArrowUpRight size={18} /></a>
        </div>
      </section>

      <section className="contact section" id="contact">
        <div className="shell contact-grid">
          <div>
            <p className="eyebrow">{site.contact.eyebrow}</p>
            <h2>{site.contact.title}</h2>
            <p>{site.contact.text}</p>
          </div>
          <div className="contact-links">
            <a href={`mailto:${site.company.email}`}><Mail size={20} /><span>{site.company.email}</span><ArrowUpRight /></a>
            <a href={`tel:${site.company.phone.replaceAll(' ', '')}`}><Phone size={20} /><span>{site.company.phone}</span><ArrowUpRight /></a>
          </div>
        </div>
      </section>

      <footer className="shell footer">
        <span>© {new Date().getFullYear()} {site.company.name}</span>
        <span>Template door PWAMEDIA</span>
      </footer>
    </main>
  )
}
