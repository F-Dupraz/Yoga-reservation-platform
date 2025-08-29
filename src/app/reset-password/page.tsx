'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isValidSession, setIsValidSession] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Escuchar eventos de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsValidSession(true)
      }
    })

    // Verificar si ya hay una sesión activa para reset
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setIsValidSession(true)
      }
    }

    checkSession()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const validatePassword = (password: string) => {
    if (password.length < 6) {
      return 'La contraseña debe tener al menos 6 caracteres'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Validaciones
      if (!password || !confirmPassword) {
        throw new Error('Por favor completa todos los campos')
      }

      const passwordError = validatePassword(password)
      if (passwordError) {
        throw new Error(passwordError)
      }

      if (password !== confirmPassword) {
        throw new Error('Las contraseñas no coinciden')
      }

      // Actualizar contraseña
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) throw error

      setSuccess(true)
      
      // Redirigir al dashboard después de 3 segundos
      setTimeout(() => {
        router.push('/dashboard')
      }, 3000)

    } catch (error) {
      console.error('Error updating password:', error)
      setError((error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // Si no hay sesión válida para reset
  if (!isValidSession) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">
              Link Inválido o Expirado
            </h2>
            <p className="text-sm text-neutral-600 mb-6">
              El link de recuperación de contraseña no es válido o ha expirado.
            </p>
            <div className="space-y-3">
              <Link href="/forgot-password" className="btn-primary">
                Solicitar Nuevo Link
              </Link>
              <Link href="/login" className="btn-secondary">
                Volver al Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Mensaje de éxito
  if (success) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">
              Contraseña Actualizada
            </h2>
            <p className="text-sm text-neutral-600 mb-6">
              Tu contraseña ha sido cambiada exitosamente. Serás redirigido al dashboard en unos segundos.
            </p>
            <Link href="/dashboard" className="btn-primary">
              Ir al Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Formulario para nueva contraseña
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-neutral-900">
            Nueva Contraseña
          </h2>
          <p className="mt-2 text-sm text-neutral-600">
            Ingresa tu nueva contraseña segura
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="card">
          <div className="card-body">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  Nueva Contraseña *
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-base form-input"
                  placeholder="Mínimo 6 caracteres"
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword" className="form-label">
                  Confirmar Contraseña *
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-base form-input"
                  placeholder="Repite la nueva contraseña"
                  required
                  disabled={loading}
                />
              </div>

              <div className="bg-neutral-50 p-3 rounded-lg">
                <p className="text-xs text-neutral-600 mb-1">Requisitos de contraseña:</p>
                <ul className="text-xs text-neutral-600 space-y-1">
                  <li className={password.length >= 6 ? 'text-green-600' : ''}>
                    • Mínimo 6 caracteres
                  </li>
                  <li className={password === confirmPassword && password ? 'text-green-600' : ''}>
                    • Las contraseñas coinciden
                  </li>
                </ul>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full disabled:opacity-50"
              >
                {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
