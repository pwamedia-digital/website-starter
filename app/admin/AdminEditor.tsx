'use client'

import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Eye,
  LoaderCircle,
  LogOut,
  Monitor,
  Redo2,
  Save,
  Send,
  Smartphone,
  Undo2,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

type Service = { number: string; title: string; text: string }
type SiteContent = {
  company: { name: string; tagline: string; email: string; phone: string }
  hero: { eyebrow: string; title: string; text: string; primaryLabel: string; secondaryLabel: string }
  intro: { eyebrow: string; title: string; text: string }
  services: Service[]
  project: { eyebrow: string; title: string; text: string }
  contact: { eyebrow: string; title: string; text: string }
}

type BlockKey = keyof SiteContent
type Viewport = 'desktop' | 'mobile'

const REPOSITORY = 'pwamedia-digital/website-starter'
const CONTENT_PATH = 'content/site.json'
const BRANCH = 'main'
const TOKEN_KEY = 'pwamedia-cms-token'
const DRAFT_KEY = `pwamedia-cms-draft:${REPOSITORY}`

const blocks: { key: BlockKey; number: string; title: string; description: string }[] = [
  { key: 'company', number: '01', title: 'Logo, naam en contact', description: 'De vaste gegevens in de hoofding en onderaan de website.' },
  { key: 'hero', number: '02', title: 'Openingsblok', description: 'Het eerste en belangrijkste deel dat bezoekers te zien krijgen.' },
  { key: 'intro', number: '03', title: 'Over ons', description: 'Een korte introductie van het bedrijf en zijn aanpak.' },
  { key: 'services', number: '04', title: 'Diensten', description: 'De diensten, in dezelfde volgorde als op de website.' },
  { key: 'project', number: '05', title: 'Uitgelicht project', description: 'Een realisatie, product of referentie die extra aandacht verdient.' },
  { key: 'contact', number: '06', title: 'Contactblok', description: 'De afsluitende uitnodiging om contact op te nemen.' },
]

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

function decodeBase64(value: string) {
  const binary = atob(value.replace(/\n/g, ''))
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function encodeBase64(value: string) {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary)
}

function TextField({ label, value, onChange, multiline = false }: {
  label: string
  value: string
  onChange: (value: string) => void
  multiline?: boolean
}) {
  return (
    <label className="cms-field">
      <span>{label}</span>
      {multiline ? (
        <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  )
}

function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [token, setToken] = useState('')

  return (
    <main className="cms-login-page">
      <section className="cms-login-card">
        <div className="cms-monogram">P</div>
        <p className="cms-kicker">PWAMEDIA CMS</p>
        <h1>Je website beheren</h1>
        <p>Gebruik voorlopig het toegangstoken van deze testwebsite. De persoonlijke klantenlogin koppelen we hierna.</p>
        <form onSubmit={(event) => { event.preventDefault(); if (token.trim()) onLogin(token.trim()) }}>
          <label>
            <span>Toegangstoken</span>
            <input type="password" value={token} onChange={(event) => setToken(event.target.value)} autoComplete="current-password" />
          </label>
          <button type="submit" disabled={!token.trim()}>Aanmelden <ArrowUpRight size={18} /></button>
        </form>
        <small>Het token blijft alleen in dit browsertabblad bewaard.</small>
      </section>
    </main>
  )
}

function SitePreview({ site, viewport }: { site: SiteContent; viewport: Viewport }) {
  return (
    <div className={`cms-site-preview ${viewport}`}>
      <div className="preview-site-header"><strong>{site.company.name}</strong><span>Over ons&nbsp;&nbsp; Diensten&nbsp;&nbsp; Project&nbsp;&nbsp; Contact</span></div>
      <section className="preview-hero">
        <div><small>{site.hero.eyebrow}</small><h1>{site.hero.title}</h1><p>{site.hero.text}</p><button>{site.hero.primaryLabel}</button></div>
        <aside><b>01</b><strong>{site.company.tagline}</strong></aside>
      </section>
      <div className="preview-ticker">STRATEGIE • ONTWERP • ONTWIKKELING • OPVOLGING</div>
      <section className="preview-intro"><small>{site.intro.eyebrow}</small><h2>{site.intro.title}</h2><p>{site.intro.text}</p></section>
      <section className="preview-services"><small>ONZE AANPAK</small><h2>Van richting naar resultaat.</h2>{site.services.map((service) => <div key={service.number}><b>{service.number}</b><strong>{service.title}</strong><span>{service.text}</span></div>)}</section>
      <section className="preview-project"><div>CASE STUDY</div><article><small>{site.project.eyebrow}</small><h2>{site.project.title}</h2><p>{site.project.text}</p></article></section>
      <section className="preview-contact"><small>{site.contact.eyebrow}</small><h2>{site.contact.title}</h2><p>{site.contact.text}</p><strong>{site.company.email}<br />{site.company.phone}</strong></section>
    </div>
  )
}

export default function AdminEditor() {
  const [token, setToken] = useState('')
  const [site, setSite] = useState<SiteContent | null>(null)
  const [staged, setStaged] = useState<SiteContent | null>(null)
  const [published, setPublished] = useState<SiteContent | null>(null)
  const [contentSha, setContentSha] = useState('')
  const [openBlock, setOpenBlock] = useState<BlockKey>('company')
  const [viewport, setViewport] = useState<Viewport>('desktop')
  const [past, setPast] = useState<SiteContent[]>([])
  const [future, setFuture] = useState<SiteContent[]>([])
  const [loading, setLoading] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const loadContent = useCallback(async (activeToken: string) => {
    setLoading(true); setError('')
    try {
      const response = await fetch(`https://api.github.com/repos/${REPOSITORY}/contents/${CONTENT_PATH}?ref=${BRANCH}`, {
        headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${activeToken}`, 'X-GitHub-Api-Version': '2022-11-28' },
      })
      if (!response.ok) throw new Error(response.status === 401 ? 'Dit token wordt niet aanvaard.' : 'De website-inhoud kon niet worden geladen.')
      const file = await response.json() as { content: string; sha: string }
      const live = JSON.parse(decodeBase64(file.content)) as SiteContent
      const storedDraft = localStorage.getItem(DRAFT_KEY)
      const draft = storedDraft ? JSON.parse(storedDraft) as SiteContent : live
      setPublished(clone(live)); setStaged(clone(draft)); setSite(clone(draft)); setContentSha(file.sha)
      setPast([]); setFuture([])
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Aanmelden is niet gelukt.')
      sessionStorage.removeItem(TOKEN_KEY); setToken('')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    const savedToken = sessionStorage.getItem(TOKEN_KEY)
    if (savedToken) { setToken(savedToken); void loadContent(savedToken) }
  }, [loadContent])

  const login = (newToken: string) => {
    sessionStorage.setItem(TOKEN_KEY, newToken); setToken(newToken); void loadContent(newToken)
  }

  const updateSite = (producer: (next: SiteContent) => void) => {
    if (!site) return
    const previous = clone(site); const next = clone(site); producer(next)
    setPast((items) => [...items.slice(-49), previous]); setFuture([]); setSite(next); setNotice('')
  }

  const undo = () => {
    if (!site || past.length === 0) return
    const previous = past[past.length - 1]
    setPast((items) => items.slice(0, -1)); setFuture((items) => [clone(site), ...items].slice(0, 50)); setSite(clone(previous))
  }

  const redo = () => {
    if (!site || future.length === 0) return
    const next = future[0]
    setPast((items) => [...items, clone(site)].slice(-50)); setFuture((items) => items.slice(1)); setSite(clone(next))
  }

  const saveBlock = (key: BlockKey) => {
    if (!site || !staged) return
    const next = clone(staged)
    ;(next[key] as SiteContent[BlockKey]) = clone(site[key]) as SiteContent[BlockKey]
    setStaged(next); localStorage.setItem(DRAFT_KEY, JSON.stringify(next)); setNotice(`${blocks.find((block) => block.key === key)?.title} is opgeslagen.`)
  }

  const dirtyBlocks = useMemo(() => !site || !staged ? [] : blocks.filter((block) => !equal(site[block.key], staged[block.key])).map((block) => block.key), [site, staged])
  const hasDraftChanges = useMemo(() => !!staged && !!published && !equal(staged, published), [staged, published])
  const canPublish = !!site && dirtyBlocks.length === 0 && hasDraftChanges && !publishing

  const publish = async () => {
    if (!canPublish || !staged) return
    setPublishing(true); setError(''); setNotice('')
    try {
      const response = await fetch(`https://api.github.com/repos/${REPOSITORY}/contents/${CONTENT_PATH}`, {
        method: 'PUT',
        headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28' },
        body: JSON.stringify({ message: 'Publiceer website-inhoud via PWAMEDIA CMS', content: encodeBase64(`${JSON.stringify(staged, null, 2)}\n`), sha: contentSha, branch: BRANCH }),
      })
      if (!response.ok) throw new Error('Publiceren is niet gelukt. Herlaad de pagina en probeer opnieuw.')
      const result = await response.json() as { content: { sha: string } }
      setContentSha(result.content.sha); setPublished(clone(staged)); setSite(clone(staged)); setPast([]); setFuture([])
      localStorage.removeItem(DRAFT_KEY); setNotice('Gepubliceerd. Vercel zet de nieuwe inhoud nu online.')
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Publiceren is niet gelukt.') }
    finally { setPublishing(false) }
  }

  if (!token) return <><Login onLogin={login} />{error && <div className="cms-toast error">{error}</div>}</>
  if (loading || !site || !staged) return <main className="cms-loading"><LoaderCircle className="spin" /><span>Website-inhoud laden…</span></main>

  const isDirty = (key: BlockKey) => dirtyBlocks.includes(key)

  return (
    <main className="cms-app">
      <header className="cms-topbar">
        <div className="cms-identity"><div className="cms-monogram small">P</div><div><strong>PWAMEDIA CMS</strong><span>Website Starter</span></div></div>
        <div className="cms-top-actions">
          <button className="icon-button" onClick={undo} disabled={!past.length} aria-label="Ongedaan maken"><Undo2 size={19} /></button>
          <button className="icon-button" onClick={redo} disabled={!future.length} aria-label="Opnieuw uitvoeren"><Redo2 size={19} /></button>
          <button className="publish-button" onClick={publish} disabled={!canPublish}>{publishing ? <LoaderCircle className="spin" size={18} /> : <Send size={17} />} PUBLICEREN</button>
          <button className="icon-button logout" onClick={() => { sessionStorage.removeItem(TOKEN_KEY); setToken('') }} aria-label="Afmelden"><LogOut size={19} /></button>
        </div>
      </header>

      <div className="cms-workspace">
        <section className="cms-editor-pane">
          <div className="cms-editor-intro"><p>WEBSITE-INHOUD</p><h1>Wat wil je aanpassen?</h1><span>De blokken staan in dezelfde volgorde als op de website.</span></div>
          <div className="cms-block-list">
            {blocks.map((block) => (
              <article className={`cms-block ${openBlock === block.key ? 'open' : ''}`} key={block.key}>
                <button className="cms-block-heading" onClick={() => setOpenBlock(block.key)}>
                  <span className="block-number">{block.number}</span><span><strong>{block.title}</strong><small>{block.description}</small></span>
                  <span className={`block-status ${isDirty(block.key) ? 'dirty' : 'saved'}`}>{isDirty(block.key) ? 'Niet opgeslagen' : <><Check size={14} /> Opgeslagen</>}</span>
                  <ChevronDown className="block-chevron" size={20} />
                </button>
                {openBlock === block.key && (
                  <div className="cms-block-body">
                    {block.key === 'company' && <div className="field-grid"><TextField label="Bedrijfsnaam" value={site.company.name} onChange={(value) => updateSite((next) => { next.company.name = value })} /><TextField label="Korte slogan" value={site.company.tagline} onChange={(value) => updateSite((next) => { next.company.tagline = value })} /><TextField label="E-mailadres" value={site.company.email} onChange={(value) => updateSite((next) => { next.company.email = value })} /><TextField label="Telefoonnummer" value={site.company.phone} onChange={(value) => updateSite((next) => { next.company.phone = value })} /></div>}
                    {block.key === 'hero' && <><TextField label="Kleine bovenregel" value={site.hero.eyebrow} onChange={(value) => updateSite((next) => { next.hero.eyebrow = value })} /><TextField label="Grote titel" value={site.hero.title} onChange={(value) => updateSite((next) => { next.hero.title = value })} multiline /><TextField label="Introductietekst" value={site.hero.text} onChange={(value) => updateSite((next) => { next.hero.text = value })} multiline /><div className="field-grid"><TextField label="Eerste knop" value={site.hero.primaryLabel} onChange={(value) => updateSite((next) => { next.hero.primaryLabel = value })} /><TextField label="Tweede knop" value={site.hero.secondaryLabel} onChange={(value) => updateSite((next) => { next.hero.secondaryLabel = value })} /></div></>}
                    {block.key === 'intro' && <><TextField label="Kleine bovenregel" value={site.intro.eyebrow} onChange={(value) => updateSite((next) => { next.intro.eyebrow = value })} /><TextField label="Titel" value={site.intro.title} onChange={(value) => updateSite((next) => { next.intro.title = value })} multiline /><TextField label="Tekst" value={site.intro.text} onChange={(value) => updateSite((next) => { next.intro.text = value })} multiline /></>}
                    {block.key === 'services' && <div className="service-edit-list">{site.services.map((service, index) => <div className="service-edit-card" key={index}><span>Dienst {index + 1}</span><div className="field-grid service-fields"><TextField label="Nummer" value={service.number} onChange={(value) => updateSite((next) => { next.services[index].number = value })} /><TextField label="Titel" value={service.title} onChange={(value) => updateSite((next) => { next.services[index].title = value })} /></div><TextField label="Tekst" value={service.text} onChange={(value) => updateSite((next) => { next.services[index].text = value })} multiline /></div>)}</div>}
                    {block.key === 'project' && <><TextField label="Kleine bovenregel" value={site.project.eyebrow} onChange={(value) => updateSite((next) => { next.project.eyebrow = value })} /><TextField label="Titel" value={site.project.title} onChange={(value) => updateSite((next) => { next.project.title = value })} multiline /><TextField label="Tekst" value={site.project.text} onChange={(value) => updateSite((next) => { next.project.text = value })} multiline /></>}
                    {block.key === 'contact' && <><TextField label="Kleine bovenregel" value={site.contact.eyebrow} onChange={(value) => updateSite((next) => { next.contact.eyebrow = value })} /><TextField label="Titel" value={site.contact.title} onChange={(value) => updateSite((next) => { next.contact.title = value })} multiline /><TextField label="Tekst" value={site.contact.text} onChange={(value) => updateSite((next) => { next.contact.text = value })} multiline /></>}
                    <div className="block-save-row"><span>{isDirty(block.key) ? 'Bewaar dit blok om later te kunnen publiceren.' : 'Dit blok is opgeslagen.'}</span><button className="block-save-button" onClick={() => saveBlock(block.key)} disabled={!isDirty(block.key)}><Save size={17} /> OPSLAAN</button></div>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>

        <aside className="cms-preview-pane">
          <div className="preview-toolbar"><span><Eye size={16} /> Live voorbeeld</span><div><button className={viewport === 'desktop' ? 'active' : ''} onClick={() => setViewport('desktop')} aria-label="Desktopvoorbeeld"><Monitor size={17} /></button><button className={viewport === 'mobile' ? 'active' : ''} onClick={() => setViewport('mobile')} aria-label="Mobiel voorbeeld"><Smartphone size={17} /></button></div></div>
          <div className="preview-canvas"><SitePreview site={site} viewport={viewport} /></div>
        </aside>
      </div>

      {notice && <div className="cms-toast"><Check size={17} />{notice}</div>}
      {error && <div className="cms-toast error">{error}</div>}
    </main>
  )
}
