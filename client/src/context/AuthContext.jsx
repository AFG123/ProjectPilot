import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);
const API = import.meta.env.VITE_API_URL;

// Wipe per-user client caches (My Projects list + cached deep dives) so one
// account never sees another's data on a shared browser. Called on login/logout.
function clearLocalCaches() {
  try {
    sessionStorage.removeItem('pp_generations_cache');
    Object.keys(localStorage)
      .filter((k) => k.startsWith('pp_dd_'))
      .forEach((k) => localStorage.removeItem(k));
  } catch { /* storage unavailable — ignore */ }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // The JWT now lives in an httpOnly cookie the browser sends automatically —
  // JS can't read it. So on load we ask the server who we are instead of
  // decoding a token from localStorage.
  useEffect(() => {
    fetch(`${API}/api/auth/me`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setUser(data?.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function loginWithGoogle(credential) {
    const res = await fetch(`${API}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // let the browser store the cookie the server sets
      body: JSON.stringify({ credential }),
    });
    if (!res.ok) throw new Error('Authentication failed');
    const data = await res.json();
    clearLocalCaches(); // drop any previous user's cached data on this browser
    setUser(data.user); // includes isPaid from DB; cookie already set by server
    return data.user;
  }

  async function logout() {
    try {
      await fetch(`${API}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch {
      // even if the request fails, clear local state
    }
    clearLocalCaches();
    setUser(null);
  }

  // After a successful payment the server overwrites the cookie with isPaid=true.
  // We just refresh the in-memory user so locked cards unlock without a reload.
  function setPaidUser(updatedUser) {
    setUser(updatedUser);
  }

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout, setPaidUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
