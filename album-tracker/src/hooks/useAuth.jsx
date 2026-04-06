import { useState, useEffect, useRef, createContext, useContext } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAllowed, setIsAllowed] = useState(null);
  const [loading, setLoading] = useState(true);
  const checkedUserIdRef = useRef(null);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // 이미 동일한 유저로 체크했으면 재조회 생략 (탭 전환 등)
        if (checkedUserIdRef.current === session.user.id) return;
        checkedUserIdRef.current = session.user.id;
        checkUserStatus(session.user);
      } else {
        checkedUserIdRef.current = null;
        setProfile(null);
        setIsAllowed(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUserStatus = async (currentUser) => {
    try {
      // 1. 허용 이메일 확인
      const { data: allowedData, error: allowedError } = await supabase
        .from("allowed_emails")
        .select("email")
        .eq("email", currentUser.email)
        .maybeSingle();

      if (!allowedData) {
        setIsAllowed(false);
        setProfile(null);
      } else {
        setIsAllowed(true);

        // 2. 프로필 조회 - RLS 정책 우회를 위해 individual_profile_access 정책 활용
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("nickname")
          .eq("id", currentUser.id)
          .single();

        if (profileError) {
          console.error("Error fetching profile:", profileError);
        }
        setProfile(profileData || null);
      }
    } catch (err) {
      console.error("checkUserStatus error:", err);
      setIsAllowed(false);
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) console.error(error.message);
  };

  const signOut = async () => await supabase.auth.signOut();

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isAllowed,
        loading,
        signInWithGoogle,
        signOut,
        setProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);