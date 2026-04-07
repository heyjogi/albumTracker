import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // INITIAL_SESSION이나 SIGNED_IN 이벤트 시에만 프로필을 가져옵니다.
        // TOKEN_REFRESH 등 부수적인 이벤트에서의 중복 호출을 방지합니다.
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
          setLoading(true);
          fetchProfile(session.user.id);
        } else {
          setLoading(false);
        }
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // allowed_emails 조회 제거 — Supabase signup 차단이 허용 관리 역할을 대신함
  // 로그인 가능한 사람 = 대시보드에서 미리 등록된 사람뿐이므로 추가 체크 불필요
  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("nickname")
        .eq("id", userId)
        .single();

      if (error) console.error("Error fetching profile:", error);
      setProfile(data || null);
    } catch (err) {
      console.error("fetchProfile error:", err);
      setProfile(null);
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
