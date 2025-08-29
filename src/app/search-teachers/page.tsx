'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getCurrentUser, supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

type TeacherProfile = {
  id: string
  email: string
  full_name: string
  phone?: string
  role: 'teacher' | 'student'
  created_at: string
  updated_at: string
}

type ClassStats = {
  total_classes: number
  total_students: number
}

type TeacherWithStats = TeacherProfile & ClassStats

export default function TeachersPage() {
  const [user, setUser] = useState<User | null>(null)
  const [teachers, setTeachers] = useState<TeacherWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        try {
          const currentUser = await getCurrentUser()
          if (currentUser) {
            setUser(currentUser)
          }
        } catch {
          console.log('Usuario no logueado o error de autenticación')
        }

        await loadTeachers()
      } catch (error) {
        console.error('Error loading data:', error)
        setError('Error al cargar los datos')
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [])

  const loadTeachers = async () => {
    try {
      // Obtener todos los profesores
      const { data: teachersData, error: teachersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'teacher')
        .order('full_name', { ascending: true })

      if (teachersError) throw teachersError

      if (!teachersData || teachersData.length === 0) {
        setTeachers([])
        return
      }

      // Obtener estadísticas para cada profesor
      const teachersWithStats = await Promise.all(
        teachersData.map(async (teacher) => {
          // Contar clases del profesor
          const { count: classCount } = await supabase
            .from('classes')
            .select('*', { count: 'exact', head: true })
            .eq('teacher_id', teacher.id)

          // Contar estudiantes únicos inscritos en clases del profesor
          const { data: enrollmentsData } = await supabase
            .from('class_enrollments')
            .select('student_id')
            .in('class_id', (
              await supabase
                .from('classes')
                .select('id')
                .eq('teacher_id', teacher.id)
            ).data?.map(c => c.id) || [])

          const uniqueStudents = new Set(enrollmentsData?.map(e => e.student_id) || [])

          return {
            ...teacher,
            total_classes: classCount || 0,
            total_students: uniqueStudents.size
          } as TeacherWithStats
        })
      )

      setTeachers(teachersWithStats)

    } catch (error) {
      console.error('Error loading teachers:', error)
      setError('Error al cargar los profesores')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner h-12 w-12"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-neutral-900">Error</h2>
          <p className="text-neutral-600 mt-2">{error}</p>
          <button
            onClick={() => {
              setError(null)
              setLoading(true)
              loadTeachers()
            }}
            className="mt-4 btn-primary"
          >
            Reintentar
          </button>
        </div>
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
              <h1 className="text-3xl font-bold text-neutral-900">Nuestros Profesores</h1>
              <p className="text-sm text-neutral-600">Conoce a nuestro equipo de instructores</p>
            </div>
            <div className="flex space-x-3">
              {user ? (
                <Link href="/dashboard" className="btn-primary">
                  Volver
                </Link>
              ) : (
                <>
                  <Link href="/login" className="btn-primary">
                    Iniciar Sesión
                  </Link>
                  <Link href="/classes" className="btn-secondary">
                    Ver Clases
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-16 text-center">
            <h2 className="text-4xl font-bold text-neutral-900 mb-4">
              Instructores Certificados de Yoga
            </h2>
            <p className="text-lg text-neutral-600 max-w-3xl mx-auto">
              Cada uno de nuestros profesores aporta años de experiencia y pasión por el yoga, 
              especializándose en diferentes estilos y técnicas para guiarte en tu práctica personal.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="card">
            <div className="card-body text-center">
              <div className="w-12 h-12 rounded-lg mx-auto mb-4 flex items-center justify-center bg-green-600">
                <span className="text-white font-extrabold text-xl">{teachers.length}</span>
              </div>
              <h3 className="text-lg font-semibold text-neutral-900">Profesores</h3>
              <p className="text-sm text-neutral-600">Instructores certificados</p>
            </div>
          </div>
          
          <div className="card">
            <div className="card-body text-center">
              <div className="w-12 h-12 rounded-lg mx-auto mb-4 flex items-center justify-center bg-green-600">
                <span className="text-white font-extrabold text-xl">
                  {teachers.reduce((sum, teacher) => sum + teacher.total_classes, 0)}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-neutral-900">Clases</h3>
              <p className="text-sm text-neutral-600">Clases disponibles</p>
            </div>
          </div>
          
          <div className="card">
            <div className="card-body text-center">
              <div className="w-12 h-12 rounded-lg mx-auto mb-4 flex items-center justify-center bg-green-600">
                <span className="text-white font-extrabold text-xl">
                  {teachers.reduce((sum, teacher) => sum + teacher.total_students, 0)}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-neutral-900">Estudiantes</h3>
              <p className="text-sm text-neutral-600">Alumnos activos</p>
            </div>
          </div>
        </div>

        {/* Teachers Grid */}
        {teachers.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-neutral-500 mb-4">
              <svg className="w-16 h-16 mx-auto mb-4 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <p className="text-lg">No hay profesores disponibles en este momento</p>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-neutral-900 mb-2">Conoce a Nuestros Profesores</h2>
              <p className="text-neutral-600">
                Cada uno de nuestros instructores aporta años de experiencia y pasión por el yoga
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {teachers.map((teacher) => (
                <div key={teacher.id} className="card teacher-profile-card">
                  <div className="card-body">
                    {/* Avatar y nombre */}
                    <div className="text-center mb-6">
                      <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-white font-bold text-xl"
                           style={{backgroundColor: 'var(--primary-500)'}}>
                        {getInitials(teacher.full_name)}
                      </div>
                      <h3 className="text-xl font-semibold text-neutral-900 mb-1">
                        {teacher.full_name}
                      </h3>
                      <span className="badge-primary">Instructor Certificado</span>
                    </div>

                    {/* Información de contacto */}
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center text-sm text-neutral-600">
                        <svg className="w-4 h-4 mr-3 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="break-all">{teacher.email}</span>
                      </div>
                      
                      {teacher.phone && (
                        <div className="flex items-center text-sm text-neutral-600">
                          <svg className="w-4 h-4 mr-3 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span>{teacher.phone}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center text-sm text-neutral-600">
                        <svg className="w-4 h-4 mr-3 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 8V11a2 2 0 012-2h4a2 2 0 012 2v4" />
                        </svg>
                        <span>Desde {formatDate(teacher.created_at)}</span>
                      </div>
                    </div>

                    {/* Estadísticas */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="text-center p-3 bg-neutral-50 rounded-lg">
                        <div className="text-xl font-bold text-primary-600" style={{color: 'var(--primary-600)'}}>
                          {teacher.total_classes}
                        </div>
                        <div className="text-xs text-neutral-600">Clases</div>
                      </div>
                      <div className="text-center p-3 bg-neutral-50 rounded-lg">
                        <div className="text-xl font-bold text-secondary-600" style={{color: 'var(--secondary-600)'}}>
                          {teacher.total_students}
                        </div>
                        <div className="text-xs text-neutral-600">Estudiantes</div>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex space-x-2">
                      <Link 
                        href={"/classes"}
                        className="btn-primary flex-1 text-center text-sm"
                      >
                        Ver Clases
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* CTA Section */}
      {!user ? (
        <div className="bg-white mt-16">
          <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-neutral-900 mb-4">
              ¿Listo para comenzar tu práctica?
            </h2>
            <p className="text-lg text-neutral-600 mb-8 max-w-2xl mx-auto">
              Únete a nuestra comunidad y descubre el poder transformador del yoga con nuestros instructores especializados.
            </p>
            <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <Link href="/register" className="btn-primary">
                Registrarse Ahora
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white mt-16"></div>
      )}
    </div>
  )
}
