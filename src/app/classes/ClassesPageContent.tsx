// src/app/classes/ClassesPageContent.tsx - VERSIÓN ACTUALIZADA COMPLETA
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
  current_reservations: number // mantener el nombre por compatibilidad con triggers
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
  const [userEnrollments, setUserEnrollments] = useState<string[]>([]) // CAMBIADO
  const [loading, setLoading] = useState(true)
  const [enrollmentLoading, setEnrollmentLoading] = useState<string | null>(null) // CAMBIADO
  const [filter, setFilter] = useState('all')
  const router = useRouter()
  const searchParams = useSearchParams()

  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

  useEffect(() => {
    const urlFilter = searchParams.get('filter')
    if (urlFilter === 'my-classes') { // CAMBIADO de my-reservations
      setFilter('my-classes')
    }
    
    loadData()
  }, [searchParams])

  const loadData = async () => {
    try {
      const currentUser = await getCurrentUser()
      
      if (!currentUser) {
        throw new Error('No se pudo obtener el usuario actual')
      }
      
      const userProfile = await getUserProfile(currentUser.id)
      
      setUser(currentUser)
      setProfile(userProfile)
      
      await Promise.all([
        loadClasses(), 
        loadUserEnrollments(currentUser.id) // CAMBIADO
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
      
      setClasses(classesData || [])

    } catch (error) {
      console.error('Error loading classes:', error)
      setClasses([])
    }
  }

  const loadUserEnrollments = async (userId: string) => { // CAMBIADO
    try {
      const { data, error } = await supabase
        .from('class_enrollments') // CAMBIADO
        .select('class_id')
        .eq('student_id', userId)

      if (error) {
        console.error('Error loading user enrollments:', error)
        setUserEnrollments([])
        return
      }
      
      const enrolledClassIds = data.map(enrollment => enrollment.class_id)
      setUserEnrollments(enrolledClassIds)
    } catch (error) {
      console.error('Error loading user enrollments:', error)
      setUserEnrollments([])
    }
  }

  const handleEnrollment = async (classId: string, teacherId: string) => { // CAMBIADO
    if (!profile || profile.role !== 'student') {
      alert('Solo los alumnos pueden inscribirse a clases')
      return
    }

    if (!user) {
      alert('Error: Usuario no autenticado')
      return
    }

    setEnrollmentLoading(classId)
    
    try {
      // Verificar límite con el profesor específico
      const { data: limitData, error: limitError } = await supabase
        .from('teacher_student_limits')
        .select('weekly_class_limit')
        .eq('teacher_id', teacherId)
        .eq('student_id', user.id)
        .single()

      if (limitError || !limitData) {
        alert('No tienes cupos asignados con este profesor. Contacta al profesor para solicitar acceso.')
        setEnrollmentLoading(null)
        return
      }

      // Contar inscripciones actuales con ese profesor
      const { count, error: countError } = await supabase
        .from('class_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', user.id)
        .in('class_id', (
          await supabase
            .from('classes')
            .select('id')
            .eq('teacher_id', teacherId)
        ).data?.map(c => c.id) || [])

      if (countError) throw countError

      const currentCount = count || 0

      if (currentCount >= limitData.weekly_class_limit) {
        alert(`Ya alcanzaste tu límite de ${limitData.weekly_class_limit} clases con este profesor.`)
        setEnrollmentLoading(null)
        return
      }

      // Verificar si ya está inscrito
      const { data: existingEnrollment } = await supabase
        .from('class_enrollments')
        .select('id')
        .eq('student_id', user.id)
        .eq('class_id', classId)
        .single()

      if (existingEnrollment) {
        alert('Ya estás inscrito en esta clase')
        return
      }

      // Inscribir al alumno
      const { error } = await supabase
        .from('class_enrollments')
        .insert({
          student_id: user.id,
          class_id: classId
        })

      if (error) throw error

      setUserEnrollments(prev => [...prev, classId])
      await loadClasses()
      
      alert('¡Inscripción exitosa! Asistirás a esta clase todas las semanas.')
    } catch (error) {
      console.error('Error making enrollment:', error)
      alert('Error al inscribirse: ' + (error as Error).message)
    } finally {
      setEnrollmentLoading(null)
    }
  }

  const handleCancelEnrollment = async (classId: string) => { // CAMBIADO
    if (!user) {
      alert('Error: Usuario no autenticado')
      return
    }

    setEnrollmentLoading(classId)
    
    try {
      const { error } = await supabase
        .from('class_enrollments') // CAMBIADO
        .delete()
        .eq('student_id', user.id)
        .eq('class_id', classId)

      if (error) throw error

      setUserEnrollments(prev => prev.filter(id => id !== classId))
      await loadClasses()
      
      alert('Te has dado de baja de la clase exitosamente')
    } catch (error) {
      console.error('Error canceling enrollment:', error)
      alert('Error al cancelar inscripción: ' + (error as Error).message)
    } finally {
      setEnrollmentLoading(null)
    }
  }

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':')
    return `${hours}:${minutes}`
  }

  const filteredClasses = classes.filter(classItem => {
    if (filter === 'my-classes') { // CAMBIADO
      return userEnrollments.includes(classItem.id)
    }
    if (filter === 'available') {
      return classItem.available_spots > 0
    }
    return true
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
      <div className="bg-white shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900">Clases de Yoga</h1>
              <p className="text-sm text-neutral-600">
                {filter === 'my-classes' ? 'Mis clases semanales' : 'Explora e inscríbete en clases'}
              </p>
            </div>
            <Link href="/dashboard" className="btn-primary">
              Volver al Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
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
              onClick={() => setFilter('my-classes')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-smooth border ${
                filter === 'my-classes'
                  ? 'border-transparent text-white shadow-soft'
                  : 'bg-white text-neutral-700 border-neutral-400 hover:bg-neutral-50'
              }`}
              style={filter === 'my-classes' ? {backgroundColor: 'var(--primary-500)'} : {}}
            >
              Mis Clases ({userEnrollments.length})
            </button>
          )}
        </div>

        {filteredClasses.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-neutral-500">
              {filter === 'my-classes' 
                ? 'No estás inscrito en ninguna clase' 
                : 'No hay clases disponibles'}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClasses.map((classItem) => {
              const isEnrolled = userEnrollments.includes(classItem.id) // CAMBIADO
              const isFull = classItem.available_spots <= 0
              const isLoading = enrollmentLoading === classItem.id

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
                        <span className="font-medium w-20">Inscritos:</span>
                        <span>{classItem.current_reservations}/{classItem.max_capacity}</span>
                      </div>
                    </div>

                    {profile?.role === 'student' && (
                      <div className="mt-4">
                        {isEnrolled ? (
                          <button
                            onClick={() => handleCancelEnrollment(classItem.id)}
                            disabled={isLoading}
                            className="btn-danger w-full disabled:opacity-50"
                          >
                            {isLoading ? 'Procesando...' : 'Darme de Baja'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleEnrollment(classItem.id, classItem.teacher_id)}
                            disabled={isFull || isLoading}
                            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isLoading ? 'Procesando...' : (isFull ? 'Clase Llena' : 'Inscribirme')}
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
