import type { Metadata } from 'next'
import AdminEditor from './AdminEditor'
import 'cropperjs/dist/cropper.css'
import './admin.css'

export const metadata: Metadata = {
  title: 'Websitebeheer | PWAMEDIA',
  description: 'Beheer de inhoud van je website.',
  robots: { index: false, follow: false },
}

export default function AdminPage() {
  return <AdminEditor />
}
