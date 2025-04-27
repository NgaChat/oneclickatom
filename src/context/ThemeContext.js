// src/context/ThemeContext.js
import React, { createContext } from 'react';
import theme from '../constants/theme';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};