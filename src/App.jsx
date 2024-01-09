import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Main } from "./pages/Main";
import { Room } from "./pages/Room";
import { NotFound404 } from "./pages/NotFound404";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Main />} />
        <Route path="/room/:id" element={<Room />} />
        <Route element={<NotFound404 />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
