import type { Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const viewport : Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export const metadata = {
  title: 'Yoga Booking - Gestiona tus clases de yoga',
  description: 'Plataforma simple para profesores y alumnos de yoga. Crea clases, gestiona reservas y conecta con tu comunidad. Creada por Fabricio A. Dupraz para su hermana, with <3!',
  keywords: 'yoga, clases, reservas, gestión, profesores, alumnos',
  authors: [{ name: 'Yoga Booking Team' }],
}

export default function RootLayout({ 
  children 
}:{
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icon.png" />
        <link rel="apple-touch-icon" type="image/png" sizes="180x180" href="/apple-icon.png" />
        <link rel="manifest" href="./manifest.json" />
      </head>
      <body className={inter.className}>
        <div className="min-h-screen bg-neutral-50">
          {children}
        </div>
      </body>
    </html>
  )
}
