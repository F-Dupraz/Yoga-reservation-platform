'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser, getUserProfile, signOut } from '@/lib/supabase'

type Profile = {
  id: string
  email: string
  full_name: string
  role: 'teacher' | 'student'
  created_at: string
  updated_at: string
}

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Cargar datos del usuario y estadísticas al montar el componente
  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      // Obtener usuario actual y su perfil completo
      const currentUser = await getCurrentUser()

      if (!currentUser) {
        throw new Error('No se pudo obtener el usuario actual')
      }

      const userProfile = await getUserProfile(currentUser.id)
      
      setProfile(userProfile)

    } catch (error) {
      console.error('Error loading user data:', error)
      // Si hay error de autenticación, redirigir al login
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut()
      router.push('/')
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  // Mostrar loading mientras carga la información del usuario
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner h-12 w-12"></div>
      </div>
    )
  }

  // Si no hay perfil, algo salió mal con la autenticación
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-neutral-900">Error de autenticación</h2>
          <p className="text-neutral-600 mt-2">Por favor, inicia sesión nuevamente</p>
          <Link href="/login" className="mt-4 inline-block btn-primary">
            Ir al Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header con navegación y logout */}
      <div className="bg-white shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900">Dashboard</h1>
              <p className="text-sm text-neutral-600">
                Bienvenido, {profile.full_name} ({profile.role === 'teacher' ? 'Profesor' : 'Alumno'})
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="btn-danger"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Tarjetas de estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{backgroundColor: 'var(--primary-500)'}} >
                    <span className="text-white font-extrabold text-lg">{profile.full_name.slice(0, 2)}</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-neutral-500 truncate">
                      Estado
                    </dt>
                    <dd className="text-lg font-semibold text-neutral-900">
                      {profile.role === 'teacher' ? 'Profesor Activo' : 'Alumno Activo'}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Acciones rápidas según el rol */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-neutral-900">Acciones Rápidas</h3>
          </div>
          <div className="card-body">
            {profile.role === 'teacher' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link
                  href="/manage-classes"
                  className="btn-primary flex items-center justify-center"
                >
                  Gestionar Mis Clases
                </Link>
                <Link
                  href="/classes"
                  className="btn-outline flex items-center justify-center"
                >
                  Ver Todas las Clases
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link
                  href="/classes"
                  className="btn-primary flex items-center justify-center"
                >
                  Explorar Clases
                </Link>
                <Link
                  href="/classes?filter=my-reservations"
                  className="btn-outline flex items-center justify-center"
                >
                  Mis Reservas
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Información contextual según el rol */}
        <div className="mt-8 card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-neutral-900">
              {profile.role === 'teacher' ? 'Panel de Profesor' : 'Panel de Alumno'}
            </h3>
          </div>
          <div className="card-body">
            {profile.role === 'teacher' ? (
              <div className="space-y-4">
                <p className="text-neutral-600">
                  Como profesor, puedes crear y gestionar tus clases de yoga. Cada clase puede tener 
                  horarios específicos, capacidad máxima y descripción detallada.
                </p>
                <div className="yoga-section">
                  <h4 className="font-medium text-secondary-900 mb-2">Funcionalidades disponibles:</h4>
                  <ul className="text-sm text-secondary-800 space-y-1">
                    <li>Crear nuevas clases con horarios personalizados</li>
                    <li>Editar información de clases existentes</li>
                    <li>Ver lista de alumnos inscritos en cada clase</li>
                    <li>Eliminar clases cuando sea necesario</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-neutral-600">
                  Como alumno, puedes explorar todas las clases disponibles y reservar tu lugar 
                  en las que más te interesen.
                </p>
                <div className="yoga-section">
                  <h4 className="font-medium text-secondary-900 mb-2">Funcionalidades disponibles:</h4>
                  <ul className="text-sm text-secondary-800 space-y-1">
                    <li>Explorar todas las clases disponibles</li>
                    <li>Reservar lugar en clases que te interesen</li>
                    <li>Ver tus reservas activas</li>
                    <li>Cancelar reservas cuando sea necesario</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
