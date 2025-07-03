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
      // Obtener clases del profesor actual con conteo de reservas
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true })

      if (classesError) {
        console.error('Error loading classes: ', classesError)
        throw classesError
      }

      // Procesar datos para incluir conteo de reservas
      const classesWithCount = await Promise.all(
        classesData.map(async (classItem) => {
          const { count: reservationCount, error: countError } = await supabase
            .from('reservations')
            .select('*', {count: 'exact', head: true})
            .eq('class_id', classItem.id)
        
          if(countError) {
            console.log('Error counting reservations for classes: ', countError)
          }

          return {
            ...classItem,
            current_reservations: reservationCount || 0
          }
        })
      )

      setClasses(classesWithCount)

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
            end_time: formData.end_time,
            max_capacity: parseInt(formData.max_capacity),
            available_spots: parseInt(formData.max_capacity)
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
              <h1 className="text-3xl font-bold text-gray-900">Gestionar Mis Clases</h1>
              <p className="text-sm text-gray-600">Crea, edita y organiza tus clases de yoga</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowForm(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Nueva Clase
              </button>
              <Link
                href="/dashboard"
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Volver al Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Formulario de crear/editar clase */}
        {showForm && (
          <div className="bg-white shadow rounded-lg mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {editingClass ? 'Editar Clase' : 'Nueva Clase'}
              </h3>
            </div>
            <form onSubmit={handleFormSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                    Título de la Clase *
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Ej: Yoga Vinyasa Principiantes"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="day_of_week" className="block text-sm font-medium text-gray-700">
                    Día de la Semana *
                  </label>
                  <select
                    id="day_of_week"
                    value={formData.day_of_week}
                    onChange={(e) => setFormData({...formData, day_of_week: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  >
                    <option value="">Selecciona un día</option>
                    {dayNames.map((day, index) => (
                      <option key={index} value={index}>{day}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="start_time" className="block text-sm font-medium text-gray-700">
                    Hora de Inicio *
                  </label>
                  <input
                    type="time"
                    id="start_time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="end_time" className="block text-sm font-medium text-gray-700">
                    Hora de Fin *
                  </label>
                  <input
                    type="time"
                    id="end_time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="max_capacity" className="block text-sm font-medium text-gray-700">
                    Capacidad Máxima *
                  </label>
                  <input
                    type="number"
                    id="max_capacity"
                    min="1"
                    max="50"
                    value={formData.max_capacity}
                    onChange={(e) => setFormData({...formData, max_capacity: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Descripción
                </label>
                <textarea
                  id="description"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Descripción de la clase, nivel requerido, qué traer, etc."
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  {formLoading ? 'Guardando...' : (editingClass ? 'Actualizar' : 'Crear Clase')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de clases del profesor */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Mis Clases ({classes.length})</h3>
            </div>
          </div>
          
          {classes.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <p>No tienes clases creadas aún.</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-2 text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Crear tu primera clase
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {classes.map((classItem) => (
                <div key={classItem.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-2">
                        <h4 className="text-lg font-semibold text-gray-900">{classItem.title}</h4>
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {dayNames[classItem.day_of_week]}
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {formatTime(classItem.start_time)} - {formatTime(classItem.end_time)}
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {classItem.current_reservations}/{classItem.max_capacity} inscritos
                          </span>
                        </div>
                      </div>
                      
                      {classItem.description && (
                        <p className="text-gray-600 text-sm mb-3">{classItem.description}</p>
                      )}
                      
                      <div className="text-sm text-gray-500">
                        Creada el: {new Date(classItem.created_at).toLocaleDateString('es-ES')}
                        {classItem.updated_at !== classItem.created_at && (
                          <span> • Última actualización: {new Date(classItem.updated_at).toLocaleDateString('es-ES')}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleEdit(classItem)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-sm font-medium"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(classItem.id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                  
                  {classItem.current_reservations > 0 && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-md">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">
                        Alumnos Inscritos ({classItem.current_reservations})
                      </h5>
                      <div className="text-sm text-gray-600">
                        <p>Para ver la lista detallada de alumnos, puedes consultar desde la base de datos o implementar una vista específica en futuras versiones.</p>
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
