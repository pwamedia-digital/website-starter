'use client'

import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Eye,
  ImagePlus,
  LoaderCircle,
  LogOut,
  Monitor,
  Redo2,
  Save,
  Send,
  Smartphone,
  Trash2,
  Undo2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Cropper, { type ReactCropperElement } from 'react-cropper'

type Service = { number: string; title: string; text: string }
type ManagedImage = { src: string; original: string; alt: string }
type SiteContent = {
  company: { name: string; tagline: string; email: string; phone: string }
  hero: { eyebrow: string; title: string; text: string; primaryLabel: string; secondaryLabel: string; image?: ManagedImage }
  intro: { eyebrow: string; title: string; text: string; image?: ManagedImage }
  services: Service[]
  project: { eyebrow: string; title: string; text: string; image?: ManagedImage }
  contact: { eyebrow: string; title: string; text: string }
}

type BlockKey = keyof SiteContent
type Viewport = 'desktop' | 'mobile'
type ImageTarget = 'hero' | 'intro' | 'project'

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

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.onerror = () => reject(new Error('De foto kon niet worden verwerkt.'))
    reader.readAsDataURL(blob)
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, quality = .88) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('De uitsnede kon niet worden gemaakt.')), 'image/webp', quality)
  })
}

async function makeOriginal(image: HTMLImageElement, rotation: number) {
  const quarterTurn = rotation % 180 !== 0
  const sourceWidth = quarterTurn ? image.naturalHeight : image.naturalWidth
  const sourceHeight = quarterTurn ? image.naturalWidth : image.naturalHeight
  const scale = Math.min(1, 2400 / Math.max(sourceWidth, sourceHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(sourceWidth * scale); canvas.height = Math.round(sourceHeight * scale)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('De foto kon niet worden verwerkt.')
  context.translate(canvas.width / 2, canvas.height / 2)
  context.rotate(rotation * Math.PI / 180)
  context.scale(scale, scale)
  context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2)
  return canvasToBlob(canvas, .9)
}

function ImageCropper({ token, label, slug, aspect, ratioLabel, existingImage, onClose, onComplete }: {
  token: string
  label: string
  slug: string
  aspect: number
  ratioLabel: string
  existingImage?: ManagedImage
  onClose: () => void
  onComplete: (image: ManagedImage) => void
}) {
  const cropperRef = useRef<ReactCropperElement>(null)
  const objectUrlRef = useRef('')
  const [source, setSource] = useState(existingImage?.original || '')
  const [zoom, setZoom] = useState(1)
  const [minZoom, setMinZoom] = useState(.1)
  const [rotation, setRotation] = useState(0)
  const [alt, setAlt] = useState(existingImage?.alt || '')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
  }, [])

  const chooseFile = (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Kies een JPG-, PNG- of WebP-foto.'); return }
    if (file.size > 25 * 1024 * 1024) { setError('Deze foto is groter dan 25 MB. Kies een kleinere versie.'); return }
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = URL.createObjectURL(file)
    setSource(objectUrlRef.current); setZoom(1); setMinZoom(.1); setRotation(0); setError('')
  }

  const rotate = (degrees: number) => {
    cropperRef.current?.cropper.rotate(degrees)
    setRotation((value) => (value + degrees + 360) % 360)
  }

  const upload = async (path: string, content: string, message: string) => {
    const response = await fetch(`https://api.github.com/repos/${REPOSITORY}/contents/${path}`, {
      method: 'PUT',
      headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28' },
      body: JSON.stringify({ message, content, branch: BRANCH }),
    })
    if (!response.ok) throw new Error('De foto kon niet veilig worden opgeslagen. Probeer opnieuw.')
  }

  const apply = async () => {
    const cropperElement = cropperRef.current
    const cropper = cropperElement?.cropper
    if (!cropperElement || !cropper || !alt.trim()) return
    setUploading(true); setError('')
    try {
      const croppedCanvas = cropper.getCroppedCanvas({ width: 1600, height: Math.round(1600 / aspect), fillColor: '#101820', imageSmoothingEnabled: true, imageSmoothingQuality: 'high' })
      if (!croppedCanvas) throw new Error('De uitsnede kon niet worden gemaakt.')
      const [cropBlob, originalBlob] = await Promise.all([canvasToBlob(croppedCanvas), makeOriginal(cropperElement, rotation)])
      const stamp = Date.now()
      const croppedName = `${slug}-${stamp}.webp`
      const originalName = `${slug}-${stamp}-origineel.webp`
      const [cropBase64, originalBase64] = await Promise.all([blobToBase64(cropBlob), blobToBase64(originalBlob)])
      await upload(`public/uploads/${originalName}`, originalBase64, `Bewaar originele foto voor ${label}`)
      await upload(`public/uploads/${croppedName}`, cropBase64, `Bewaar uitsnede voor ${label}`)
      onComplete({ src: `/uploads/${croppedName}`, original: `/uploads/${originalName}`, alt: alt.trim() })
      onClose()
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'De foto kon niet worden opgeslagen.') }
    finally { setUploading(false) }
  }

  return (
    <div className="crop-modal" role="dialog" aria-modal="true" aria-label={`${label} uitsnijden`}>
      <div className="crop-dialog">
        <header><div><p>FOTO BEWERKEN</p><h2>{label}</h2></div><button onClick={onClose} aria-label="Sluiten"><X /></button></header>
        {!source ? (
          <label className="crop-dropzone"><ImagePlus size={34} /><strong>Kies een foto</strong><span>JPG, PNG of WebP · maximaal 25 MB</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseFile(event.target.files?.[0])} /></label>
        ) : (
          <div className="crop-main">
            <div className="crop-visual">
              <div className="crop-stage">
                <Cropper
                  ref={cropperRef}
                  src={source}
                  alt="Te bewerken foto"
                  style={{ width: '100%', height: '100%' }}
                  aspectRatio={aspect}
                  viewMode={1}
                  dragMode="move"
                  autoCropArea={.78}
                  background={false}
                  center
                  guides
                  highlight={false}
                  responsive
                  restore={false}
                  movable
                  rotatable
                  scalable
                  zoomable
                  zoomOnTouch
                  zoomOnWheel
                  wheelZoomRatio={.08}
                  cropBoxMovable
                  cropBoxResizable
                  toggleDragModeOnDblclick={false}
                  ready={() => {
                    const imageData = cropperRef.current?.cropper.getImageData()
                    const ratio = imageData ? imageData.width / imageData.naturalWidth : 1
                    setMinZoom(ratio)
                    setZoom(ratio)
                  }}
                  zoom={(event) => setZoom(event.detail.ratio)}
                />
                <span className="crop-hint">Sleep het kader of de foto · pak een hoek vast om het kader te wijzigen</span>
              </div>
            </div>
            <aside className="crop-controls">
              <div className="crop-setting"><div><strong>Uitsnede</strong><span>Versleep de vier hoeken of zijden van het kader.</span></div><b>{ratioLabel}</b></div>
              <label><span>Zoom foto</span><strong>{Math.round(zoom / Math.max(minZoom, .001) * 100)}%</strong><input type="range" min={minZoom} max={minZoom * 3} step={Math.max(minZoom / 100, .001)} value={zoom} onChange={(event) => cropperRef.current?.cropper.zoomTo(Number(event.target.value))} /></label>
              <div className="rotate-row"><span>Draaien</span><button onClick={() => rotate(-90)}>↶ 90°</button><button onClick={() => rotate(90)}>↷ 90°</button></div>
              <TextField label="Beschrijving voor toegankelijkheid" value={alt} onChange={setAlt} />
              <label className="replace-file"><ImagePlus size={16} /> Andere foto kiezen<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseFile(event.target.files?.[0])} /></label>
            </aside>
          </div>
        )}
        {error && <p className="crop-error">{error}</p>}
        <footer><span>Het origineel wordt eveneens bewaard, zodat je later opnieuw kunt uitsnijden.</span><button className="crop-apply" onClick={apply} disabled={!source || !alt.trim() || uploading}>{uploading ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />}{uploading ? 'Foto opslaan…' : 'Uitsnede toepassen'}</button></footer>
      </div>
    </div>
  )
}

function ImageField({ image, label, ratioLabel, onEdit, onRemove, onAltChange }: {
  image?: ManagedImage
  label: string
  ratioLabel: string
  onEdit: () => void
  onRemove: () => void
  onAltChange: (value: string) => void
}) {
  return (
    <div className="image-field">
      <div className="image-field-heading"><div><strong>{label}</strong><span>Aanbevolen uitsnede: {ratioLabel}</span></div>{image?.src && <button className="remove-image" onClick={onRemove}><Trash2 size={15} /> Verwijderen</button>}</div>
      {image?.src ? <><div className="current-image"><img src={image.src} alt="" /><button onClick={onEdit}><ImagePlus size={17} /> Foto vervangen of opnieuw uitsnijden</button></div><TextField label="Beschrijving voor toegankelijkheid" value={image.alt} onChange={onAltChange} /></> : <button className="add-image" onClick={onEdit}><ImagePlus size={22} /><span><strong>Foto toevoegen</strong><small>Uploaden, zoomen en uitsnijden</small></span></button>}
    </div>
  )
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
        <aside className={site.hero.image?.src ? 'with-image' : ''}>{site.hero.image?.src && <img src={site.hero.image.src} alt="" />}<b>01</b><strong>{site.company.tagline}</strong></aside>
      </section>
      <div className="preview-ticker">STRATEGIE • ONTWERP • ONTWIKKELING • OPVOLGING</div>
      <section className={`preview-intro ${site.intro.image?.src ? 'with-image' : ''}`}>{site.intro.image?.src && <img src={site.intro.image.src} alt="" />}<div><small>{site.intro.eyebrow}</small><h2>{site.intro.title}</h2><p>{site.intro.text}</p></div></section>
      <section className="preview-services"><small>ONZE AANPAK</small><h2>Van richting naar resultaat.</h2>{site.services.map((service) => <div key={service.number}><b>{service.number}</b><strong>{service.title}</strong><span>{service.text}</span></div>)}</section>
      <section className="preview-project"><div className={site.project.image?.src ? 'with-image' : ''}>{site.project.image?.src ? <img src={site.project.image.src} alt="" /> : 'CASE STUDY'}</div><article><small>{site.project.eyebrow}</small><h2>{site.project.title}</h2><p>{site.project.text}</p></article></section>
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
  const [cropTarget, setCropTarget] = useState<ImageTarget | null>(null)
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

  const imageSettings: Record<ImageTarget, { label: string; slug: string; aspect: number; ratioLabel: string }> = {
    hero: { label: 'Openingsfoto', slug: 'opening', aspect: 4 / 5, ratioLabel: '4:5 staand' },
    intro: { label: 'Foto bij Over ons', slug: 'over-ons', aspect: 16 / 9, ratioLabel: '16:9 breed' },
    project: { label: 'Projectfoto', slug: 'project', aspect: 4 / 3, ratioLabel: '4:3 liggend' },
  }

  const setManagedImage = (target: ImageTarget, image?: ManagedImage) => updateSite((next) => {
    if (image) next[target].image = image
    else delete next[target].image
  })

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
                    {block.key === 'hero' && <><ImageField image={site.hero.image} label="Openingsfoto" ratioLabel="4:5 staand" onEdit={() => setCropTarget('hero')} onRemove={() => setManagedImage('hero')} onAltChange={(value) => updateSite((next) => { if (next.hero.image) next.hero.image.alt = value })} /><TextField label="Kleine bovenregel" value={site.hero.eyebrow} onChange={(value) => updateSite((next) => { next.hero.eyebrow = value })} /><TextField label="Grote titel" value={site.hero.title} onChange={(value) => updateSite((next) => { next.hero.title = value })} multiline /><TextField label="Introductietekst" value={site.hero.text} onChange={(value) => updateSite((next) => { next.hero.text = value })} multiline /><div className="field-grid"><TextField label="Eerste knop" value={site.hero.primaryLabel} onChange={(value) => updateSite((next) => { next.hero.primaryLabel = value })} /><TextField label="Tweede knop" value={site.hero.secondaryLabel} onChange={(value) => updateSite((next) => { next.hero.secondaryLabel = value })} /></div></>}
                    {block.key === 'intro' && <><ImageField image={site.intro.image} label="Foto bij Over ons" ratioLabel="16:9 breed" onEdit={() => setCropTarget('intro')} onRemove={() => setManagedImage('intro')} onAltChange={(value) => updateSite((next) => { if (next.intro.image) next.intro.image.alt = value })} /><TextField label="Kleine bovenregel" value={site.intro.eyebrow} onChange={(value) => updateSite((next) => { next.intro.eyebrow = value })} /><TextField label="Titel" value={site.intro.title} onChange={(value) => updateSite((next) => { next.intro.title = value })} multiline /><TextField label="Tekst" value={site.intro.text} onChange={(value) => updateSite((next) => { next.intro.text = value })} multiline /></>}
                    {block.key === 'services' && <div className="service-edit-list">{site.services.map((service, index) => <div className="service-edit-card" key={index}><span>Dienst {index + 1}</span><div className="field-grid service-fields"><TextField label="Nummer" value={service.number} onChange={(value) => updateSite((next) => { next.services[index].number = value })} /><TextField label="Titel" value={service.title} onChange={(value) => updateSite((next) => { next.services[index].title = value })} /></div><TextField label="Tekst" value={service.text} onChange={(value) => updateSite((next) => { next.services[index].text = value })} multiline /></div>)}</div>}
                    {block.key === 'project' && <><ImageField image={site.project.image} label="Projectfoto" ratioLabel="4:3 liggend" onEdit={() => setCropTarget('project')} onRemove={() => setManagedImage('project')} onAltChange={(value) => updateSite((next) => { if (next.project.image) next.project.image.alt = value })} /><TextField label="Kleine bovenregel" value={site.project.eyebrow} onChange={(value) => updateSite((next) => { next.project.eyebrow = value })} /><TextField label="Titel" value={site.project.title} onChange={(value) => updateSite((next) => { next.project.title = value })} multiline /><TextField label="Tekst" value={site.project.text} onChange={(value) => updateSite((next) => { next.project.text = value })} multiline /></>}
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
      {cropTarget && <ImageCropper token={token} {...imageSettings[cropTarget]} existingImage={site[cropTarget].image} onClose={() => setCropTarget(null)} onComplete={(image) => setManagedImage(cropTarget, image)} />}
    </main>
  )
}
