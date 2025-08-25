'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser, getUserProfile, supabase } from '@/lib/supabase'

type StudentLimit = {
  id: string
  student_id: string
  email: string
  full_name: string
  weekly_class_limit: number
  current_enrollments: number
  available_slots: number
}

export default function StudentLimitsPage() {
  const [teacherId, setTeacherId] = useState<string | null>(null)
  const [studentLimits, setStudentLimits] = useState<StudentLimit[]>([])
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    emailOrUsername: '',
    weeklyLimit: '2'
  })
  const [formLoading, setFormLoading] = useState(false)
  const [editingStudent, setEditingStudent] = useState<StudentLimit | null>(null)
  const router = useRouter()

  useEffect(() => {
    checkAuthAndLoadData()
  }, [])

  const checkAuthAndLoadData = async () => {
    try {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        router.push('/login')
        return
      }

      const profile = await getUserProfile(currentUser.id)
      if (profile.role !== 'teacher') {
        alert('Solo los profesores pueden acceder a esta página')
        router.push('/dashboard')
        return
      }

      setTeacherId(currentUser.id)
      await loadStudentLimits(currentUser.id)
    } catch (error) {
      console.error('Error:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const loadStudentLimits = async (teacherId: string) => {
    try {
      const { data, error } = await supabase
        .from('teacher_students_summary')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('full_name')

      if (error) throw error
      setStudentLimits(data || [])
    } catch (error) {
      console.error('Error loading student limits:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teacherId) return
    
    setFormLoading(true)
    try {
      // Buscar el estudiante por email o username
      const { data: student, error: searchError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('role', 'student')
        .or(`email.eq.${formData.emailOrUsername},full_name.ilike.${formData.emailOrUsername}`)
        .single()

      if (searchError || !student) {
        alert('Usuario no encontrado. Verifica que el email o nombre sea correcto y que sea un alumno registrado.')
        setFormLoading(false)
        return
      }

      // Si estamos editando, actualizar
      if (editingStudent) {
        const { error } = await supabase
          .from('teacher_student_limits')
          .update({
            weekly_class_limit: parseInt(formData.weeklyLimit),
            updated_at: new Date().toISOString()
          })
          .eq('id', editingStudent.id)

        if (error) throw error
        alert('Límite actualizado correctamente')
      } else {
        // Crear o actualizar el límite (upsert)
        const { error } = await supabase
          .from('teacher_student_limits')
          .upsert({
            teacher_id: teacherId,
            student_id: student.id,
            weekly_class_limit: parseInt(formData.weeklyLimit)
          }, {
            onConflict: 'teacher_id,student_id'
          })

        if (error) throw error
        alert(`Límite asignado a ${student.full_name}`)
      }

      // Limpiar y recargar
      setFormData({ emailOrUsername: '', weeklyLimit: '2' })
      setEditingStudent(null)
      await loadStudentLimits(teacherId)
    } catch (error) {
      console.error('Error:', error)
      alert('Error al procesar la solicitud')
    } finally {
      setFormLoading(false)
    }
  }

  const handleEdit = (student: StudentLimit) => {
    setEditingStudent(student)
    setFormData({
      emailOrUsername: student.email,
      weeklyLimit: student.weekly_class_limit.toString()
    })
  }

  const handleDelete = async (studentId: string) => {
    if (!confirm('¿Eliminar el límite de clases para este alumno?')) return
    
    try {
      const { error } = await supabase
        .from('teacher_student_limits')
        .delete()
        .eq('teacher_id', teacherId)
        .eq('student_id', studentId)

      if (error) throw error
      
      if (teacherId) {
        await loadStudentLimits(teacherId)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al eliminar')
    }
  }

if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="spinner h-12 w-12"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-white shadow-soft">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900">Cupos Semanales</h1>
              <p className="text-sm text-neutral-600 mt-1">
                Gestiona cuántas clases puede tomar cada alumno por semana
              </p>
            </div>
            <Link 
              href="/dashboard" 
              className="btn-secondary"
            >
              Volver
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Formulario mejorado */}
        <div className="card mb-6">
          <div className="card-body">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">
              {editingStudent ? 'Editar Cupos' : 'Asignar Nuevos Cupos'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Email o nombre del alumno"
                    value={formData.emailOrUsername}
                    onChange={(e) => setFormData({...formData, emailOrUsername: e.target.value})}
                    className="input-base w-full"
                    required
                  />
                </div>
                
                <div className="sm:w-32">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Cupos"
                    value={formData.weeklyLimit}
                    onChange={(e) => setFormData({...formData, weeklyLimit: e.target.value})}
                    className="input-base w-full"
                    required
                  />
                </div>
                
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="btn-primary"
                  >
                    {formLoading ? 'Procesando...' : (editingStudent ? 'Actualizar' : 'Asignar Cupos')}
                  </button>
                  
                  {editingStudent && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingStudent(null)
                        setFormData({ emailOrUsername: '', weeklyLimit: '2' })
                      }}
                      className="btn-outline"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Lista de alumnos con cupos */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-neutral-900">
              Alumnos con Cupos Asignados ({studentLimits.length})
            </h3>
          </div>
          
          {studentLimits.length === 0 ? (
            <div className="card-body text-center">
              <svg className="mx-auto h-12 w-12 text-neutral-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <p className="text-neutral-500 text-base">No has asignado cupos a ningún alumno aún.</p>
              <p className="text-sm text-neutral-400 mt-2">Usa el formulario de arriba para comenzar.</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-200">
              {studentLimits.map((student) => (
                <div key={student.id} className="p-4 hover:bg-neutral-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-medium text-neutral-900 truncate">
                        {student.full_name}
                      </p>
                      <p className="text-sm text-neutral-500 truncate">{student.email}</p>
                    </div>
                    
                    <div className="flex items-center gap-4 ml-4">
                      <div className="flex items-center gap-2">
                        <span className="badge-primary">
                          {student.current_enrollments}/{student.weekly_class_limit} clases
                        </span>
                        {student.available_slots > 0 && (
                          <span className="badge-success text-xs">
                            {student.available_slots} disponibles
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleEdit(student)}
                          className="text-primary-600 hover:text-primary-700 text-sm font-medium transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(student.student_id)}
                          className="text-red-600 hover:text-red-700 text-sm font-medium transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
