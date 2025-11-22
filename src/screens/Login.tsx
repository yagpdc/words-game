import { useFloatingLetters } from "../hooks/use-floating-letters";
import { useLogin } from "../hooks/auth/use-login.hook";
import logo from "../assets/loggo.png";
import { useRef } from "react";
const Login = () => {
  const { sectionRef, cardRef, letters, enterDuration, letterFontFamily } = useFloatingLetters();
  const logoRef = useRef<HTMLImageElement>(null);

  const {
    username,
    password,
    isPending,
    isError,
    isSuccess,
    handleSubmit,
    handleUsernameChange,
    handlePasswordChange,
  } = useLogin();

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
          onSubmit={handleSubmit}
        >
          <header className="text-center">
            <h1 className="text-2xl font-semibold">Entrar</h1>
            <p className="text-sm text-neutral-400">
              Informe suas credenciais.
            </p>
          </header>

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
            className="rounded bg-purple-800 py-2 font-semibold text-white cursor-pointer transition hover:bg-purple-900 disabled:cursor-not-allowed disabled:bg-blue-900"
            disabled={isPending}
          >
            {isPending ? "Entrando..." : "Entrar"}
          </button>

          {isError ? (
            <p className="text-sm text-red-400">
              Falha na autenticacao. Verifique seus dados.
            </p>
          ) : null}

          {isSuccess ? (
            <p className="text-sm text-green-400">Autenticado com sucesso.</p>
          ) : null}
        </form>
      </div>
    </section>
  );
};

export default Login;
