'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, signUpWithRole } from '@/lib/supabase'

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'student'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isLogin) {
        // Proceso de login - autentica al usuario existente
        await signIn(formData.email, formData.password)
      } else {
        // Proceso de registro - crea nuevo usuario con rol específico
        await signUpWithRole(
          formData.email, 
          formData.password, 
          formData.role, 
          formData.fullName
        )
      }
      
      // Redirigir al dashboard después de autenticación exitosa
      router.push('/dashboard')
    } catch (err) {
      // Mostrar error de autenticación de manera amigable
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center gradient-warm py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-neutral-900">
            {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </h2>
          <p className="mt-2 text-center text-sm text-neutral-600">
            {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
            <button
              type="button"
              className="font-medium text-primary-600 hover:text-primary-500 ml-1 underline cursor-pointer transition-colors"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? 'Regístrate' : 'Inicia sesión'}
            </button>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Campo de nombre completo - solo en registro */}
            {!isLogin && (
              <div>
                <label htmlFor="fullName" className="form-label">
                  Nombre Completo
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required={!isLogin}
                  className="input-base form-input"
                  placeholder="Tu nombre completo"
                  value={formData.fullName}
                  onChange={handleInputChange}
                />
              </div>
            )}

            {/* Campo de email - siempre visible */}
            <div>
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="input-base form-input"
                placeholder="tu@email.com"
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>

            {/* Campo de contraseña - siempre visible */}
            <div>
              <label htmlFor="password" className="form-label">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="input-base form-input"
                placeholder="Contraseña"
                value={formData.password}
                onChange={handleInputChange}
              />
            </div>

            {/* Selector de rol - solo en registro */}
            {!isLogin && (
              <div>
                <label htmlFor="role" className="form-label">
                  Tipo de Usuario
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="form-select"
                >
                  <option value="student">Alumno - Reservar clases</option>
                  <option value="teacher">Profesor - Crear y gestionar clases</option>
                </select>
              </div>
            )}
          </div>

          {/* Mostrar errores si los hay */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Botón de submit */}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Procesando...' : (isLogin ? 'Iniciar Sesión' : 'Crear Cuenta')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
