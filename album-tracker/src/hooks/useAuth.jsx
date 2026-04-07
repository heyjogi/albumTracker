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
        setLoading(true); // Re-validate status on session change
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
      // 허용 이메일 DB 확인 (캐시 없이 매번 확인 — 삭제된 계정 즉시 차단)
      const { data: allowedData, error: allowedError } = await supabase
        .from("allowed_emails")
        .select("email")
        .eq("email", currentUser.email)
        .maybeSingle();

      console.log("Allowed email check result (DB):", { allowedData, email: currentUser.email });

      if (allowedError) {
        console.error("Error checking allowed email:", allowedError);
        setIsAllowed(false);
        setProfile(null);
        await supabase.auth.signOut();
        return;
      }

      const isUserAllowed = !!allowedData;
      setIsAllowed(isUserAllowed);

      if (!isUserAllowed) {
        setProfile(null);
        await supabase.auth.signOut(); // 권한 없으면 세션 즉시 종료
        return;
      }

      // 프로필 조회
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("nickname")
        .eq("id", currentUser.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
      }
      setProfile(profileData || null);
    } catch (err) {
      console.error("checkUserStatus error:", err);
      setIsAllowed(false);
      await supabase.auth.signOut();
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

  const signOut = async () => {
    await supabase.auth.signOut();
  };

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