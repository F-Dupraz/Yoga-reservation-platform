'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser, getUserProfile, supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

type ClassItem = {
  id: string
  title: string
  description: string
  day_of_week: number
  start_time: string
  end_time: string
  max_capacity: number
  current_reservations: number
  namesReserved: string[]
  teacher_id: string
  created_at: string
  updated_at: string
}

export default function ManageClassesPage() {
  const [user, setUser] = useState<User | null>(null)
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    day_of_week: '',
    start_time: '',
    end_time: '',
    max_capacity: '10'
  })
  const [formLoading, setFormLoading] = useState(false)
  const router = useRouter()

  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const currentUser = await getCurrentUser()

      if (!currentUser) {
        throw new Error('No se pudo obtener el usuario actual')
      }

      const userProfile = await getUserProfile(currentUser.id)
      
      // Verificar que el usuario sea profesor
      if (userProfile.role !== 'teacher') {
        alert('Acceso denegado. Solo los profesores pueden gestionar clases.')
        router.push('/dashboard')
        return
      }
      
      setUser(currentUser)
      
      await loadClasses(currentUser.id)
    } catch (error) {
      console.error('Error loading data:', (error as Error))
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const loadClasses = async (teacherId: string) => {
    try {
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (classesError) {
        console.error('Error loading classes: ', classesError)
        throw classesError
      }

      const classIds = classesData?.map(c => c.id) || [];
      
      // CAMBIADO: usar class_enrollments en lugar de reservations
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('class_enrollments') // CAMBIADO
        .select(`
          class_id,
          profiles:student_id (
            full_name
          )
        `)
        .in('class_id', classIds)

      if(enrollmentsError) {
        console.log('Error loading enrollments: ', enrollmentsError)
      }

      const classesWithNames = classesData?.map(cla => ({
        ...cla,
        namesReserved: enrollments // Mantener el nombre para no romper la UI
          ?.filter(e => e.class_id === cla.id)
          ?.map(e => (e.profiles as unknown as { full_name: string }).full_name) || []
      }))
      
      setClasses(classesWithNames)

    } catch (error) {
      console.error('Error loading classes:', error)
    }
  }

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormLoading(true)

    try {
      // Validaciones básicas
      if (!formData.title || !formData.day_of_week || !formData.start_time || !formData.end_time) {
        throw new Error('Por favor completa todos los campos obligatorios')
      }

      // Validar que la hora de fin sea después de la hora de inicio
      if (formData.start_time >= formData.end_time) {
        throw new Error('La hora de fin debe ser posterior a la hora de inicio')
      }

      if (editingClass) {
        // Actualizar clase existente
        const { error } = await supabase
          .from('classes')
          .update({
            title: formData.title,
            description: formData.description,
            day_of_week: parseInt(formData.day_of_week),
            start_time: formData.start_time,
            end_time: formData.end_time
          })
          .eq('id', editingClass.id)
          .eq('teacher_id', user?.id)

        if (error) throw error
        alert('Clase actualizada con éxito')
      } else {
        // Crear nueva clase
        const { error } = await supabase
          .from('classes')
          .insert([{
            teacher_id: user?.id,
            title: formData.title,
            description: formData.description,
            day_of_week: parseInt(formData.day_of_week),
            start_time: formData.start_time,
            end_time: formData.end_time,
            max_capacity: parseInt(formData.max_capacity),
            available_spots: parseInt(formData.max_capacity)
          }])

        if (error) throw error
        alert('Clase creada con éxito')
      }

      // Recargar clases y resetear formulario
      if(user) {
        await loadClasses(user.id)
      }
      
      resetForm()
    } catch (error) {
      console.error('Error saving class:', error)
      alert('Error: ' + (error as Error).message)
    } finally {
      setFormLoading(false)
    }
  }

  const handleEdit = (classItem: ClassItem) => {
    setEditingClass(classItem)
    setFormData({
      title: classItem.title,
      description: classItem.description || '',
      day_of_week: classItem.day_of_week.toString(),
      start_time: classItem.start_time,
      end_time: classItem.end_time,
      max_capacity: classItem.max_capacity.toString()
    })
    setShowForm(true)
  }

  const handleDelete = async (classId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta clase? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classId)
        .eq('teacher_id', user?.id)

      if (error) throw error
      
      alert('Clase eliminada con éxito')
      
      if(user) {
        await loadClasses(user.id)
      }
      
    } catch (error) {
      console.error('Error deleting class:', error)
      alert('Error al eliminar la clase: ' + (error as Error).message)
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      day_of_week: '',
      start_time: '',
      end_time: '',
      max_capacity: '10'
    })
    setEditingClass(null)
    setShowForm(false)
  }

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':')
    return `${hours}:${minutes}`
  }

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
              <h1 className="text-3xl font-bold text-neutral-900">Gestionar Mis Clases</h1>
              <p className="text-sm text-neutral-600">Crea, edita y organiza tus clases de yoga</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowForm(true)}
                className="btn-primary"
              >
                Nueva Clase
              </button>
              <Link
                href="/dashboard"
                className="btn-secondary"
              >
                Volver
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Formulario de crear/editar clase */}
        {showForm && (
          <div className="card mb-8">
            <div className="card-header">
              <h3 className="text-lg font-medium text-neutral-900">
                {editingClass ? 'Editar Clase' : 'Nueva Clase'}
              </h3>
            </div>
            <form onSubmit={handleFormSubmit} className="card-body space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="form-group">
                  <label htmlFor="title" className="form-label">
                    Título de la Clase *
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="input-base form-input"
                    placeholder="Ej: Yoga Vinyasa Principiantes"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="day_of_week" className="form-label">
                    Día de la Semana *
                  </label>
                  <select
                    id="day_of_week"
                    value={formData.day_of_week}
                    onChange={(e) => setFormData({...formData, day_of_week: e.target.value})}
                    className="form-select"
                    required
                  >
                    <option value="">Selecciona un día</option>
                    {dayNames.map((day, index) => (
                      <option key={index} value={index}>{day}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="start_time" className="form-label">
                    Hora de Inicio *
                  </label>
                  <input
                    type="time"
                    id="start_time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                    className="input-base form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="end_time" className="form-label">
                    Hora de Fin *
                  </label>
                  <input
                    type="time"
                    id="end_time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                    className="input-base form-input"
                    required
                  />
                </div>

                {!editingClass && (
                  <div className="form-group">
                    <label htmlFor="max_capacity" className="form-label">
                      Capacidad Máxima *
                    </label>
                    <input
                      type="number"
                      id="max_capacity"
                      min="1"
                      max="50"
                      value={formData.max_capacity}
                      onChange={(e) => setFormData({...formData, max_capacity: e.target.value})}
                      className="input-base form-input"
                      required
                    />
                  </div>
                )}

              </div>

              <div className="form-group">
                <label htmlFor="description" className="form-label">
                  Descripción
                </label>
                <textarea
                  id="description"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="form-textarea"
                  placeholder="Descripción de la clase, nivel requerido, qué traer, etc."
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="btn-primary disabled:opacity-50"
                >
                  {formLoading ? 'Guardando...' : (editingClass ? 'Actualizar' : 'Crear Clase')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de clases del profesor */}
        <div className="card">
          <div className="card-header">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-neutral-900">Mis Clases ({classes.length})</h3>
            </div>
          </div>
          
          {classes.length === 0 ? (
            <div className="card-body text-center text-neutral-500">
              <p>No tienes clases creadas aún.</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-2 text-primary-600 hover:text-primary-700 font-medium"
              >
                Crear tu primera clase
              </button>
            </div>
          ) : (
            <div className="divide-y divide-neutral-200">
              {classes.map((classItem) => (
                <div key={classItem.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-2">
                        <h4 className="text-lg font-semibold text-neutral-900">{classItem.title}</h4>
                        <div className="flex items-center space-x-2">
                          <span className="badge-primary">
                            {dayNames[classItem.day_of_week]}
                          </span>
                          <span className="badge-success">
                            {formatTime(classItem.start_time)} - {formatTime(classItem.end_time)}
                          </span>
                          <span className="badge-secondary">
                            {classItem.current_reservations}/{classItem.max_capacity} inscritos
                          </span>
                        </div>
                      </div>
                      
                      {classItem.description && (
                        <p className="text-neutral-600 text-sm mb-3">{classItem.description}</p>
                      )}
                      
                      <div className="text-sm text-neutral-500">
                        Creada el: {new Date(classItem.created_at).toLocaleDateString('es-ES')}
                        {classItem.updated_at !== classItem.created_at && (
                          <span> • Última actualización: {new Date(classItem.updated_at).toLocaleDateString('es-ES')}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleEdit(classItem)}
                        className="btn-primary"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(classItem.id)}
                        className="btn-danger"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                  
                  {classItem.current_reservations > 0 && (
                    <div className="mt-4 p-3 bg-neutral-50 rounded-lg">
                      <h5 className="text-sm font-medium text-neutral-700 mb-2">
                        Alumnos Inscritos ({classItem.current_reservations})
                      </h5>
                      <div className="text-sm text-neutral-600">
                        {classItem.namesReserved.length > 0 && classItem.namesReserved.map(stud => (
                          <div key={stud}>
                            <p className="text-neutral-600 text-sm">{stud}.</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
