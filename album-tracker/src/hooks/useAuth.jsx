import { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [session, setSession] = useState(null)
    const [profile, setProfile] = useState(null)
    const [isAllowed, setIsAllowed] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Init session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            setUser(session?.user ?? null)
            if (session?.user) {
                checkUserStatus(session.user)
            } else {
                setLoading(false)
            }
        })

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
            setUser(session?.user ?? null)
            if (session?.user) {
                checkUserStatus(session.user)
            } else {
                setProfile(null)
                setIsAllowed(null)
                setLoading(false)
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    const checkUserStatus = async (currentUser) => {
        try {
            // Check whitelist
            const { data: allowedData, error: allowedError } = await supabase
                .from('allowed_emails')
                .select('*')
                .eq('email', currentUser.email)
                .single()

            if (allowedError || !allowedData) {
                setIsAllowed(false)
            } else {
                setIsAllowed(true)
                // Check profile
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', currentUser.id)
                    .single()
                
                setProfile(profileData || null)
            }
        } catch (error) {
            console.error('Error checking user status:', error)
        } finally {
            setLoading(false)
        }
    }

    const signInWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
            }
        })
        if (error) console.error('Error logging in:', error.message)
    }

    const signOut = async () => {
        await supabase.auth.signOut()
    }

    return (
        <AuthContext.Provider value={{
            user,
            session,
            profile,
            isAllowed,
            loading,
            signInWithGoogle,
            signOut,
            setProfile // to manually update profile after setup
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
