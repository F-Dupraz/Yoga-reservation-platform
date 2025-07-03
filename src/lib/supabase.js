import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Cliente de Supabase para operaciones del lado del cliente
export const supabase = createBrowserClient(supabaseUrl, supabaseKey)

// Función para obtener el usuario actual
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  return user
}

// Función para obtener el perfil completo con rol
export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error) throw error
  return data
}

// Función para registrar usuario con rol (versión final simplificada)
export async function signUpWithRole(email, password, role, fullName) {
  try {
    // Crear usuario - el trigger debería crear el perfil automáticamente
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role
        }
      }
    })
    
    if (authError) {
      console.error('Auth error:', authError)
      throw authError
    }

    if (!authData.user) {
      throw new Error('No user returned from signup')
    }

    console.log('User created successfully:', authData.user.id)
    return authData
    
  } catch (error) {
    console.error('SignUp error:', error)
    throw error
  }
}

// Función para login
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  if (error) throw error
  return data
}

// Función para logout
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// Función para escuchar cambios de autenticación
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(callback)
}
