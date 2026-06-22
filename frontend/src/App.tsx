import { Routes, Route } from "react-router-dom";

import {CadastroEmpresa} from "./pages/CadastroEmpresa";
import {LoginEmpresas} from "./pages/LoginEmpesa";
import { CadastroServico } from "./pages/CadastroServicos";

function App() {
  return (
    <Routes>

      <Route
        path="/login"
        element={<LoginEmpresas />}
      />

      <Route
        path="/cadastro"
        element={<CadastroEmpresa />}
      />
      <Route
        path="/servico"
        element={<CadastroServico/>}
      />

    </Routes>
    
  );
}

export default App;