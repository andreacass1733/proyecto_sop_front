import React, { createContext, useContext, useState, useEffect } from "react";
import {
  iniciarSesion,
  verificar2FaApi,
  reenviar2FaApi,
  cerrarSesionApi,
  getStoredToken,
  setStoredToken,
  removeStoredToken,
  InitialLoginResponse,
} from "services/api";

export interface MedicoSession {
  id: string;
  nombre: string;
  primer_apellido: string;
  segundo_apellido?: string;
  especialidad?: string;
  telefono?: string;
  created_at?: string;
  updated_at?: string;
}

export const DR_RODRIGO_ESPINOZA: MedicoSession = {
  id: "0a8eaba2-be5b-4dbd-b22b-fc35c5616c12",
  nombre: "Rodrigo",
  primer_apellido: "Espinoza",
  segundo_apellido: "Iturri",
  especialidad: "Endocrinología",
  telefono: "79678791",
};

interface Step1Result {
  success: boolean;
  requires_2fa?: boolean;
  session_id?: string;
  email_masked?: string;
  telefono_masked?: string;
  codigo_demo?: string;
  error?: string;
}

interface AuthContextType {
  medico: MedicoSession | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  loginStep1: (email: string, password: string, require_2fa?: boolean) => Promise<Step1Result>;
  verify2Fa: (session_id: string, code: string) => Promise<{ success: boolean; error?: string }>;
  resend2Fa: (session_id: string) => Promise<{ success: boolean; codigo_demo?: string; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [medico, setMedico] = useState<MedicoSession | null>(() => {
    const saved = localStorage.getItem("sop_active_doctor");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const savedToken = getStoredToken();
    const savedDoctor = localStorage.getItem("sop_active_doctor");

    if (savedToken && savedDoctor) {
      try {
        setToken(savedToken);
        setMedico(JSON.parse(savedDoctor));
      } catch {
        removeStoredToken();
        localStorage.removeItem("sop_active_doctor");
        setToken(null);
        setMedico(null);
      }
    } else {
      setToken(null);
      setMedico(null);
    }
    setLoading(false);
  }, []);

  const loginStep1 = async (
    email: string,
    password: string,
    require_2fa: boolean = false
  ): Promise<Step1Result> => {
    try {
      const data: InitialLoginResponse = await iniciarSesion({ email, password, require_2fa });

      // Si es Acceso Rápido Directo: Almacenar sesión inmediatamente
      if (!data.requires_2fa && data.access_token && data.medico) {
        const doctorData: MedicoSession = {
          id: data.medico.id,
          nombre: data.medico.nombre,
          primer_apellido: data.medico.primer_apellido,
          segundo_apellido: data.medico.segundo_apellido || "",
          especialidad: data.medico.especialidad || "Endocrinología",
          telefono: data.medico.telefono || "79678791",
          created_at: data.medico.created_at,
          updated_at: data.medico.updated_at,
        };
        setStoredToken(data.access_token);
        localStorage.setItem("sop_active_doctor", JSON.stringify(doctorData));
        setToken(data.access_token);
        setMedico(doctorData);
      }

      return {
        success: true,
        requires_2fa: data.requires_2fa,
        session_id: data.session_id,
        email_masked: data.email_masked,
        telefono_masked: data.telefono_masked,
        codigo_demo: data.codigo_demo,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Correo o contraseña incorrectos",
      };
    }
  };

  const verify2Fa = async (
    session_id: string,
    code: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const data = await verificar2FaApi({ session_id, code });
      const doctorData: MedicoSession = {
        id: data.medico.id,
        nombre: data.medico.nombre,
        primer_apellido: data.medico.primer_apellido,
        segundo_apellido: data.medico.segundo_apellido || "",
        especialidad: data.medico.especialidad || "Endocrinología",
        telefono: data.medico.telefono || "79678791",
        created_at: data.medico.created_at,
        updated_at: data.medico.updated_at,
      };

      setStoredToken(data.access_token);
      localStorage.setItem("sop_active_doctor", JSON.stringify(doctorData));
      setToken(data.access_token);
      setMedico(doctorData);

      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Código de verificación incorrecto",
      };
    }
  };

  const resend2Fa = async (
    session_id: string
  ): Promise<{ success: boolean; codigo_demo?: string; error?: string }> => {
    try {
      const data = await reenviar2FaApi(session_id);
      return { success: true, codigo_demo: data.codigo_demo };
    } catch (err: any) {
      return { success: false, error: err.message || "Error al reenviar código" };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await cerrarSesionApi();
    } catch (e) {
      console.warn("Error en cierre de sesión:", e);
    } finally {
      removeStoredToken();
      localStorage.removeItem("sop_active_doctor");
      setToken(null);
      setMedico(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        medico,
        token,
        isAuthenticated: !!token && !!medico,
        loading,
        loginStep1,
        verify2Fa,
        resend2Fa,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
