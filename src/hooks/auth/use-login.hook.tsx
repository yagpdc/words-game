import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { WORDS_ENDPOINTS } from "../../api/words";
import { useAuth } from "./use-auth.hook";
import type { User } from "../../contexts/auth-context";

export type LoginPayload = {
  username: string;
  password: string;
};

type LoginSuccess = {
  user: User;
  token: string;
};

export const useLogin = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const mutation = useMutation({
    mutationFn: async (credentials: LoginPayload) => {
      const basic = btoa(`${credentials.username}:${credentials.password}`);
      const token = `Basic ${basic}`;

      const { data } = await axios.get<User>(WORDS_ENDPOINTS.profile, {
        headers: {
          Authorization: token,
        },
      });

      return { user: data, token };
    },
    onSuccess: ({ user, token }: LoginSuccess) => {
      login(user, token);
      navigate("/game");
    },
  });

  const handleUsernameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setUsername(event.target.value);
  };

  const handlePasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutation.mutate({ username, password });
  };

  return {
    username,
    password,
    isPending: mutation.isPending,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    handleSubmit,
    handleUsernameChange,
    handlePasswordChange,
  };
};
