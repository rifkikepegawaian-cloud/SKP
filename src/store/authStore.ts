import { create } from 'zustand'
import { User, UserRole } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

interface AuthState {
  user: User | null
  activeRole: UserRole | null
  isLoading: boolean
  setUser: (user: User | null) => void
  setActiveRole: (role: UserRole) => void
  setLoading: (v: boolean) => void
  fetchProfile: () => Promise<User | null>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  activeRole: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setActiveRole: (role) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('activeRole', role)
    }
    set({ activeRole: role })
  },
  setLoading: (isLoading) => set({ isLoading }),

  fetchProfile: async () => {
    const supabase = createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      set({ user: null, isLoading: false })
      return null
    }

    const { data: profile } = await supabase
      .from('users')
      .select('*, pegawai(*)')
      .eq('id', authUser.id)
      .single()

    if (profile) {
      const roles = (profile.role || '').split(',') as UserRole[]
      
      let defaultRole: UserRole = roles[0]
      if (typeof window !== 'undefined') {
        const savedRole = localStorage.getItem('activeRole') as UserRole
        if (savedRole && roles.includes(savedRole)) {
          defaultRole = savedRole
        } else if (roles.includes('staff')) {
          defaultRole = 'staff'
        }
      } else if (roles.includes('staff')) {
        defaultRole = 'staff'
      }

      set({ user: profile as User, activeRole: defaultRole, isLoading: false })
      return profile as User
    }

    set({ user: null, activeRole: null, isLoading: false })
    return null
  },

  logout: async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    if (typeof window !== 'undefined') {
      localStorage.removeItem('activeRole')
    }
    set({ user: null, isLoading: false })
  },
}))
