import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { RoomProvider } from './context/RoomContext';

// Import pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Room from './pages/Room';
import NotFound from './pages/NotFound';

// Import components
import PrivateRoute from './components/routing/PrivateRoute';
import Navbar from './components/layout/Navbar';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <RoomProvider>
          <Router>
            <div className="App">
              <Navbar />
              <div className="container">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route
                    path="/dashboard"
                    element={
                      <PrivateRoute>
                        <Dashboard />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/room/:roomCode"
                    element={
                      <PrivateRoute>
                        <Room />
                      </PrivateRoute>
                    }
                  />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
            </div>
          </Router>
        </RoomProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
