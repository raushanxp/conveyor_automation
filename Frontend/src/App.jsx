import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import DeliveryInfo from "./pages/DeliveryInfo";
import Scanning from "./pages/Scanning";
import MultiPoInfo from "./pages/MultiPoInfo";
import ProtectedRoute from "./components/ProtectedRoute";
import { Toaster } from "react-hot-toast";

function App() {
  return (
    <Router>
      <Toaster position="top-right" />

      <Routes>
        {/* Public Route */}
        <Route path="/" element={<Login />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/po-details"
          element={
            <ProtectedRoute>
              <DeliveryInfo />
            </ProtectedRoute>
          }
        />

        <Route
          path="/scan"
          element={
            <ProtectedRoute>
              <Scanning />
            </ProtectedRoute>
          }
        />

        <Route
          path="/multi-po-info"
          element={
            <ProtectedRoute>
              <MultiPoInfo />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;