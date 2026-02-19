import { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const [accessToken, setAccessToken] = useState(localStorage.getItem("accessToken"));
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem("refreshToken"));

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedRole = localStorage.getItem("role");

    if (storedUser) setUser(JSON.parse(storedUser));
    if (storedRole) setRole(storedRole);
    setHydrated(true);
  }, []);

  const login = ({ accessToken, refreshToken, role, user }) => {
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    localStorage.setItem("role", role);
    localStorage.setItem("user", JSON.stringify(user));

    setAccessToken(accessToken);
    setRefreshToken(refreshToken);
    setRole(role);
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    setAccessToken(null);
    setRefreshToken(null);
    setRole(null);
    setUser(null);
  };

  const isAuthenticated = Boolean(accessToken && role && user);

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        accessToken,
        refreshToken,
        isAuthenticated,
        hydrated,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
