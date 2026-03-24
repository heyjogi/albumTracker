import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function useUser() {
    const [user, setUser] = useState(null)

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setUser(data.user)
        })
    }, [])

    return user
}