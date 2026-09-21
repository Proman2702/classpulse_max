import { useState, type FormEvent } from "react";
import { signIn, signUp } from "../api/auth";
import { getErrorMessage } from "../lib/errors";
import type { User, UserRole } from "../types";

interface LoginPageProps {
  onLogin: (user: User) => void;
}

type AuthMode = "login" | "register";

export const LoginPage = ({ onLogin }: LoginPageProps) => {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [role, setRole] = useState<UserRole>("student");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError("");
    setNotice("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!email.trim() || !password) {
      setError("Введите email и пароль");
      return;
    }

    if (mode === "register" && nickname.trim().length < 2) {
      setError("Введите ник длиной не менее двух символов");
      return;
    }

    setIsLoading(true);

    try {
      if (mode === "login") {
        onLogin(await signIn(email, password));
        return;
      }

      const result = await signUp(email, password, nickname, role);
      if (result.user) {
        onLogin(result.user);
      } else if (result.requiresEmailConfirmation) {
        setNotice("Проверьте почту и подтвердите регистрацию, затем войдите.");
        setMode("login");
      }
    } catch (authError: unknown) {
      console.error("Supabase authentication failed:", authError);
      setError(getErrorMessage(authError, "Не удалось выполнить вход"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-card__logo" aria-hidden="true">CP</div>
        <p className="eyebrow">Быть услышанным — важно</p>
        <h1 id="login-title">Class Pulse</h1>
        <p className="login-card__intro">
          Простое пространство для обратной связи между учениками и учителями.
        </p>

        <div className="auth-tabs" role="tablist" aria-label="Способ входа">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "login"}
            className={mode === "login" ? "auth-tab auth-tab--active" : "auth-tab"}
            onClick={() => changeMode("login")}
          >
            Вход
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "register"}
            className={mode === "register" ? "auth-tab auth-tab--active" : "auth-tab"}
            onClick={() => changeMode("register")}
          >
            Регистрация
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              autoComplete="email"
              autoFocus
            />
          </label>

          <label className="field">
            <span>Пароль</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Не менее 6 символов"
              minLength={6}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>

          {mode === "register" && (
            <>
              <label className="field">
                <span>Ник</span>
                <input
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  placeholder="Например, Маша"
                  maxLength={40}
                  autoComplete="nickname"
                />
              </label>

              <fieldset className="role-picker">
                <legend>Кто вы?</legend>
                <label className={role === "student" ? "role-option role-option--active" : "role-option"}>
                  <input type="radio" name="role" value="student" checked={role === "student"} onChange={() => setRole("student")} />
                  <span className="role-option__icon" aria-hidden="true">🎒</span>
                  <span><strong>Я ученик</strong><small>Поделиться состоянием</small></span>
                </label>
                <label className={role === "teacher" ? "role-option role-option--active" : "role-option"}>
                  <input type="radio" name="role" value="teacher" checked={role === "teacher"} onChange={() => setRole("teacher")} />
                  <span className="role-option__icon" aria-hidden="true">📚</span>
                  <span><strong>Я учитель</strong><small>Увидеть обратную связь</small></span>
                </label>
              </fieldset>
            </>
          )}

          {error && <p className="message message--error" role="alert">{error}</p>}
          {notice && <p className="message" role="status">{notice}</p>}

          <button className="button button--primary" type="submit" disabled={isLoading}>
            {isLoading ? "Подождите…" : mode === "login" ? "Войти" : "Создать аккаунт"}
          </button>
        </form>

        <p className="login-card__notice">Вход защищён Supabase Auth</p>
      </section>
    </main>
  );
};
