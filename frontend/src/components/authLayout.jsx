// layouts/AuthLayout.jsx
import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../config";

const AuthLayout = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await axios.get(`${API_BASE_URL}/api/auth/me`, { withCredentials: true }); // endpoint returns user if logged in
        setAuthenticated(true);
      } catch (err) {
        setAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) return <p>Loading...</p>;
  if (!authenticated) return <Navigate to="/login" replace />;

  return <>{children}</>;
};

export default AuthLayout;
