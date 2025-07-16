'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Redirigir inmediatamente al login
    router.push('/login')
  }, [router])

  // Mostrar loading mientras redirige
  return (
    <div className="min-h-screen gradient-nature flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">🧘‍♀️</div>
        <div className="spinner h-8 w-8 mx-auto"></div>
        <p className="mt-4 text-neutral-600">Cargando...</p>
      </div>
    </div>
  )
}
