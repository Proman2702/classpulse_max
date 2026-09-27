import { useEffect, useState } from "react";
import { getCurrentUser, onSignedOut, signOut } from "./api/auth";
import { LoginScreen } from "./features/auth/LoginScreen";
import { PsychologistApp, StudentApp, TeacherApp } from "./features/RoleApps";
import { getErrorMessage } from "./lib/errors";
import type { User } from "./types";
import { Banner, ScreenSpinner } from "./ui";

const APPS = {
  student: StudentApp,
  teacher: TeacherApp,
  psychologist: PsychologistApp,
};

export const App = () => {
  // undefined — сессия ещё проверяется, null — пользователь не вошёл.
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [error, setError] = useState("");

  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .catch((sessionError) => {
        console.error("Failed to restore session:", sessionError);
        setError(getErrorMessage(sessionError));
        setUser(null);
      });

    try {
      return onSignedOut(() => setUser(null));
    } catch {
      return undefined;
    }
  }, []);

  const logout = async () => {
    setError("");
    try {
      await signOut();
      setUser(null);
    } catch (signOutError) {
      console.error("Failed to sign out:", signOutError);
      setError(getErrorMessage(signOutError, "Не удалось выйти. Попробуйте ещё раз"));
    }
  };

  if (user === undefined) return <ScreenSpinner />;

  if (!user) {
    return (
      <>
        {error && <Banner tone="error">{error}</Banner>}
        <LoginScreen onLogin={setUser} />
      </>
    );
  }

  const RoleApp = APPS[user.role];
  return <>{error && <Banner tone="error">{error}</Banner>}<RoleApp key={user.id} user={user} onUserChange={setUser} onLogout={logout} /></>;
};
