import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/theme.css';
import './styles/components.css';

import { AuthProvider } from './context/AuthContext';
import { InteractionProvider } from './context/InteractionContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Trending from './pages/Trending';
import MovieDetail from './pages/MovieDetail';
import Search from './pages/Search';
import Login from './pages/Login';
import Signup from './pages/Signup';
import MyList from './pages/MyList';

function App() {
  return (
    <AuthProvider>
      <InteractionProvider>
        <Router>
          <div className="d-flex flex-column min-vh-100" style={{ backgroundColor: '#141414' }}>
            <Navbar />
            <main className="flex-grow-1">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                
                {/* Protected Routes: Require Authentication */}
                <Route 
                  path="/trending" 
                  element={
                    <ProtectedRoute>
                      <Trending />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/my-list" 
                  element={
                    <ProtectedRoute>
                      <MyList />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/search" 
                  element={
                    <ProtectedRoute>
                      <Search />
                    </ProtectedRoute>
                  } 
                />
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
            <Footer />
          </div>
        </Router>
      </InteractionProvider>
    </AuthProvider>
  );
}

export default App;
