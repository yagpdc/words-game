import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import "./App.css";
import Router from "./Router";
import { AuthProvider } from "./contexts/AuthContext";
import { OnlineToastProvider } from "./components/OnlineToastProvider";
import ApiToastProvider from "./components/ApiToastProvider";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
        <OnlineToastProvider />
        <ApiToastProvider />
          <Router />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
