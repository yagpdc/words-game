import { useEffect, useMemo, useState } from "react";
import {
  BACKGROUND_OPTIONS,
  BACKGROUND_GRADIENTS,
  BODY_OPTIONS,
  DEFAULT_AVATAR_BACKGROUND_ID,
  FROG_OPTIONS,
  HAT_OPTIONS,
  getFrogAsset,
  getHatAsset,
  getBodyAsset,
} from "../constants/avatar-options";
import { useAuth } from "../hooks/auth/use-auth.hook";
import { useUpdateAvatarConfig } from "../hooks/words/use-update-avatar-config";
import AvatarPreview from "../components/AvatarPreview";
import { normalizeAvatarConfig } from "../utils/avatar";

const Profile = () => {
  const { user, updateUser } = useAuth();

  const savedConfig = useMemo(
    () => normalizeAvatarConfig(user?.config),
    [user?.config],
  );

  const [frogType, setFrogType] = useState(savedConfig.frogType);
  const [hat, setHat] = useState<string | null>(savedConfig.hat);
  const [body, setBody] = useState<string | null>(savedConfig.body);
  const [background, setBackground] = useState(savedConfig.background);

  useEffect(() => {
    setFrogType(savedConfig.frogType);
    setHat(savedConfig.hat);
    setBody(savedConfig.body);
    setBackground(savedConfig.background);
  }, [
    savedConfig.background,
    savedConfig.body,
    savedConfig.frogType,
    savedConfig.hat,
  ]);

  const updateMutation = useUpdateAvatarConfig({
    onSuccess: (updatedUser) => {
      updateUser(updatedUser);
    },
  });

  const frogs = FROG_OPTIONS;
  const hatsOptions = HAT_OPTIONS;
  const bodiesOptions = BODY_OPTIONS;
  const backgroundsOptions = BACKGROUND_OPTIONS;

  const selectedTypeOption =
    frogs.find((option) => option.id === frogType) ?? frogs[0];
  const resolvedFrog =
    selectedTypeOption ??
    ({ id: frogType, label: "Sapo", allowAccessories: true } as const);
  const allowsAccessories = resolvedFrog.allowAccessories !== false;

  useEffect(() => {
    if (!frogs.some((option) => option.id === frogType)) {
      setFrogType(FROG_OPTIONS[0].id);
    }
  }, [frogType, frogs]);

  const hatChoices = hatsOptions;
  const bodyChoices = bodiesOptions;

  const selectedHatOption = (hatChoices.find((option) => option.id === hat) as {
    id: string | null;
    label: string;
  }) ?? { id: null, label: "Sem chapéu" };

  const selectedBodyOption = (bodyChoices.find(
    (option) => option.id === body,
  ) as {
    id: string | null;
    label: string;
  }) ?? { id: null, label: "Sem roupa" };

  const selectedBackground = backgroundsOptions.find(
    (option) => option.id === background,
  ) ??
    backgroundsOptions[0] ?? { id: background, label: "Padrão" };

  const isDirty =
    frogType !== savedConfig.frogType ||
    (hat ?? null) !== (savedConfig.hat ?? null) ||
    (body ?? null) !== (savedConfig.body ?? null) ||
    background !== savedConfig.background;

  const handleSave = () => {
    updateMutation.mutate({
      frogType,
      hat: allowsAccessories ? hat : null,
      body: allowsAccessories ? body : null,
      background,
    });
  };

  const handleReset = () => {
    setFrogType(savedConfig.frogType);
    setHat(savedConfig.hat);
    setBody(savedConfig.body);
    setBackground(savedConfig.background);
  };

  const feedbackMessage = useMemo(() => {
    if (updateMutation.isSuccess) {
      return "Avatar salvo com sucesso!";
    }

    if (updateMutation.isError) {
      return updateMutation.error.message || "Não foi possível salvar agora.";
    }

    return null;
  }, [updateMutation.error, updateMutation.isError, updateMutation.isSuccess]);

  const feedbackColor =
    updateMutation.isError && feedbackMessage
      ? "text-red-400"
      : updateMutation.isSuccess
        ? "text-emerald-400"
        : "text-neutral-400";

  type SelectionTab = "types" | "bodies" | "hats";
  const [activeTab, setActiveTab] = useState<SelectionTab>("types");

  useEffect(() => {
    if (!allowsAccessories && activeTab !== "types") {
      setActiveTab("types");
    }
  }, [activeTab, allowsAccessories]);

  useEffect(() => {
    if (!allowsAccessories) {
      if (hat) {
        setHat(null);
      }
      if (body) {
        setBody(null);
      }
      if (background !== DEFAULT_AVATAR_BACKGROUND_ID) {
        setBackground(DEFAULT_AVATAR_BACKGROUND_ID);
      }
    }
  }, [allowsAccessories, hat, body, background]);

  useEffect(() => {
    if (hat && !hatsOptions.some((option) => option.id === hat)) {
      setHat(null);
    }
  }, [hat, hatsOptions]);

  useEffect(() => {
    if (body && !bodiesOptions.some((option) => option.id === body)) {
      setBody(null);
    }
  }, [body, bodiesOptions]);

  useEffect(() => {
    if (!backgroundsOptions.some((option) => option.id === background)) {
      setBackground(DEFAULT_AVATAR_BACKGROUND_ID);
    }
  }, [background, backgroundsOptions]);

  return (
    <section className="flex w-full justify-center">
      <div className="flex w-full max-w-5xl flex-col gap-8 py-10 text-white">
        <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-neutral-500">
              Perfil · Laboratório de Avatares
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Monte o seu Sapo</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={!isDirty || updateMutation.isPending}
              className="rounded-lg bg-purple-700 px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-white transition enabled:hover:bg-purple-600 disabled:cursor-not-allowed disabled:bg-neutral-700 cursor-pointer"
            >
              {updateMutation.isPending ? "Salvando..." : "Salvar avatar"}
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={!isDirty || updateMutation.isPending}
              className="rounded-lg border border-neutral-700 px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-neutral-300 transition hover:border-neutral-500 disabled:cursor-not-allowed disabled:border-neutral-900 disabled:text-neutral-600 cursor-pointer"
            >
              Desfazer
            </button>
          </div>
        </header>
        {feedbackMessage ? (
          <p className={`text-xs ${feedbackColor}`}>{feedbackMessage}</p>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-2xl border border-neutral-800 bg-[#0f0b14] p-5">
            <div className="flex flex-col gap-4">
              <div className="relative flex min-h-[360px] items-center justify-center overflow-hidden rounded-2xl bg-[#0d0c17]">
                <div className="absolute inset-0 grid h-full w-full grid-cols-[repeat(10,minmax(0,1fr))] grid-rows-[repeat(10,minmax(0,1fr))] opacity-20">
                  {Array.from({ length: 100 }).map((_, index) => (
                    <div
                      key={`grid-${index}`}
                      className="border border-[#1f1a2b]"
                    />
                  ))}
                </div>
                <AvatarPreview
                  frogType={frogType}
                  hat={hat}
                  body={body}
                  background={background}
                  size={220}
                  className="relative"
                />
              </div>
              <div className="rounded-xl border border-neutral-800 bg-[#101022] p-4">
                <p className="text-xs uppercase tracking-[0.35em] text-neutral-500">
                  Seleção atual
                </p>
                <p className="text-3xl font-semibold text-white">
                  {resolvedFrog.label}
                </p>
                <p className="text-sm text-neutral-400">
                  Chapéu: {selectedHatOption.label}
                </p>
                <p className="text-sm text-neutral-400">
                  Roupa: {selectedBodyOption.label}
                </p>
                <p className="text-sm text-neutral-400">
                  Fundo: {selectedBackground.label}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(backgroundsOptions.length
                  ? backgroundsOptions
                  : [{ id: DEFAULT_AVATAR_BACKGROUND_ID, label: "Padrão" }]
                ).map((option) => {
                  const isSelected = option.id === background;
                  const gradient =
                    BACKGROUND_GRADIENTS[option.id] ??
                    BACKGROUND_GRADIENTS[DEFAULT_AVATAR_BACKGROUND_ID];
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        if (!allowsAccessories) return;
                        setBackground(option.id);
                      }}
                      disabled={!allowsAccessories}
                      className={`h-10 w-10 rounded-lg border transition ${
                        isSelected
                          ? "border-purple-500 shadow-[0_0_10px_rgba(147,51,234,0.5)]"
                          : allowsAccessories
                            ? "border-neutral-700 hover:border-neutral-500"
                            : "border-neutral-900"
                      }`}
                      style={{
                        background: `linear-gradient(180deg, ${gradient[0]}, ${gradient[1]})`,
                      }}
                      aria-label={option.label}
                      title={option.label}
                    />
                  );
                })}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-800 bg-[#0b0a12] p-5">
            <header className="flex flex-col gap-2">
              <h2 className="text-lg font-semibold">Loja de itens</h2>
              <div className="flex gap-2 rounded-xl border border-neutral-800 bg-[#120b17] p-1">
                {[
                  { id: "types", label: "Tipos", disabled: false },
                  {
                    id: "bodies",
                    label: "Roupas",
                    disabled: !allowsAccessories,
                  },
                  {
                    id: "hats",
                    label: "Chapéus",
                    disabled: !allowsAccessories,
                  },
                ].map((tab) => {
                  const isActive = activeTab === tab.id;
                  const tabDisabled = tab.disabled;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        if (tabDisabled) return;
                        setActiveTab(tab.id as SelectionTab);
                      }}
                      disabled={tabDisabled}
                      className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                        tabDisabled
                          ? "text-neutral-600 cursor-not-allowed"
                          : isActive
                            ? "bg-purple-600 text-white shadow-[0_5px_20px_rgba(147,51,234,0.3)] cursor-pointer"
                            : "text-neutral-400 hover:text-white cursor-pointer"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </header>

            <div className="mt-6 grid gap-2 sm:grid-cols-4">
              {activeTab === "types"
                ? frogs.map((option) => {
                    const isSelected = option.id === frogType;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setFrogType(option.id);
                          if (option.allowAccessories === false) {
                            setHat(null);
                            setBody(null);
                            setBackground(DEFAULT_AVATAR_BACKGROUND_ID);
                          }
                        }}
                        className={`flex flex-col items-center rounded-2xl border p-2 transition ${
                          isSelected
                            ? "border-purple-500 bg-purple-500/10 shadow-[0_10px_30px_rgba(147,51,234,0.25)] cursor-pointer"
                            : "border-neutral-800 hover:border-neutral-600 cursor-pointer"
                        }`}
                        title={option.label}
                      >
                        <div className="flex h-16 w-full items-center justify-center">
                          <img
                            src={getFrogAsset(option.id)}
                            alt={option.label}
                            className="max-h-full max-w-full object-contain"
                            loading="lazy"
                          />
                        </div>
                      </button>
                    );
                  })
                : activeTab === "bodies"
                  ? bodyChoices.map((option) => {
                      const isSelected = option.id === body;
                      const disabled = !allowsAccessories;
                      return (
                        <button
                          key={option.id ?? "body-none"}
                          type="button"
                          onClick={() => {
                            if (disabled) return;
                            setBody(option.id);
                          }}
                          disabled={disabled}
                          className={`flex flex-col items-center rounded-2xl border p-2 transition ${
                            disabled
                              ? "border-neutral-900 text-neutral-600 cursor-not-allowed"
                              : isSelected
                                ? "border-purple-500 bg-purple-500/10 shadow-[0_10px_30px_rgba(147,51,234,0.25)] cursor-pointer"
                                : "border-neutral-800 hover:border-neutral-600 cursor-pointer"
                          }`}
                          title={option.label}
                        >
                          <div className="flex h-16 w-full items-center justify-center">
                            {option.id ? (
                              <img
                                src={getBodyAsset(option.id)}
                                alt={option.label}
                                className="max-h-full max-w-full object-contain"
                                loading="lazy"
                              />
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-neutral-700 text-[8px] uppercase tracking-wide text-neutral-400">
                                Sem roupa
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })
                  : hatChoices.map((option) => {
                      const isSelected = option.id === hat;
                      const disabled = !allowsAccessories;
                      return (
                        <button
                          key={option.id ?? "hat-none"}
                          type="button"
                          onClick={() => {
                            if (disabled) return;
                            setHat(option.id);
                          }}
                          disabled={disabled}
                          className={`flex flex-col items-center rounded-2xl border p-2 transition ${
                            disabled
                              ? "border-neutral-900 text-neutral-600 cursor-not-allowed"
                              : isSelected
                                ? "border-purple-500 bg-purple-500/10 shadow-[0_10px_30px_rgba(147,51,234,0.25)] cursor-pointer"
                                : "border-neutral-800 hover:border-neutral-600 cursor-pointer"
                          }`}
                          title={option.label}
                        >
                          <div className="flex h-14 w-full items-center justify-center">
                            {option.id ? (
                              <img
                                src={getHatAsset(option.id)}
                                alt={option.label}
                                className="max-h-full max-w-full object-contain"
                                loading="lazy"
                              />
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-neutral-700 text-[8px] uppercase tracking-wide text-neutral-400">
                                Sem chapéu
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
};

export default Profile;
