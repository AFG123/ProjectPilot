import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import GeneratePage from './pages/GeneratePage';
import DeepDivePage from './pages/DeepDivePage';
import SavedPage from './pages/SavedPage';
import { TermsPage, PrivacyPage, RefundPage, ContactPage } from './pages/legal';

export default function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
      <AuthProvider>
        <BrowserRouter>
          <Navbar />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/generate" element={<GeneratePage />} />
            <Route path="/project/:index" element={<DeepDivePage />} />
            <Route path="/saved" element={<SavedPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/refund" element={<RefundPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
