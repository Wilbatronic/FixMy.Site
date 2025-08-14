import React from 'react';
import { Navigate } from 'react-router-dom';
import auth from '../services/auth.js';

const ProtectedRoute = ({ children }) => {
  const currentUser = auth.getCurrentUser();

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  return children;
};

export default ProtectedRoute;
