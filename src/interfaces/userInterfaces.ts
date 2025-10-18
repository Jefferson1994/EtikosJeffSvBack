import { Usuario } from "../entities/Usuario";

interface LoginSuccessResponse {
  user: Partial<Usuario>;
  token: string;
  twoFactorRequired: false;
}

interface TwoFactorRequiredResponse {
  twoFactorRequired: true;
  message: string;
}
interface LoginErrorResponse {
  error: true; // Una bandera clara para saber que es un error
  message: string;
  twoFactorRequired?: false; // Opcional, pero bueno para ser explícito
  user?: never; // Aseguramos que no se envíe info del usuario
  token?: never;  // Aseguramos que no se envíe token
}
export interface ValidationResponse {
  success: boolean;
  message: string;
}
export type Verify2faResponse = LoginSuccessResponse | null;

export type LoginResponse = LoginSuccessResponse | TwoFactorRequiredResponse |  LoginErrorResponse |null;

