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
      document.cookie = `activeRole=${role}; path=/; max-age=2592000; SameSite=Lax`
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
      const roles = (profile.role || '').split(',').map((r: string) => r.trim()) as UserRole[]
      
      let defaultRole: UserRole = roles[0]
      if (typeof window !== 'undefined') {
        const savedRole = localStorage.getItem('activeRole') as UserRole
        if (savedRole && roles.includes(savedRole)) {
          defaultRole = savedRole
        } else if (roles.includes('staff')) {
          defaultRole = 'staff'
        }
        document.cookie = `activeRole=${defaultRole}; path=/; max-age=2592000; SameSite=Lax`
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
      document.cookie = 'activeRole=; path=/; max-age=0; SameSite=Lax'
    }
    set({ user: null, activeRole: null, isLoading: false })
  },
}))
