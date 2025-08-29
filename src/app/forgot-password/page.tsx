'use client'
import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      // Validación básica
      if (!email) {
        throw new Error('Por favor ingresa tu email')
      }

      if (!email.includes('@')) {
        throw new Error('Por favor ingresa un email válido')
      }

      // Enviar solicitud de reset
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) throw error

      setMessage(
        'Se ha enviado un link de recuperación a tu email. Revisa tu bandeja de entrada y spam.'
      )
      setEmail('')

    } catch (error) {
      console.error('Error sending reset email:', error)
      setError((error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-neutral-900">
            Recuperar Contraseña
          </h2>
          <p className="mt-2 text-sm text-neutral-600">
            Ingresa tu email para recibir un link de recuperación
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="card">
          <div className="card-body">
            {message ? (
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="mb-6">
                  <p className="text-green-700 text-sm">{message}</p>
                </div>
                <div className="flex flex-col space-y-3">
                  <Link href="/login" className="btn-primary">
                    Volver al Login
                  </Link>
                  <button
                    onClick={() => {
                      setMessage('')
                      setEmail('')
                    }}
                    className="btn-secondary"
                  >
                    Enviar Otro Email
                  </button>
                </div>
              </div>
            ) : (
              <>
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="form-group">
                    <label htmlFor="email" className="form-label">
                      Email *
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-base form-input"
                      placeholder="tu@email.com"
                      required
                      disabled={loading}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full disabled:opacity-50"
                  >
                    {loading ? 'Enviando...' : 'Enviar Link de Recuperación'}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <Link 
                    href="/login" 
                    className="text-sm text-neutral-600 hover:text-neutral-900"
                  >
                    ← Volver al Login
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
