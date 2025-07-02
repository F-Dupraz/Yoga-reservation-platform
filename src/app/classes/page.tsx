'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser, getUserProfile, supabase } from '@/lib/supabase'

export default function ClassesPage() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [classes, setClasses] = useState([])
  const [userReservations, setUserReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [reservationLoading, setReservationLoading] = useState(null)
  const [filter, setFilter] = useState('all')
  const router = useRouter()
  const searchParams = useSearchParams()

  // Mapeo de días de la semana para mostrar texto legible
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

  useEffect(() => {
    // Verificar si hay filtro en URL (para "Mis Reservas" desde dashboard)
    const urlFilter = searchParams.get('filter')
    if (urlFilter === 'my-reservations') {
      setFilter('my-reservations')
    }
    
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Cargar usuario actual y perfil
      const currentUser = await getCurrentUser()
      const userProfile = await getUserProfile(currentUser.id)
      
      setUser(currentUser)
      setProfile(userProfile)
      
      // Cargar clases y reservas del usuario
      await Promise.all([loadClasses(), loadUserReservations(currentUser.id)])
    } catch (error) {
      console.error('Error loading data:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const loadClasses = async () => {
    try {
      // Obtener todas las clases con información del profesor y contador de reservas
      const { data, error } = await supabase
        .from('classes')
        .select(`
          *,
          teacher:teacher_id(full_name),
          reservations(count)
        `)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true })

      if (error) throw error
      
      // Procesar datos para incluir el conteo actual de reservas
      const classesWithCount = data.map(classItem => ({
        ...classItem,
        current_reservations: classItem.reservations.length,
        available_spots: classItem.max_capacity - classItem.reservations.length,
        teacher: classItem.teacher || {full_name: "Profesor no disponible" }
      }))
      
      setClasses(classesWithCount)
    } catch (error) {
      console.error('Error loading classes:', error)
    }
  }

  const loadUserReservations = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select('class_id')
        .eq('student_id', userId)

      if (error) throw error
      
      // Guardar array de IDs de clases reservadas para verificación rápida
      setUserReservations(data.map(reservation => reservation.class_id))
    } catch (error) {
      console.error('Error loading user reservations:', error)
    }
  }

  const handleReservation = async (classId) => {
    // Solo alumnos pueden hacer reservas
    if (profile.role !== 'student') {
      alert('Solo los alumnos pueden reservar clases')
      return
    }

    setReservationLoading(classId)
    
    try {
      const { error } = await supabase
        .from('reservations')
        .insert([{
          student_id: user.id,
          class_id: classId
        }])

      if (error) throw error

      // Actualizar estado local para reflejar la nueva reserva
      setUserReservations(prev => [...prev, classId])
      
      // Recargar clases para actualizar contador de disponibilidad
      await loadClasses()
      
      alert('¡Reserva realizada con éxito!')
    } catch (error) {
      console.error('Error making reservation:', error)
      alert('Error al realizar la reserva: ' + error.message)
    } finally {
      setReservationLoading(null)
    }
  }

  const handleCancelReservation = async (classId) => {
    setReservationLoading(classId)
    
    try {
      const { error } = await supabase
        .from('reservations')
        .delete()
        .eq('student_id', user.id)
        .eq('class_id', classId)

      if (error) throw error

      // Actualizar estado local
      setUserReservations(prev => prev.filter(id => id !== classId))
      
      // Recargar clases para actualizar contador
      await loadClasses()
      
      alert('Reserva cancelada con éxito')
    } catch (error) {
      console.error('Error canceling reservation:', error)
      alert('Error al cancelar la reserva: ' + error.message)
    } finally {
      setReservationLoading(null)
    }
  }

  // Formatear hora para mostrar en formato legible
  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':')
    return `${hours}:${minutes}`
  }

  // Filtrar clases según el filtro seleccionado
  const filteredClasses = classes.filter(classItem => {
    if (filter === 'my-reservations') {
      return userReservations.includes(classItem.id)
    }
    if (filter === 'available') {
      return classItem.available_spots > 0
    }
    return true // 'all'
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Clases de Yoga</h1>
              <p className="text-sm text-gray-600">
                {filter === 'my-reservations' ? 'Mis reservas activas' : 'Explora y reserva clases'}
              </p>
            </div>
            <Link
              href="/dashboard"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Volver al Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Filtros */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Todas las Clases
          </button>
          <button
            onClick={() => setFilter('available')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'available'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Con Cupos Disponibles
          </button>
          {profile?.role === 'student' && (
            <button
              onClick={() => setFilter('my-reservations')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'my-reservations'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Mis Reservas ({userReservations.length})
            </button>
          )}
        </div>

        {/* Lista de clases */}
        {filteredClasses.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500">
              {filter === 'my-reservations' 
                ? 'No tienes reservas activas' 
                : 'No hay clases disponibles'}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClasses.map((classItem) => {
              const isReserved = userReservations.includes(classItem.id)
              const isFull = classItem.available_spots <= 0
              const isLoading = reservationLoading === classItem.id

              return (
                <div key={classItem.id} className="bg-white shadow rounded-lg overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">{classItem.title}</h3>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        isFull ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {classItem.available_spots} cupos
                      </div>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-4">{classItem.description}</p>
                    
                    <div className="space-y-2 text-sm text-gray-700 mb-4">
                      <div className="flex items-center">
                        <span className="font-medium w-20">Día:</span>
                        <span>{dayNames[classItem.day_of_week]}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="font-medium w-20">Horario:</span>
                        <span>{formatTime(classItem.start_time)} - {formatTime(classItem.end_time)}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="font-medium w-20">Profesor:</span>
                        <span>{classItem.teacher?.full_name || ""}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="font-medium w-20">Capacidad:</span>
                        <span>{classItem.current_reservations}/{classItem.max_capacity}</span>
                      </div>
                    </div>

                    {/* Botones de acción - solo para alumnos */}
                    {profile?.role === 'student' && (
                      <div className="mt-4">
                        {isReserved ? (
                          <button
                            onClick={() => handleCancelReservation(classItem.id)}
                            disabled={isLoading}
                            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-md text-sm font-medium"
                          >
                            {isLoading ? 'Procesando...' : 'Cancelar Reserva'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReservation(classItem.id)}
                            disabled={isFull || isLoading}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium"
                          >
                            {isLoading ? 'Procesando...' : (isFull ? 'Sin Cupos' : 'Reservar')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
