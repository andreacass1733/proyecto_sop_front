import React, { createContext, useContext, useState, useEffect } from "react";

export interface MedicoSession {
  id: string;
  nombre: string;
  primer_apellido: string;
  segundo_apellido: string;
  especialidad: string;
  telefono: string;
}

export const DR_RODRIGO_ESPINOZA: MedicoSession = {
  id: "0a8eaba2-be5b-4dbd-b22b-fc35c5616c12",
  nombre: "Rodrigo",
  primer_apellido: "Espinoza",
  segundo_apellido: "Iturri",
  especialidad: "Endocrinología y Ginecología",
  telefono: "79678791",
};

interface AuthContextType {
  medico: MedicoSession | null;
  isAuthenticated: boolean;
  login: () => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [medico, setMedico] = useState<MedicoSession | null>(() => {
    const saved = localStorage.getItem("sop_active_doctor");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return DR_RODRIGO_ESPINOZA;
  });

  useEffect(() => {
    if (medico) {
      localStorage.setItem("sop_active_doctor", JSON.stringify(medico));
    } else {
      localStorage.removeItem("sop_active_doctor");
    }
  }, [medico]);

  const login = () => {
    setMedico(DR_RODRIGO_ESPINOZA);
    return true;
  };

  const logout = () => {
    setMedico(null);
  };

  return (
    <AuthContext.Provider value={{ medico, isAuthenticated: !!medico, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
