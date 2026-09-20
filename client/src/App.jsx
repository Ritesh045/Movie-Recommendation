import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/theme.css';
import './styles/components.css';

import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Trending from './pages/Trending';
import MovieDetail from './pages/MovieDetail';
import Search from './pages/Search';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ChatWidget from './components/ChatWidget';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="d-flex flex-column min-vh-100" style={{ backgroundColor: '#141414' }}>
          <Navbar />
          <main className="flex-grow-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/trending" element={<Trending />} />
              <Route path="/search" element={<Search />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              
              {/* Protected Route: Movie details requires authentication */}
              <Route 
                path="/movie/:id" 
                element={
                  <ProtectedRoute>
                    <MovieDetail />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </main>
          {/* Floating AI Chatbot Widget */}
          <ChatWidget />
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
