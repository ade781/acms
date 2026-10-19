import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { getCurrentOperationalShift, getScheduledTeam, TEAMS, cleanTeam } from '../utils/shiftHelper';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('arff_token') || null);
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('arff_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Operational Context (active date, shift number 1-3, team Alpha-Delta)
  const currentOp = getCurrentOperationalShift();
  const [activeDate, setActiveDateState] = useState(currentOp.shiftDate);
  const [activeShiftNumber, setActiveShiftNumberState] = useState(currentOp.shiftNumber);
  const [activeTeam, setActiveTeam] = useState(currentOp.scheduledTeam || TEAMS[0]);

  // Otomatis sinkronkan regu dinas saat tanggal dipilih, kecuali user sengaja memilih regu lain
  const setActiveDate = (newDate) => {
    setActiveDateState(newDate);
    setActiveTeam(getScheduledTeam(newDate, activeShiftNumber));
  };

  // Otomatis sinkronkan regu dinas saat shift (1-3) dipilih
  const setActiveShiftNumber = (newShift) => {
    const shiftNum = Number(newShift);
    setActiveShiftNumberState(shiftNum);
    setActiveTeam(getScheduledTeam(activeDate, shiftNum));
  };

  // Sync token to API defaults and verify
  const isVerifyingRef = React.useRef(false);

  useEffect(() => {
    async function verifySession() {
      if (!token) {
        setLoading(false);
        return;
      }
      if (isVerifyingRef.current) return;
      isVerifyingRef.current = true;

      try {
        const res = await api.get('/auth/me');
        const userData = res.data?.data || res.data?.user || res.data;
        if (userData && userData.id) {
          setUser(userData);
          localStorage.setItem('arff_user', JSON.stringify(userData));
          // If user belongs to a specific team, prioritize that team only if different
          if (userData.team_group) {
            const userTeam = cleanTeam(userData.team_group);
            setActiveTeam((prev) => (prev !== userTeam ? userTeam : prev));
          }
        }
      } catch (err) {
        console.warn('Sesi kedaluwarsa atau server belum siap:', err.message);
        if (err.response && err.response.status === 401) {
          logout();
        }
      } finally {
        setLoading(false);
        isVerifyingRef.current = false;
      }
    }

    verifySession();
  }, [token]);

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    const payload = res.data?.data || res.data;
    const receivedToken = payload?.token;
    const receivedUser = payload?.user;

    if (!receivedToken || !receivedUser) {
      throw new Error('Data login dari server tidak lengkap');
    }

    setToken(receivedToken);
    setUser(receivedUser);
    localStorage.setItem('arff_token', receivedToken);
    localStorage.setItem('arff_user', JSON.stringify(receivedUser));

    if (receivedUser?.team_group) {
      setActiveTeam(cleanTeam(receivedUser.team_group));
    }

    return receivedUser;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('arff_token');
    localStorage.removeItem('arff_user');
  };

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      const userData = res.data?.data || res.data?.user || res.data;
      if (userData && userData.id) {
        setUser(userData);
        localStorage.setItem('arff_user', JSON.stringify(userData));
      }
    } catch (e) {
      console.error('Failed refreshing user:', e);
    }
  };

  const isRole = (...roles) => {
    if (!user || !user.role) return false;
    return roles.includes(user.role.toLowerCase());
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    refreshUser,
    isRole,
    isAdmin: isRole('admin'),
    isSupervisor: isRole('supervisor', 'admin'),
    activeDate,
    setActiveDate,
    activeShiftNumber,
    setActiveShiftNumber,
    activeTeam,
    setActiveTeam,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
