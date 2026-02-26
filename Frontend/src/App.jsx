import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import DeliveryInfo from "./pages/DeliveryInfo";
import CompletedScan from "./pages/CompletedScan";
import Scanning from "./pages/Scanning";
import { Toaster } from "react-hot-toast";
// import NotFound from "./pages/NotFound";

function App() {
  return (
    <Router>
            <Toaster position="top-right" />

      <Routes>
        {/* Default Route */}
        <Route path="/" element={<Login />} />

        {/* Dashboard */}
        <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/po-details" element={<DeliveryInfo />} />
                <Route path="/completed" element={<CompletedScan />} />
                <Route path="/scan" element={<Scanning />} />


        {/* 404 Page */}
        {/* <Route path="*" element={<NotFound />} /> */}
      </Routes>
    </Router>

    
  );
}

export default App;