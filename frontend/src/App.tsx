import { Routes, Route } from "react-router-dom";

import { CadastroEmpresa } from "./pages/CadastroEmpresa";
import { LoginEmpresas } from "./pages/LoginEmpesa";
import { DashboardHorario } from "./pages/DashboardHorario";
import { DashboardEmpresa } from "./pages/DashboardEmpresa";
import { ProtecaoRota } from "./components/ProtecaoRota";
import { PublicRoute } from "./components/PublicRoute";
import { CadastroClienteEmpresa } from "./components/CadastroClienteEmpresa";
import { DashboardAgendamento } from "./pages/DashboardAgendamento";
import { PoliticaPrivacidade } from "./components/PoliticaPrivacidade";
import Index from "./pages/PaginaInicial";
import Planos from "./pages/Planos";



function App() {
  return (
    <Routes>
      <Route
        path="/politica-de-privacidade"
        element={<PoliticaPrivacidade />}
      />
      <Route path="/" element={
        <Index />
      } />
      <Route path="/dashboard"
        element={
          <ProtecaoRota>

            <DashboardEmpresa />

          </ProtecaoRota>
        }
      />
      <Route path="/horario"
        element={
          <ProtecaoRota>

            <DashboardHorario />

          </ProtecaoRota>
        }
      />
      <Route path="/agendamento"
        element={
          <ProtecaoRota>

            <DashboardAgendamento />

          </ProtecaoRota>
        }
      />
      <Route path="/cliente"
        element={
          <ProtecaoRota>

            <CadastroClienteEmpresa />

          </ProtecaoRota>
        }
      />


      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginEmpresas />
          </PublicRoute>
        }
      />

      <Route
        path="/cadastro"
        element={
          <PublicRoute>
            <CadastroEmpresa />
          </PublicRoute>
        }
      />

      <Route
        path="/planos"
        element={<Planos />}
      />


    </Routes>

  );
}

export default App;