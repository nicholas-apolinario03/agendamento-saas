import { Routes, Route } from "react-router-dom";

import { CadastroEmpresa } from "./pages/CadastroEmpresa";
import { LoginEmpresas } from "./pages/LoginEmpesa";
import { DashboardHorario } from "./pages/DashboardHorario";
import { DashboardEmpresa } from "./pages/DashboardEmpresa";
import { ProtecaoRota } from "./components/ProtecaoRota";
import { PublicRoute } from "./components/PublicRoute";
import { CadastroClienteEmpresa } from "./pages/CadastroClienteEmpresa";
import { DashboardAgendamento } from "./pages/DashboardAgendamento";
import { PoliticaPrivacidade } from "./components/PoliticaPrivacidade";



function App() {
  return (
    <Routes>
      <Route
    path="/politica-de-privacidade"
    element={<PoliticaPrivacidade />}
/>
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
       
      

    </Routes>

  );
}

export default App;