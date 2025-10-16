import { AppDataSource } from "../config/data-source"; 
import { Usuario } from '../entities/Usuario';
import { Rol } from "../entities/Rol";
import bcrypt from 'bcryptjs';
import { QueryFailedError } from "typeorm";
import { Otp } from "../entities/Otp"; // Importar la entidad Otp
import { TipoOtp } from "../entities/TipoOtp"; // Importar la entidad TipoOtp
import * as dotenv from 'dotenv'; 
import * as jwt from 'jsonwebtoken'; // Importar jsonwebtoken
import { sendEmail, generateOtp,prepareOtpVerificationEmail } from './EmailService'; // Importar el EmailService
import { Cliente } from "../entities/Cliente";


const usuarioRepository = AppDataSource.getRepository(Usuario);
const JWT_SECRET = process.env.NODE_ENV === 'development'
  ? process.env.JWT_Desarrollo 
  : process.env.JWT_SECRET ;
if (!JWT_SECRET) {
  console.error("ERROR CRÍTICO: La variable de entorno JWT_SECRET o JWT_Desarrollo no está definida en UserService.");
  console.error("Por favor, asegúrate de configurar JWT_SECRET en .env para producción, o JWT_Desarrollo en .env para desarrollo.");
  process.exit(1);
}
dotenv.config(); 


export const obtenerUsuarios = async () => {
  return await usuarioRepository.find();
};

export const crearUsuario = async (datos: Partial<Usuario>): Promise<Usuario> => {
  return await AppDataSource.manager.transaction(async (transactionalEntityManager) => {
    try {
      // Validaciones para los campos obligatorios (NOT NULL)
      if (!datos.correo) throw new Error("El correo electrónico es obligatorio.");
      if (!datos.nombre) throw new Error("El nombre es obligatorio.");
      if (!datos.contrasena) throw new  Error("La contraseña es obligatoria.");
      if (!datos.id_rol) throw new Error("El ID del rol es obligatorio.");

      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(datos.contrasena, saltRounds);
      datos.contrasena = hashedPassword;

      const nuevoUsuario = transactionalEntityManager.create(Usuario, datos);
    
      const usuarioGuardado = await transactionalEntityManager.save(Usuario, nuevoUsuario);

      const nuevoCliente = transactionalEntityManager.create(Cliente, {
                direccion: "direccion de prueba",
                id_usuario: usuarioGuardado.id, // Se vincula el ID del nuevo usuario
      });
      await transactionalEntityManager.save(Cliente, nuevoCliente);

      const otpRepository = transactionalEntityManager.getRepository(Otp);
      const tipoOtpRepository = transactionalEntityManager.getRepository(TipoOtp);

      let tipoVerificacion = await tipoOtpRepository.findOne({
        where: { nombre: 'VERIFICACION_CUENTA' },
      });

      if (!tipoVerificacion) {
        tipoVerificacion = tipoOtpRepository.create({ nombre: 'VERIFICACION_CUENTA', descripcion: 'Verificación de cuenta de usuario', activo: 1 });
        await tipoOtpRepository.save(tipoVerificacion);
      }

      const otpCode = generateOtp(6);
      const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // OTP válido por 15 minutos

      const newOtp = otpRepository.create({
        id_usuario: usuarioGuardado.id,
        id_tipo_otp: tipoVerificacion.id,
        codigo: otpCode,
        expira_en: otpExpiresAt,
        usado: false, // Por defecto, no usado
      });
      await otpRepository.save(newOtp);

      const { emailSubject, emailHtml } = prepareOtpVerificationEmail(usuarioGuardado.nombre, otpCode);

      await sendEmail(usuarioGuardado.correo, emailSubject, `Tu código de verificación es: ${otpCode}`, emailHtml);
      console.log(`OTP de verificación de cuenta enviado al nuevo usuario ${usuarioGuardado.correo}`);

      return usuarioGuardado; // Devuelve el usuario
    } catch (error: unknown) {
      console.error("Error detallado en crearUsuario:", error);
      if (error instanceof QueryFailedError) {
        const driverErrorCode = (error.driverError as any)?.number;
        const errorMessage = (error as Error).message; // Mensaje de error para buscar nombres de columna/índice

        if (driverErrorCode === 2627 || driverErrorCode === 2601) {
          if (errorMessage.includes('correo')) { // Se asume que el mensaje de error incluye la columna 'correo' o su índice
            throw new Error("El correo electrónico ya está registrado. Por favor, elige otro.");
          }
          if (errorMessage.includes('numero_identificacion')) { // Se asume que el mensaje de error incluye la columna 'numero_identificacion' o su índice
            throw new Error("El número de identificación ya está registrado. Por favor, elige otro.");
          }
          throw new Error("Un usuario con la misma identificación o correo ya está registrado.");
        }
      }
      throw new Error("No se pudo crear el usuario. Por favor, inténtalo de nuevo más tarde.");
    }
  });
};


type TipoResumen = "ingresos" | "egresos";

export const obtenerLoginPorMail = async (correo: string, contrasena: string): Promise<{ user: Partial<Usuario>, token: string } | null> => {
  console.log("--- Inicio de obtenerLoginPorMail ---");
  console.log("Correo recibido:", correo);
  // console.log("Contraseña recibida (sin hashear):", contrasena); // NO loguear esto en producción

  const usuarioRepository = AppDataSource.getRepository(Usuario);

  try {
    const usuario = await usuarioRepository.findOne({
      where: { correo: correo },
      relations: ['negociosAdministrados', 'rol'], // Asegúrate de cargar el rol para el payload
    });

    console.log("Usuario encontrado en DB:", usuario ? usuario.correo : "Ninguno");

    if (usuario) {
      // console.log("Contraseña del usuario en DB (hash):", usuario.contrasena); // No loguear hash en producción
      const isPasswordMatch = await bcrypt.compare(contrasena, usuario.contrasena);
      console.log("Resultado de bcrypt.compare (¿Contraseña coincide?):", isPasswordMatch);

      if (isPasswordMatch) {
        console.log("Contraseña verificada exitosamente. Login OK.");

        // Crear una copia del usuario y eliminar la propiedad de la contraseña
        const usuarioSinContrasena: Partial<Usuario> = { ...usuario };
        delete (usuarioSinContrasena as any).contrasena; // Eliminar la contraseña del objeto a devolver

        // Crear el payload del token con información no sensible del usuario
        const payload = {
          id: usuario.id,
          correo: usuario.correo,
          id_rol: usuario.id_rol,
          rolNombre: usuario.rol ? usuario.rol.nombre : null // Asegurarse de que el rol se cargó
        };

        // Generar el token JWT
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '2h' }); // Token válido por 1 hora

        console.log("Token JWT generado."); // No loguear el token completo en producción
        return { user: usuarioSinContrasena, token: token }; // Devolver usuario (sin contraseña) y token
      } else {
        console.log("Contraseña NO coincide. Credenciales inválidas.");
        return null;
      }
    } else {
      console.log("Usuario no encontrado para el correo:", correo);
      return null;
    }
  } catch (error: unknown) {
    console.error("Error en obtenerLoginPorMail (capturado en el servicio):", (error as Error).message);
    throw new Error("Ocurrió un error al intentar iniciar sesión.");
  } finally {
    console.log("--- Fin de obtenerLoginPorMail ---");
  }
};


export const obtenerRolesActivos = async (): Promise<Rol[]> => {
  try {
    const rolRepository = AppDataSource.getRepository(Rol);

    // Busca todos los roles donde la propiedad 'activo' sea 0 (según tu convención para "activo")
    const rolesActivos = await rolRepository.find({
      where: { activo: 0 ,
         visible_registro:0  },
    });

    return rolesActivos;
  } catch (error: unknown) { // Captura el error para un manejo profesional
    console.error("Error en obtenerRolesActivos:", (error as Error).message);
    // Relanza el error para que el controlador o la capa superior puedan manejarlo
    throw new Error("No se pudieron obtener los roles activos. Por favor, inténtalo de nuevo más tarde.");
  }
};




export const obtenerUsuarioPorIdentificacion = async (numeroIdentificacion: string): Promise<Partial<Usuario> | null> => {
  if (!numeroIdentificacion) {
    throw new Error("El número de identificación es obligatorio para la búsqueda.");
  }

  try {
    const usuario = await usuarioRepository.findOne({
      where: { numero_identificacion: numeroIdentificacion },
      relations: ['rol'], // Asegurarse de cargar la relación 'rol'
    });

    if (!usuario) {
      return null; // Usuario no encontrado
    }

    // Verificar si el rol del usuario es 'Colaborador'
    if (usuario.rol && (usuario.rol.nombre === 'Cliente' || usuario.rol.nombre === 'Administrador')) {
      const usuarioParaRespuesta: Partial<Usuario> = { ...usuario };
      delete (usuarioParaRespuesta as any).contrasena; // No devolver la contraseña
      return usuarioParaRespuesta;
    } else {
      // El usuario existe pero no tiene el rol de Colaborador
      return null;
    }
  } catch (error: unknown) {
    console.error("Error en obtenerUsuarioPorIdentificacion:", (error as Error).message);
    throw new Error("Ocurrió un error al buscar el usuario por identificación.");
  }
};

