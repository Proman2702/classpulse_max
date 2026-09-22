import { useEffect, useRef, useState } from "react";
import { getAuthenticatedUser, signOut } from "./api/auth";
import { getUserByAuthId } from "./api/users";
import { getSupabase } from "./lib/supabase";
import { LoginPage } from "./pages/LoginPage";
import { StudentHomePage } from "./pages/StudentHomePage";
import { TeacherDashboard } from "./pages/TeacherDashboard";
import type { User } from "./types";

export const App = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const isSigningOut = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      try {
        const user = await getAuthenticatedUser();
        if (isMounted && !isSigningOut.current) {
          setCurrentUser(user);
        }
      } catch (error: unknown) {
        console.error("Failed to restore Supabase session:", error);
      } finally {
        if (isMounted) {
          setIsLoadingSession(false);
        }
      }
    };

    void loadSession();

    const { data: authListener } = getSupabase().auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setCurrentUser(null);
        setIsLoadingSession(false);
        return;
      }

      if (isSigningOut.current) {
        return;
      }

      // Run the profile request after the auth callback has completed.
      window.setTimeout(() => {
        void getUserByAuthId(session.user.id)
          .then((user) => {
            if (isMounted && !isSigningOut.current) {
              setCurrentUser(user);
              setIsLoadingSession(false);
            }
          })
          .catch((error: unknown) => {
            console.error("Failed to load user profile:", error);
            if (isMounted) {
              setCurrentUser(null);
              setIsLoadingSession(false);
            }
          });
      }, 0);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogin = (user: User) => {
    isSigningOut.current = false;
    setCurrentUser(user);
  };

  const handleLogout = () => {
    isSigningOut.current = true;
    setCurrentUser(null);

    void signOut().catch((error: unknown) => {
      console.error("Failed to sign out:", error);
    });
  };

  if (isLoadingSession) {
    return <main className="session-loading">Проверяем вход…</main>;
  }

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (currentUser.role === "student") {
    return <StudentHomePage user={currentUser} onLogout={handleLogout} />;
  }

  return <TeacherDashboard user={currentUser} onLogout={handleLogout} />;
};
