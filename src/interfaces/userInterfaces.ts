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
export interface ValidationResponse {
  success: boolean;
  message: string;
}
export type Verify2faResponse = LoginSuccessResponse | null;

export type LoginResponse = LoginSuccessResponse | TwoFactorRequiredResponse | null;

