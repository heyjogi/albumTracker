import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAllowed, setIsAllowed] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) checkUserStatus(session.user);
      else setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) checkUserStatus(session.user);
      else {
        setProfile(null);
        setIsAllowed(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUserStatus = async (currentUser) => {
    try {
      // 1. 허용 이메일 확인 (error 객체도 함께 받아서 체크)
      const { data: allowedData, error: allowedError } = await supabase
        .from("allowed_emails")
        .select("email")
        .eq("email", currentUser.email)
        .maybeSingle(); // single() 대신 maybeSingle() 사용 권장 (데이터 없어도 에러 안남)

      if (!allowedData) {
        // 허용 리스트에 아예 없는 이메일인 경우
        setIsAllowed(false);
        setProfile(null);
      } else {
        // 허용된 사용자임!
        setIsAllowed(true);

        // 2. 프로필 조회 (로그인한 유저 ID로 조회)
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("nickname, created_at")
          .eq("id", currentUser.id) // safe_view라면 id로 정확히 매칭 필요
          .maybeSingle();

        if (profileError) {
          console.error("Error fetching profile:", profileError);
        }

        // 데이터가 없으면 null이 들어가고, AuthWrapper가 이걸 보고 setup 페이지로 보냄
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
