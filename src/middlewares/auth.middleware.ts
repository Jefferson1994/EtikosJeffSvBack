import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { JwtPayload, VerifyErrors } from 'jsonwebtoken'; // Importa VerifyErrors
import * as dotenv from 'dotenv';

dotenv.config();

interface CustomRequest extends Request {
  user?: {
    id: number;
    correo: string;
    id_rol: number;
    rolNombre: string | null;
  };
}

const JWT_SECRET = process.env.NODE_ENV === 'development'
  ? process.env.JWT_Desarrollo
  : process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("ERROR CRÍTICO: La variable de entorno JWT_SECRET o JWT_Desarrollo no está definida.");
  console.error("Por favor, asegúrate de configurar JWT_SECRET en .env para producción, o JWT_Desarrollo en .env para desarrollo.");
  process.exit(1);
}

export const authenticateJWT = (req: CustomRequest, res: Response, next: NextFunction) => {
  console.log("--- Inicio del Middleware authenticateJWT ---");
  const authHeader = req.headers.authorization;
  console.log("Header Authorization recibido:", authHeader ? "Presente" : "Ausente");

  if (authHeader) {
    const token = authHeader.split(' ')[1];
    console.log("Token extraído (parcial):", token ? token.substring(0, 20) + '...' : "Vacío");

    if (!token) {
      console.log("Error: Token JWT no encontrado después de 'Bearer'.");
      return res.status(401).json({ mensaje: "Acceso no autorizado. Formato de token incorrecto (falta el token después de 'Bearer')." });
    }

    // Corregido: Usar JWT_SECRET! y tipar err como VerifyErrors | null
    jwt.verify(token, JWT_SECRET!, (err: VerifyErrors | null, user: string | JwtPayload | undefined) => {
      if (err) {
        console.log("Error en jwt.verify: Token inválido o expirado.");
        console.error("Error detallado:", err.message);
        res.status(403).json({ mensaje: "Token de autenticación inválido o expirado." });
        return; // Asegura que el callback retorna void
      }

      req.user = user as CustomRequest['user'];
      console.log("Token JWT verificado con éxito. Usuario autenticado:", req.user?.correo);
      console.log("--- Fin del Middleware authenticateJWT (Pasando a next()) ---");
      next();
    });
  } else {
    console.log("Header Authorization no proporcionado.");
    res.status(401).json({ mensaje: "Acceso no autorizado. Token JWT no proporcionado." });
    console.log("--- Fin del Middleware authenticateJWT (Respuesta 401) ---");
  }
};
