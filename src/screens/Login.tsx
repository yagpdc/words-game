import { useFloatingLetters } from "../hooks/use-floating-letters";
import { useLogin } from "../hooks/auth/use-login.hook";
import logo from "../assets/loggo.png";
import React, { useRef, useState, useEffect } from "react";
import { WORDS_API_ORIGIN } from "../api/words";
const Login = () => {
  const { sectionRef, cardRef, letters, enterDuration, letterFontFamily } = useFloatingLetters();
  const logoRef = useRef<HTMLImageElement>(null);
  
  // local UI mode: 'login' or 'signup'
  const [mode, setMode] = useState<"login" | "signup">("login");
  // signup state
  const [signupName, setSignupName] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPending, setSignupPending] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState<string | null>(null);

  const {
    username,
    password,
    isPending,
    isError,
    isSuccess,
    handleSubmit,
    handleUsernameChange,
    handlePasswordChange,
    errorMessage,
    errorStatus,
  } = useLogin();

  // Show API toasts for login/signup errors and successes
  useEffect(() => {
    if (isError && errorMessage) {
      try {
        (window as any).showApiToast?.(errorMessage, errorStatus ?? null);
      } catch {}
    }

    if (isSuccess) {
      try {
        (window as any).showApiToast?.("Autenticado com sucesso.", 200);
      } catch {}
    }
  }, [isError, errorMessage, errorStatus, isSuccess]);

  // API origin taken from shared api config (WORDS_API_ORIGIN respects VITE vars)
  const apiBase = WORDS_API_ORIGIN;

  const handleSignupSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSignupError(null);
    setSignupSuccess(null);
    if (signupName.trim().length === 0 || signupPassword.length < 6) {
      setSignupError("Nome e senha (mínimo 6 caracteres) são obrigatórios");
      return;
    }

    try {
      setSignupPending(true);
      const res = await fetch(`${apiBase}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: signupName.trim(), password: signupPassword }),
      });

      if (res.status === 201) {
        const data = await res.json();
        setSignupSuccess("Cadastro realizado com sucesso. Faça login.");
        // prefill login username
        handleUsernameChange({ target: { value: data.name } } as any);
        setMode("login");
        setSignupName("");
        setSignupPassword("");
        // show toast success
        try {
          (window as any).showApiToast?.("Cadastro realizado com sucesso", 201);
        } catch {}
      } else {
        const err = await res.json().catch(() => ({}));
        const message = err.error || err.message || `Erro no cadastro (${res.status})`;
        setSignupError(message);
        try {
          (window as any).showApiToast?.(message, res.status);
        } catch {}
      }
    } catch (err: any) {
      setSignupError(err.message || "Erro ao conectar com servidor");
    } finally {
      setSignupPending(false);
    }
  };

  // Listen to login mutation errors (we get errorMessage/errorStatus from hook)
  // login toast handled by the effect above

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#1f1f1f] text-white"
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {letters.map((letter) => {
          let isOverLogo = false;
          if (logoRef.current) {
            const rect = logoRef.current.getBoundingClientRect();
            // Ajusta para considerar o centro da letra
            if (
              letter.x >= rect.left &&
              letter.x <= rect.right &&
              letter.y >= rect.top &&
              letter.y <= rect.bottom
            ) {
              isOverLogo = true;
            }
          }
          if (isOverLogo) return null;
          return (
            <span
              key={letter.id}
              className="absolute transition-all ease-out"
              style={{
                left: `${letter.x}px`,
                top: `${letter.y}px`,
                opacity: letter.visible ? 1 : 0,
                transform: `translate(-50%, -50%) scale(${letter.visible ? 1 : 0.85})`,
                transitionDuration: `${enterDuration}ms`,
              }}
            >
              <span
                className="block text-5xl font-black uppercase tracking-widest text-slate-200 drop-shadow-[0_6px_25px_rgba(0,0,0,0.65)]"
                style={{
                  fontFamily: letterFontFamily,
                  WebkitTextStroke: "1px rgba(15,23,42,0.75)",
                  textShadow:
                    "0 4px 12px rgba(2,6,23,0.6), 0 0 12px rgba(148,163,184,0.45)",
                  letterSpacing: "0.08em",
                }}
              >
                {letter.letter}
              </span>
            </span>
          );
        })}
      </div>
      <div className="flex flex-col items-center justify-center ">
        <img ref={logoRef} src={logo} alt="Froggo Logo" className="mx-auto mb-6 h-44 w-auto" />
        <form
          ref={cardRef}
          className="relative z-10 flex flex-col gap-4 rounded-lg border border-neutral-700 p-6 shadow-lg h-full min-w-[400px] w-[20vw]"
          onSubmit={mode === "login" ? handleSubmit : handleSignupSubmit}
        >
          <header className="text-center">
            <h1 className="text-2xl font-semibold">{mode === "login" ? "Entrar" : "Cadastro"}</h1>
            <p className="text-sm text-neutral-400">
              {mode === "login" ? "Informe suas credenciais." : "Crie sua conta (senha mínimo 6 caracteres)."}
            </p>
            <div className="mt-2">
              <button type="button" onClick={() => setMode(mode === "login" ? "signup" : "login")} className="text-xs cursor-pointer text-neutral-400 underline">
                {mode === "login" ? "Cadastro" : "Voltar para o login"}
              </button>
            </div>
          </header>

          {mode === "login" ? (
            <>
              <label className="flex flex-col gap-2 text-sm items-start">
                Usuario
                <input
                  className="w-full rounded border border-neutral-700 bg-neutral-800 p-2 text-white focus:border-purple-500 focus:outline-none"
                  type="text"
                  value={username}
                  onChange={handleUsernameChange}
                  placeholder="Digite o usuario"
                  required
                  disabled={isPending}
                />
              </label>

              <label className="flex flex-col gap-2 text-sm items-start">
                Senha
                <input
                  className="w-full rounded border border-neutral-700 bg-neutral-800 p-2 text-white focus:border-purple-500 focus:outline-none"
                  type="password"
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="********"
                  required
                  disabled={isPending}
                />
              </label>

              <button
                type="submit"
                className={`rounded py-2 font-semibold text-white cursor-pointer transition
                  bg-green-700 hover:bg-green-800
                  disabled:cursor-not-allowed disabled:bg-green-900
                  ${isPending ? 'skeleton-effect' : ''}`}
                disabled={isPending}
              >
                {isPending ? "Entrando..." : "Entrar"}
              </button>

          
            </>
          ) : (
            <>
              <label className="flex flex-col gap-2 text-sm items-start">
                Nome de usuário
                <input
                  className="w-full rounded border border-neutral-700 bg-neutral-800 p-2 text-white focus:border-purple-500 focus:outline-none"
                  type="text"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  placeholder="Escolha um nome"
                  required
                  disabled={signupPending}
                />
              </label>

              <label className="flex flex-col gap-2 text-sm items-start">
                Senha
                <input
                  className="w-full rounded border border-neutral-700 bg-neutral-800 p-2 text-white focus:border-purple-500 focus:outline-none"
                  type="password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  disabled={signupPending}
                />
              </label>

              <button
                type="submit"
                className={`rounded py-2 font-semibold text-white cursor-pointer transition
                  bg-green-700 hover:bg-green-800
                  disabled:cursor-not-allowed disabled:bg-green-900
                  ${signupPending ? 'skeleton-effect' : ''}`}
                disabled={signupPending}
              >
                {signupPending ? "Cadastrando..." : "Cadastrar"}
              </button>

              {signupError ? (
                <p className="text-sm text-red-400">{signupError}</p>
              ) : null}

              {signupSuccess ? (
                <p className="text-sm text-green-400">{signupSuccess}</p>
              ) : null}
            </>
          )}
        </form>
      </div>
    </section>
  );
};

export default Login;
