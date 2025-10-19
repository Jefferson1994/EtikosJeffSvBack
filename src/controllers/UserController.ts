import { Request, Response } from 'express';
import {
  crearUsuario, obtenerLoginPorMail,solicitarRecuperacionContrasena,
  obtenerUsuarioPorIdentificacion, validarOtpVerificacionCuenta,
  validarOtpLogin2FA, cambiarContrasena, cambiarEstadoUsuario,
  restablecerContrasena,registrarCierreSesion,
  gestionarEstado2FA
} from '../services/UserService'; 
import { Usuario } from '../entities/Usuario'; 

interface CustomRequest extends Request {
  user?: {
    id: number;
    correo: string;
    id_rol: number;
    rolNombre: string | null;
  };
}

export class UserController {


  static async crear(req: Request, res: Response) {
    try {
      const { nombre, correo, contrasena, id_rol, numero_telefono, numero_identificacion } = req.body;
      const ipAddress = req.ip || null;
      const userAgent = req.headers['user-agent'] || null;

      if (!contrasena || contrasena.length < 8) {
        return res.status(400).json({ mensaje: "La contraseña es demasiado corta o no fue proporcionada (mínimo 8 caracteres)." });
      }
      if (!correo) {
        return res.status(400).json({ mensaje: "El correo electrónico es obligatorio." });
      }
      if (!nombre) {
        return res.status(400).json({ mensaje: "El nombre es obligatorio." });
      }
      if (!id_rol) {
        return res.status(400).json({ mensaje: "El ID del rol es obligatorio." });
      }

      const nuevoUsuario = await crearUsuario({
        nombre,
        correo,
        contrasena,
        id_rol,
        numero_telefono,
        numero_identificacion,
      },
        ipAddress,
        userAgent
      );



      const usuarioParaRespuesta: Partial<Usuario> = { ...nuevoUsuario };
      delete (usuarioParaRespuesta as any).contrasena;

      res.status(201).json({
        mensaje: "Usuario creado correctamente. Por favor, valide su cuenta.",
        usuario: usuarioParaRespuesta
      });
    } catch (error: unknown) {
      console.error("Error creando usuario:", (error as Error).message);

      // CORREGIDO: Eliminar la lógica duplicada para errores de unicidad
      // Ahora el controlador solo propaga el mensaje de error lanzado por el servicio
      res.status(400).json({ // Usar 400 o 409 si es un error de negocio esperado del servicio
        mensaje: (error as Error).message // Propagar el mensaje específico del servicio
      });
    }
  }


  static async LoginPorMail(req: Request, res: Response) {
    try {
      const { email, password } = req.body; // Controller extracts data from the request
      const ipAddress = req.ip || null;
      const userAgent = req.headers['user-agent'] || null;

      // Controller calls the service function, passing the extracted data
      const usuario = await obtenerLoginPorMail(email, password, ipAddress, userAgent);

          if (usuario) {
            // Controller processes the result from the service and sends an HTTP response
            if ('error' in usuario && usuario.error === true) {
          
          // Diferenciamos errores de servidor (500) de errores de autenticación (401)
          // Asumiendo que tu servicio devuelve un mensaje específico para errores graves
          if (usuario.message.startsWith('Ocurrió un error inesperado')) {
            return res.status(500).json({ message: usuario.message });
          }

          return res.status(401).json({ message: usuario.message });
        }
        if (usuario.twoFactorRequired) {
          return res.status(200).json({
            twoFactorRequired: true,
            message: usuario.message
          });
        }
        return res.status(200).json({
          message: 'Inicio de sesión exitoso',
          user: usuario.user,
          token: usuario.token,
          twoFactorRequired: usuario.twoFactorRequired
        });
      } else {
        res.status(401).json({ message: 'Credenciales inválidas' });
      }
    } catch (error: unknown) {
      // ... error handling ...
    }
  }

  
  //verificar cuenta
  static async verificarCuenta(req: Request, res: Response) {
    try {
      const { correo, codigoOtp } = req.body;
      if (!correo || !codigoOtp) {
        return res.status(400).json({ message: 'Se requiere el correo y el código OTP.' });
      }
      const ipAddress = req.ip || null;
      const userAgent = req.headers['user-agent'] || null;

      const resultado = await validarOtpVerificacionCuenta(correo, codigoOtp, ipAddress, userAgent);

      // 5. Procesa el resultado del servicio y envía la respuesta HTTP
      if (resultado.success) {
        // Si la validación fue exitosa
        return res.status(200).json({
          success: true,
          message: resultado.message
        });
      } else {
        // Si la validación falló (código incorrecto, expirado, etc.)
        return res.status(400).json({
          success: false,
          message: resultado.message
        });
      }
    } catch (error: unknown) {
      // Manejo de errores inesperados
      console.error("Error en el controlador de verificación de cuenta:", error);
      return res.status(500).json({ message: "Error interno del servidor." });
    }
  }

  //otp doble autenticacion
  static async verificarLogin2FA(req: Request, res: Response) {
    try {
      // 1. Extrae los datos del cuerpo de la petición (el JSON de Postman)
      const { correo, codigoOtp } = req.body;

      // 2. Valida que los datos necesarios estén presentes
      if (!correo || !codigoOtp) {
        return res.status(400).json({ message: 'Se requiere el correo y el código OTP.' });
      }

      // 3. Captura la metadata de seguridad, igual que en tu login
      const ipAddress = req.ip || null;
      const userAgent = req.headers['user-agent'] || null;

      // 4. Llama a tu servicio de validación
      const resultado = await validarOtpLogin2FA(correo, codigoOtp, ipAddress, userAgent);

      // 5. Procesa el resultado del servicio
      if (resultado) {
        // Éxito: El OTP fue correcto. Devolvemos el usuario y el token.
        return res.status(200).json({
          message: 'Verificación de dos pasos exitosa.',
          ...resultado // Esto incluye user, token y twoFactorRequired: false
        });
      } else {
        // Fallo: El OTP fue inválido, expiró, etc.
        // Usamos 401 Unauthorized porque es un fallo de autenticación.
        return res.status(401).json({ message: 'El código de verificación es inválido o ha expirado.' });
      }
    } catch (error: unknown) {
      // Manejo de errores inesperados (ej. la base de datos se cae)
      console.error("Error en el controlador de verificación 2FA:", error);
      return res.status(500).json({ message: "Error interno del servidor." });
    }
  }

  // cambiar contraseña
  static async cambiarContrasena(req: CustomRequest, res: Response) {
    try {
      // 1. Verifica que el usuario esté autenticado (el middleware ya lo hizo).
      if (!req.user) {
        return res.status(401).json({ mensaje: "Usuario no autenticado." });
      }

      // 2. Extrae los datos necesarios.
      const idUsuario = req.user.id;
      const { contrasenaActual, nuevaContrasena } = req.body;
      const ipAddress = req.ip || null;
      const userAgent = req.headers['user-agent'] || null;

      // 3. Valida que los datos del body estén presentes.
      if (!contrasenaActual || !nuevaContrasena) {
        return res.status(400).json({ mensaje: "Se requiere la contraseña actual y la nueva contraseña." });
      }

      // 4. Llama al servicio con los datos recolectados.
      const resultado = await cambiarContrasena(idUsuario, contrasenaActual, nuevaContrasena, ipAddress, userAgent);

      // 5. Devuelve una respuesta exitosa.
      return res.status(200).json(resultado);

    } catch (error: unknown) {
      const message = (error as Error).message;
      // Si el error es por contraseña incorrecta, devolvemos un 401 (No autorizado).
      // Para otros errores, devolvemos un 500 (Error del servidor).
      const statusCode = message.includes('incorrecta') ? 401 : 500;
      console.error("Error en UserController.cambiarContrasena:", message);
      return res.status(statusCode).json({ mensaje: message });
    }
  }
  
  //activar veridicacion 2fa
  static async gestionarVerificacion2FA(req: Request, res: Response) { // Usa CustomRequest si lo tienes
    try {
      // 1. Obtener ID del usuario logueado (desde el token)
      const idUsuario = (req as any).user.id;
      // 2. Obtener el nuevo estado desde el body
      // El frontend debe enviar: { "activar": true } o { "activar": false }
      const { activar } = req.body; 
      
      const ipAddress = req.ip || null;
      const userAgent = req.headers['user-agent'] || null;

      // 3. Validación
      if (activar === undefined || typeof activar !== 'boolean') {
        return res.status(400).json({ message: 'El campo "activar" (true o false) es obligatorio en el cuerpo.' });
      }

      // 4. Convertir boolean a 1 o 0
      const nuevoEstado = activar ? 1 : 0; 

      // 5. Llama al nuevo servicio
      const resultado = await gestionarEstado2FA(idUsuario, nuevoEstado, ipAddress, userAgent);
      
      return res.status(200).json(resultado);

    } catch (error: unknown) {
      // 6. Manejo de errores profesional
      console.error("Error en UserController.bloquearUsuario:", (error as Error).message);
      const statusCode = error instanceof Error && ['sí mismo', 'no existe', 'bloquear a otro administrador'].some(m => error.message.includes(m)) ? 400 : 500;
      return res.status(statusCode).json({ message: (error as Error).message || "Error interno del servidor." });
    
  
    }
  }

  // bloquear  usuario 
  static async bloquearUsuario(req: CustomRequest, res: Response) {
    try {
      const idAdmin = req.user!.id;
      // --- CAMBIO: Extraer del body ---
      const { numero_identificacion } = req.body;
      // --- FIN CAMBIO ---
      const ipAddress = req.ip || null;
      const userAgent = req.headers['user-agent'] || null;

      // Validación: Asegurarse de que se envió la identificación
      if (!numero_identificacion) {
        return res.status(400).json({ message: 'El campo \'numero_identificacion\' es obligatorio en el cuerpo de la solicitud.' });
      }

      // Llama al servicio con la identificación y 0 para bloquear
      const resultado = await cambiarEstadoUsuario(idAdmin, numero_identificacion, 0, ipAddress, userAgent);
      return res.status(200).json(resultado);

    } catch (error: unknown) {
      console.error("Error en UserController.bloquearUsuario:", (error as Error).message);
      const statusCode = error instanceof Error && ['sí mismo', 'no existe', 'bloquear a otro administrador'].some(m => error.message.includes(m)) ? 400 : 500;
      return res.status(statusCode).json({ message: (error as Error).message || "Error interno del servidor." });
    }
  }
  // desbloquear usuario

  static async desbloquearUsuario(req: CustomRequest, res: Response) {
    try {
      const idAdmin = req.user!.id;
      // --- CAMBIO: Extraer del body ---
      const { numero_identificacion } = req.body;
      // --- FIN CAMBIO ---
      const ipAddress = req.ip || null;
      const userAgent = req.headers['user-agent'] || null;

      if (!numero_identificacion) {
        return res.status(400).json({ message: 'El campo \'numero_identificacion\' es obligatorio en el cuerpo de la solicitud.' });
      }

      // Llama al servicio con la identificación y 1 para desbloquear
      const resultado = await cambiarEstadoUsuario(idAdmin, numero_identificacion, 1, ipAddress, userAgent);
      return res.status(200).json(resultado);

    } catch (error: unknown) {
      console.error("Error en UserController.desbloquearUsuario:", (error as Error).message);
      const statusCode = error instanceof Error && ['sí mismo', 'no existe'].some(m => error.message.includes(m)) ? 400 : 500;
      return res.status(statusCode).json({ message: (error as Error).message || "Error interno del servidor." });
    }
  }

  //  usuario por cedula
  // En UserController.ts (o donde tengas este método)

static async obtenerPorCedula(req: CustomRequest, res: Response) {
    try {
        // ... (Tu lógica de autenticación y validación 401, 403, 400 es correcta)

        const { cedula } = req.body;
        // ... (validación de cédula)
        
        const colaboradorEncontrado = await obtenerUsuarioPorIdentificacion(cedula);

        if (colaboradorEncontrado) {
            // CÓDIGO 200: Éxito
            res.status(200).json({
                mensaje: "Colaborador encontrado exitosamente.",
                colaborador: colaboradorEncontrado,
            });
        } else {
            // CÓDIGO 404: No encontrado (Busca enviar el mensaje personalizado)
            res.status(400).json({ 
                mensaje: "No se encontró un usuario con esa identificación."
            });
        }

    } catch (error: unknown) {
        const errorMessage = (error as Error).message;
        console.error("Error en UserController.obtenerPorCedula:", errorMessage);
        
        // CÓDIGO 500: Error interno inesperado (Asegura que siempre sea 500 aquí)
        res.status(500).json({ 
            mensaje: "Error interno del servidor al buscar colaborador por identificación.", 
            errorDetalle: errorMessage // Renombrado para más claridad
        });
    }
}
  // recuperar contrasenia
  static async solicitarRecuperacionContrasenia(req: Request, res: Response) {
    try {
      // 1. Extraer datos de la solicitud
      const { email } = req.body;
      const ipAddress = req.ip || null;
      const userAgent = req.headers['user-agent'] || null;

      // 2. Validación simple de entrada
      if (!email) {
        return res.status(400).json({ message: 'El correo electrónico es obligatorio.' });
      }

      // 3. Llamar al servicio

      const response = await solicitarRecuperacionContrasena(email, ipAddress, userAgent);

      return res.status(200).json(response);

    } catch (error: unknown) {
      // 5. Manejar errores internos
      console.error("Error crítico en el controlador solicitarRecuperacion:", (error as Error).message);
      return res.status(500).json({ 
        message: (error as Error).message || 'Error interno del servidor.' 
      });
    }
  }


  // validar otp y cambiar contrasenia
  static async restablecerContrasena(req: Request, res: Response) {
    try {
      // 1. Extraer datos de la solicitud
      const { email, codigoOtp, nuevaContrasena } = req.body;
      const ipAddress = req.ip || null;
      const userAgent = req.headers['user-agent'] || null;

      // 2. Validación simple de entrada
      if (!email || !codigoOtp || !nuevaContrasena) {
        return res.status(400).json({ 
          message: 'Se requiere correo electrónico, código OTP y nueva contraseña.' 
        });
      }

      const response = await restablecerContrasena(
        email,
        codigoOtp,
        nuevaContrasena,
        ipAddress,
        userAgent
      );

      return res.status(200).json(response);

    } catch (error: unknown) {
      const errorMessage = (error as Error).message;
      console.error("Error en controlador restablecerContrasena:", errorMessage);

      if (errorMessage.startsWith('Ocurrió un error al actualizar') || errorMessage.startsWith('Error interno')) {
        // Error 500 (DB, etc.)
        return res.status(500).json({ message: errorMessage });
      }
      
      return res.status(400).json({ message: errorMessage });
    }
  }

  // cerrar sesión
  static async cerrarSesion(req: Request, res: Response) {
    try {

      const idUsuario = (req as any).user.id;
      const ipAddress = req.ip || null;
      const userAgent = req.headers['user-agent'] || null;

      // 2. Llamar al servicio
      const response = await registrarCierreSesion(
        idUsuario,
        ipAddress,
        userAgent
      );

      // 3. Devolver la respuesta de éxito
      return res.status(200).json(response);

    } catch (error: unknown) {
      console.error("Error en controlador logout:", (error as Error).message);
      return res.status(500).json({ 
        message: (error as Error).message || 'Error interno del servidor.' 
      });
    }
  }




}
