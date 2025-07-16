'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser, getUserProfile, supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

type Profile = {
  id: string
  email: string
  full_name: string
  role: 'teacher' | 'student'
  created_at: string
  updated_at: string
}

type ClassItem = {
  id: string
  title: string
  description: string
  day_of_week: number
  start_time: string
  end_time: string
  max_capacity: number
  current_reservations: number
  available_spots: number
  teacher_id: string
  teacher?: {
    id: string
    full_name: string
    role: string
  }
  created_at: string
  updated_at: string
}

export default function ClassesPageContent() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [userReservations, setUserReservations] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [reservationLoading, setReservationLoading] = useState<string | null>(null)
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
  }, [searchParams])

  const loadData = async () => {
    try {
      // Cargar usuario actual y perfil
      const currentUser = await getCurrentUser()
      
      // Verificar que currentUser existe
      if (!currentUser) {
        throw new Error('No se pudo obtener el usuario actual')
      }
      
      const userProfile = await getUserProfile(currentUser.id)
      
      setUser(currentUser)
      setProfile(userProfile)
      
      // Cargar clases y reservas del usuario
      await Promise.all([
        loadClasses(), 
        loadUserReservations(currentUser.id)
      ])
    } catch (error) {
      console.error('Error loading data:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const loadClasses = async () => {
    try {
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select(`
          *,
          teacher:profiles!teacher_id (
            id,
            full_name,
            role
          )
        `)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true })

      if (classesError) throw classesError
      
      console.log(classesData)

      setClasses(classesData || [])

    } catch (error) {
      console.error('Error loading classes:', error)
      setClasses([])
    }
  }

  const loadUserReservations = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select('class_id')
        .eq('student_id', userId)

      if (error) {
        console.error('Error loading user reservations:', error)
        setUserReservations([])
        return
      }
      
      // Extraer solo los IDs de las clases reservadas
      const reservedClassIds = data.map(reservation => reservation.class_id)
      setUserReservations(reservedClassIds)
    } catch (error) {
      console.error('Error loading user reservations:', error)
      setUserReservations([])
    }
  }

  const handleReservation = async (classId: string) => {
    // Solo alumnos pueden hacer reservas
    if (!profile || profile.role !== 'student') {
      alert('Solo los alumnos pueden reservar clases')
      return
    }

    if (!user) {
      alert('Error: Usuario no autenticado')
      return
    }

    setReservationLoading(classId)
    
    try {
      // Verificar si ya tiene reserva ANTES de intentar reservar
      const { data: existingReservation, error: checkError } = await supabase
        .from('reservations')
        .select('id')
        .eq('student_id', user.id)
        .eq('class_id', classId)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 = no rows returned, que es lo que esperamos si no hay reserva
        throw checkError
      }

      if (existingReservation) {
        alert('Ya tienes una reserva para esta clase')
        return
      }

      // Proceder con la reserva
      const { error } = await supabase
        .from('reservations')
        .insert([{
          student_id: user.id,
          class_id: classId
        }])

      if (error) throw error

      // Actualizar estado local
      setUserReservations(prev => {
        const newReservations = [...prev, classId]
        return newReservations
      })
      
      // Recargar clases para actualizar contador de disponibilidad
      await loadClasses()
      
      alert('¡Reserva realizada con éxito!')
    } catch (error) {
      console.error('Error making reservation:', error)
      alert('Error al realizar la reserva: ' + (error as Error).message)
    } finally {
      setReservationLoading(null)
    }
  }

  const handleCancelReservation = async (classId: string) => {
    if (!user) {
      alert('Error: Usuario no autenticado')
      return
    }

    setReservationLoading(classId)
    
    try {
      // Verificar que realmente tiene la reserva antes de cancelar
      const { data: existingReservation, error: checkError } = await supabase
        .from('reservations')
        .select('id')
        .eq('student_id', user.id)
        .eq('class_id', classId)
        .single()

      if (checkError && !existingReservation) {
        if (checkError.code === 'PGRST116') {
          alert('No tienes una reserva para esta clase')
          // Actualizar estado local por si estaba desincronizado
          setUserReservations(prev => prev.filter(id => id !== classId))
          return
        }
        throw checkError
      }

      // Proceder con la cancelación
      const { error } = await supabase
        .from('reservations')
        .delete()
        .eq('student_id', user.id)
        .eq('class_id', classId)

      if (error) throw error

      // Actualizar estado local
      setUserReservations(prev => {
        const newReservations = prev.filter(id => id !== classId)
        return newReservations
      })
      
      // Recargar clases para actualizar contador
      await loadClasses()
      
      alert('Reserva cancelada con éxito')
    } catch (error) {
      console.error('Error canceling reservation:', error)
      alert('Error al cancelar la reserva: ' + (error as Error).message)
    } finally {
      setReservationLoading(null)
    }
  }

  // Formatear hora para mostrar en formato legible
  const formatTime = (timeString: string) => {
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
        <div className="spinner h-12 w-12"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-white shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900">Clases de Yoga</h1>
              <p className="text-sm text-neutral-600">
                {filter === 'my-reservations' ? 'Mis reservas activas' : 'Explora y reserva clases'}
              </p>
            </div>
            <Link
              href="/dashboard"
              className="btn-primary"
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
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-smooth border ${
              filter === 'all'
                ? 'border-transparent text-white shadow-soft'
                : 'bg-white text-neutral-700 border-neutral-400 hover:bg-neutral-50'
            }`}
            style={filter === 'all' ? {backgroundColor: 'var(--primary-500)'} : {}}
          >
            Todas las Clases
          </button>
          <button
            onClick={() => setFilter('available')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-smooth border ${
              filter === 'available'
                ? 'border-transparent text-white shadow-soft'
                : 'bg-white text-neutral-700 border-neutral-400 hover:bg-neutral-50'
            }`}
            style={filter === 'available' ? {backgroundColor: 'var(--primary-500)'} : {}}
          >
            Con Cupos Disponibles
          </button>
          {profile?.role === 'student' && (
            <button
              onClick={() => setFilter('my-reservations')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-smooth border ${
                filter === 'my-reservations'
                  ? 'border-transparent text-white shadow-soft'
                  : 'bg-white text-neutral-700 border-neutral-400 hover:bg-neutral-50'
              }`}
              style={filter === 'my-reservations' ? {backgroundColor: 'var(--primary-500)'} : {}}
            >
              Mis Reservas ({userReservations.length})
            </button>
          )}
        </div>

        {/* Lista de clases */}
        {filteredClasses.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-neutral-500">
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
                <div key={classItem.id} className="class-card">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-neutral-900">{classItem.title}</h3>
                      <div className="flex items-center space-x-2">
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          isFull ? 'bg-red-100 text-red-800' : 'badge-success'
                        }`}>
                          {classItem.available_spots} cupos
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-neutral-600 text-sm mb-4">{classItem.description}</p>
                    
                    <div className="space-y-2 text-sm text-neutral-700 mb-4">
                      <div className="flex items-center">
                        <span className="font-medium w-20">Día:</span>
                        <span>{dayNames[classItem.day_of_week]}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="font-medium w-20">Horario:</span>
                        <span className="time-slot">{formatTime(classItem.start_time)} - {formatTime(classItem.end_time)}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="font-medium w-20">Profesor:</span>
                        <span className="instructor-badge">{classItem.teacher?.full_name || 'No disponible'}</span>
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
                            className="btn-danger w-full disabled:opacity-50"
                          >
                            {isLoading ? 'Procesando...' : 'Cancelar Reserva'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReservation(classItem.id)}
                            disabled={isFull || isLoading}
                            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
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
