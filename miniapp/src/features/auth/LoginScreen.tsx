import { useState, type FormEvent } from "react";
import { signIn, signUp } from "../../api/auth";
import { getErrorMessage } from "../../lib/errors";
import { max } from "../../lib/max";
import type { User, UserRole } from "../../types";
import { Banner, Button, cx, Field, Input, Segmented } from "../../ui";
import { BotAvatar } from "../shared/BotAvatar";

type Mode = "login" | "register";

const ROLES: Array<{ value: UserRole; emoji: string; title: string; text: string }> = [
  { value: "student", emoji: "🎒", title: "Ученик", text: "Делюсь, как прошёл день" },
  { value: "teacher", emoji: "📚", title: "Учитель", text: "Слежу за состоянием класса" },
  { value: "psychologist", emoji: "💬", title: "Психолог", text: "Принимаю обращения" },
];

export const LoginScreen = ({ onLogin }: { onLogin: (user: User) => void }) => {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState(max.userFirstName);
  const [role, setRole] = useState<UserRole>("student");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(null);

  const changeMode = (next: Mode) => {
    setMode(next);
    setMessage(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) return setMessage({ tone: "error", text: "Введите email и пароль" });
    if (mode === "register" && nickname.trim().length < 2) {
      return setMessage({ tone: "error", text: "Имя должно быть не короче двух символов" });
    }

    setMessage(null);
    setIsLoading(true);
    try {
      if (mode === "login") {
        onLogin(await signIn(email, password));
        return;
      }
      const user = await signUp({ email, password, nickname, role });
      if (user) {
        onLogin(user);
      } else {
        setMode("login");
        setMessage({ tone: "info", text: "Мы отправили письмо. Подтвердите email и войдите." });
      }
    } catch (error) {
      max.error();
      setMessage({ tone: "error", text: getErrorMessage(error, "Не удалось войти") });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="login">
      <div className="login__hero">
        <BotAvatar size={76} />
        <h1>ClassPulse</h1>
        <p>Быть услышанным — важно. Ученики делятся, как прошёл день, а учителя вовремя замечают, кому нужна поддержка.</p>
      </div>

      <form className="login__card form" onSubmit={submit}>
        <Segmented
          label="Способ входа"
          value={mode}
          onChange={changeMode}
          options={[{ value: "login", label: "Вход" }, { value: "register", label: "Регистрация" }]}
        />

        <Field label="Email">
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
            autoComplete="email"
          />
        </Field>
        <Field label="Пароль">
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Не менее 6 символов"
            minLength={6}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </Field>

        {mode === "register" && (
          <>
            <Field label="Как тебя зовут" hint="По этому имени учитель добавит тебя в класс">
              <Input
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                placeholder="Например, Маша"
                maxLength={40}
                autoComplete="nickname"
              />
            </Field>
            <div className="role-picker" role="radiogroup" aria-label="Роль">
              {ROLES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={role === option.value}
                  className={cx("role-option", role === option.value && "role-option--active")}
                  onClick={() => setRole(option.value)}
                >
                  <span className="role-option__emoji">{option.emoji}</span>
                  <strong>{option.title}</strong>
                  <small>{option.text}</small>
                </button>
              ))}
            </div>
          </>
        )}

        {message && <Banner tone={message.tone}>{message.text}</Banner>}

        <Button type="submit" stretched loading={isLoading}>
          {mode === "login" ? "Войти" : "Создать аккаунт"}
        </Button>
      </form>
    </main>
  );
};
