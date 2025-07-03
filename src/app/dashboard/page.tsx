'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser, getUserProfile, signOut, supabase } from '@/lib/supabase'

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
  const [stats, setStats] = useState({
    totalClasses: 0,
    myReservations: 0,
    myClasses: 0
  })
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
      
      // Cargar estadísticas específicas según el rol
      await loadStats(userProfile)
    } catch (error) {
      console.error('Error loading user data:', error)
      // Si hay error de autenticación, redirigir al login
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async (userProfile: Profile) => {
    try {
      if (userProfile.role === 'teacher') {
        // Para profesores: contar clases creadas
        const { count: classCount } = await supabase
          .from('classes')
          .select('*', { count: 'exact', head: true })
          .eq('teacher_id', userProfile.id)

        setStats(prev => ({ ...prev, myClasses: classCount || 0 }))
      } else {
        // Para alumnos: contar reservas activas
        const { count: reservationCount } = await supabase
          .from('reservations')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', userProfile.id)

        setStats(prev => ({ ...prev, myReservations: reservationCount || 0 }))
      }

      // Para ambos roles: total de clases disponibles
      const { count: totalClassCount } = await supabase
        .from('classes')
        .select('*', { count: 'exact', head: true })

      setStats(prev => ({ ...prev, totalClasses: totalClassCount || 0 }))
    } catch (error) {
      console.error('Error loading stats:', error)
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  // Si no hay perfil, algo salió mal con la autenticación
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Error de autenticación</h2>
          <p className="text-gray-600 mt-2">Por favor, inicia sesión nuevamente</p>
          <Link href="/login" className="mt-4 inline-block bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
            Ir al Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header con navegación y logout */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-600">
                Bienvenido, {profile.full_name} ({profile.role === 'teacher' ? 'Profesor' : 'Alumno'})
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Tarjetas de estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                    <span className="text-white font-bold text-sm">A</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Estado
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {profile.role === 'teacher' ? 'Profesor Activo' : 'Alumno Activo'}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tarjetas de estadísticas - ANTES de las acciones rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <dt className="text-sm font-medium text-gray-500">Total de Clases</dt>
              <dd className="text-2xl font-semibold text-gray-900">{stats.totalClasses}</dd>
            </div>
          </div>
  
          {profile.role === 'teacher' ? (
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <dt className="text-sm font-medium text-gray-500">Mis Clases</dt>
              <dd className="text-2xl font-semibold text-gray-900">{stats.myClasses}</dd>
            </div>
          </div>
          ) : (
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <dt className="text-sm font-medium text-gray-500">Mis Reservas</dt>
              <dd className="text-2xl font-semibold text-gray-900">{stats.myReservations}</dd>
            </div>
          </div>
          )}
        </div>

        {/* Acciones rápidas según el rol */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Acciones Rápidas</h3>
          </div>
          <div className="p-6">
            {profile.role === 'teacher' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link
                  href="/manage-classes"
                  className="flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors duration-200"
                >
                  Gestionar Mis Clases
                </Link>
                <Link
                  href="/classes"
                  className="flex items-center justify-center px-6 py-3 border border-indigo-300 text-base font-medium rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors duration-200"
                >
                  Ver Todas las Clases
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link
                  href="/classes"
                  className="flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors duration-200"
                >
                  Explorar Clases
                </Link>
                <Link
                  href="/classes?filter=my-reservations"
                  className="flex items-center justify-center px-6 py-3 border border-indigo-300 text-base font-medium rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors duration-200"
                >
                  Mis Reservas
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Información contextual según el rol */}
        <div className="mt-8 bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              {profile.role === 'teacher' ? 'Panel de Profesor' : 'Panel de Alumno'}
            </h3>
          </div>
          <div className="p-6">
            {profile.role === 'teacher' ? (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Como profesor, puedes crear y gestionar tus clases de yoga. Cada clase puede tener 
                  horarios específicos, capacidad máxima y descripción detallada.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Funcionalidades disponibles:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>Crear nuevas clases con horarios personalizados</li>
                    <li>Editar información de clases existentes</li>
                    <li>Ver lista de alumnos inscritos en cada clase</li>
                    <li>Eliminar clases cuando sea necesario</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Como alumno, puedes explorar todas las clases disponibles y reservar tu lugar 
                  en las que más te interesen.
                </p>
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <h4 className="font-medium text-green-900 mb-2">Funcionalidades disponibles:</h4>
                  <ul className="text-sm text-green-800 space-y-1">
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

