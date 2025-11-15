import { Navigate, Route, Routes } from "react-router-dom";
import AuthenticatedLayout from "./layouts/AuthenticatedLayout";
import { useAuth } from "./hooks/auth/use-auth.hook";
import Game from "./screens/Game";
import GameDaily from "./screens/GameDaily";
import GameInfinity from "./screens/GameInfinity";
import Leaderboard from "./screens/Leaderboard";
import Login from "./screens/Login";
import Profile from "./screens/Profile";

const Router = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  return (
    <Routes>
      <Route
        path="/"
        element={isAuthenticated ? <Navigate to="/game" replace /> : <Login />}
      />
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <AuthenticatedLayout>
              <Game />
            </AuthenticatedLayout>
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/game"
        element={
          isAuthenticated ? (
            <AuthenticatedLayout>
              <Game />
            </AuthenticatedLayout>
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/game/infinity"
        element={
          isAuthenticated ? (
            <AuthenticatedLayout>
              <GameInfinity />
            </AuthenticatedLayout>
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/game/daily"
        element={
          isAuthenticated ? (
            <AuthenticatedLayout>
              <GameDaily />
            </AuthenticatedLayout>
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/leaderboard"
        element={
          isAuthenticated ? (
            <AuthenticatedLayout>
              <Leaderboard />
            </AuthenticatedLayout>
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/profile"
        element={
          isAuthenticated ? (
            <AuthenticatedLayout>
              <Profile />
            </AuthenticatedLayout>
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
    </Routes>
  );
};

export default Router;
