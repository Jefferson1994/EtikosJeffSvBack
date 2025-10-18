import { AppDataSource } from "../config/data-source";
import { Usuario } from '../entities/Usuario';
import bcrypt from 'bcryptjs';
import { EntityManager, QueryFailedError } from "typeorm";
import { Otp } from "../entities/Otp"; 
import { TipoOtp } from "../entities/TipoOtp"; 
import * as dotenv from 'dotenv';
import * as jwt from 'jsonwebtoken'; 
import { sendEmail, generateOtp, prepareOtpVerificationEmail,
   prepareLoginSuccessEmail, otpVerificaion2Pasos,preparePasswordChangedEmail,prepareAccountStatusChangeEmail } from './EmailService'; // Importar el EmailService
import { Cliente } from "../entities/Cliente";
import { sendSms } from "./sms.service";
import { ActionStatus, AuditLog } from "../entities/audit_logs";
import { ActionType } from "../entities/action_types";
import { LoginResponse } from '../interfaces/userInterfaces';
import { ValidationResponse } from '../interfaces/userInterfaces';
import { Verify2faResponse } from '../interfaces/userInterfaces';
import { ConfigService } from './config.service';


const usuarioRepository = AppDataSource.getRepository(Usuario);
const JWT_SECRET = process.env.NODE_ENV === 'development'
  ? process.env.JWT_Desarrollo
  : process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("ERROR CRÍTICO: La variable de entorno JWT_SECRET o JWT_Desarrollo no está definida en UserService.");
  console.error("Por favor, asegúrate de configurar JWT_SECRET en .env para producción, o JWT_Desarrollo en .env para desarrollo.");
  process.exit(1);
}
dotenv.config();


export const obtenerUsuarios = async () => {
  return await usuarioRepository.find();
};

export const crearUsuario = async (datos: Partial<Usuario>, ipAddress: string | null,
  userAgent: string | null): Promise<Usuario> => {
  return await AppDataSource.manager.transaction(async (transactionalEntityManager) => {
    try {
      // Validaciones para los campos obligatorios (NOT NULL)
      if (!datos.correo) throw new Error("El correo electrónico es obligatorio.");
      if (!datos.nombre) throw new Error("El nombre es obligatorio.");
      if (!datos.contrasena) throw new Error("La contraseña es obligatoria.");
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

    

      
      const otpMinutes = ConfigService.getNumber('OTP_EXPIRATION_MINUTES', 15); 
      const otpTamanio = ConfigService.getNumber('OTP_LENGTH', 6); 
      const otpCode = generateOtp(otpTamanio);
      const otpExpiresAt = new Date(Date.now() + otpMinutes * 60 * 1000);


      const newOtp = otpRepository.create({
        id_usuario: usuarioGuardado.id,
        id_tipo_otp: tipoVerificacion.id,
        codigo: otpCode,
        expira_en: otpExpiresAt,
        usado: false, // Por defecto, no usado
      });
      await otpRepository.save(newOtp);

      const { emailSubject, emailHtml } = prepareOtpVerificationEmail(usuarioGuardado.nombre, otpCode);
      const userPhoneNumber = usuarioGuardado.numero_telefono; // Debes obtener el teléfono del usuario
      const messageBody = `Tu código de verificación para App Jeff es: ${otpCode}`;
      // descomentar para poder enviar sms ahora comentado para no gastar saldo
      //await sendSms(userPhoneNumber, messageBody);

      await sendEmail(usuarioGuardado.correo, emailSubject, `Tu código de verificación es: ${otpCode}`, emailHtml);
      console.log(`OTP de verificación de cuenta enviado al nuevo usuario ${usuarioGuardado.correo}`);

      // --- INICIO: REGISTRO DE AUDITORÍA --- // <-- NUEVO
      await registrarAuditoria(
        transactionalEntityManager, // <-- Le pasas el manejador de la transacción
        'USER_REGISTERED',
        usuarioGuardado.id,
        ipAddress,
        userAgent,
        ActionStatus.SUCCESS,
        `Usuario registrado exitosamente con el correo: ${usuarioGuardado.correo}`,
        null
      );
      console.log(`Auditoría registrada para el evento USER_REGISTERED del usuario ID: ${usuarioGuardado.id}`);

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

export const obtenerLoginPorMail = async (correo: string, contrasena: string, ipAddress: string | null,
  userAgent: string | null): Promise<LoginResponse>  => {
  console.log("--- Inicio de obtenerLoginPorMail ---");
  console.log("Correo recibido:", correo);
  // console.log("Contraseña recibida (sin hashear):", contrasena); // NO loguear esto en producción

  const usuarioRepository = AppDataSource.getRepository(Usuario);

  try {
    const usuario = await usuarioRepository.findOne({
      where: { correo: correo },
      relations: ['rol'], // Asegúrate de cargar el rol para el payload
    });

    console.log("Usuario encontrado en DB:", usuario ? usuario.correo : "Ninguno");

    if (usuario) {
      
      // --- INICIO DE VALIDACIONES ADICIONALES ---

      // VALIDACIÓN 1: Cuenta activa/bloqueada
      // Asumiendo que 'activo' es 0 (bloqueado/inactivo) o 1 (activo)
      if (usuario.activo == 0) { 
        console.warn(`Intento de login para cuenta bloqueada: ${correo}`);
        await registrarAuditoria(
          AppDataSource.manager,
          'LOGIN_FAILED_LOCKED', // Tipo de auditoría específico
          usuario.id, 
          ipAddress,
          userAgent,
          ActionStatus.FAILURE,
          `Intento de login en cuenta bloqueada: ${correo}`,
          null
        );
        // Devolver una respuesta clara para el frontend
        // Asegúrate de que tu tipo LoginResponse soporte este formato de error
        return {
          error: true, 
          message: 'Tu cuenta está bloqueada o inactiva. Por favor, contacta al administrador.'
        };
      }

      // VALIDACIÓN 2: Cuenta verificada
      // Asumiendo que 'verificado' es 0 (no verificado) o 1 (verificado)
      if (usuario.esta_verificado == 0) {
        console.warn(`Intento de login para cuenta no verificada: ${correo}`);
        await registrarAuditoria(
          AppDataSource.manager,
          'LOGIN_FAILED_UNVERIFIED', // Tipo de auditoría específico
          usuario.id,
          ipAddress,
          userAgent,
          ActionStatus.FAILURE,
          `Intento de login en cuenta no verificada: ${correo}`,
          null
        );
        // Devolver una respuesta clara para el frontend
        return {
          error: true, 
          message: 'Tu cuenta no ha sido verificada. Por favor, revisa tu correo para activar tu cuenta.'
          // Opcionalmente, podrías añadir un botón de "reenviar email de verificación" en tu frontend
        };
      }
      
      const isPasswordMatch = await bcrypt.compare(contrasena, usuario.contrasena);
      console.log("Resultado de bcrypt.compare (¿Contraseña coincide?):", isPasswordMatch);

      if (isPasswordMatch) {
        console.log("Contraseña verificada exitosamente. Login OK.");

        if (usuario.autenticacion_dos_pasos_activa == 1) {
          const otpRepository = AppDataSource.getRepository(Otp);
          const tipoOtpRepository = AppDataSource.getRepository(TipoOtp);

          const tipo2fa = await tipoOtpRepository.findOne({ where: { nombre: 'LOGIN_2FA' } });
          if (!tipo2fa) {
            throw new Error('El tipo de OTP "LOGIN_2FA" no está configurado en la base de datos.');
          }

          const otpMinutes = ConfigService.getNumber('OTP_EXPIRATION_MINUTES', 15); 
          const otpTamanio = ConfigService.getNumber('OTP_LENGTH', 6); 
          const otpCode = generateOtp(otpTamanio);
          const otpExpiresAt = new Date(Date.now() + otpMinutes * 60 * 1000);

          const newOtp = otpRepository.create({
            id_usuario: usuario.id,
            id_tipo_otp: tipo2fa.id,
            codigo: otpCode,
            expira_en: otpExpiresAt,
            usado: false,
          });
          await otpRepository.save(newOtp);

          // 2. Enviar el OTP por correo
          const { emailSubject, emailHtml } = otpVerificaion2Pasos(usuario.nombre, otpCode);
          await sendEmail(usuario.correo, emailSubject, `Tu código de verificación es: ${otpCode}`, emailHtml);

          // 3. Devolver una respuesta que indique que se requiere el OTP
          return {
            twoFactorRequired: true,
            message: 'Se requiere verificación de dos pasos. Por favor, ingresa el código que enviamos a tu correo.'
          };

        } else {
          console.log("2FA no está activa. Procediendo con login normal.");
          await registrarAuditoria(
            AppDataSource.manager,
            'LOGIN_SUCCESS',
            usuario.id, // ID del usuario que inició sesión
            ipAddress,
            userAgent,
            ActionStatus.SUCCESS,
            `Inicio de sesión exitoso para el usuario: ${usuario.correo}`,
            null
          );

          const { emailSubject, emailHtml } = prepareLoginSuccessEmail(
            usuario.nombre,
            ipAddress,
            userAgent
          );
          await sendEmail(usuario.correo, emailSubject, `Nuevo inicio de sesión detectado.`, emailHtml);
          console.log(`Notificación de login exitoso enviada a ${usuario.correo}`);

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

          return { user: usuarioSinContrasena, token: token,twoFactorRequired: false }; // Devolver usuario (sin contraseña) y token

        }

      } else {
        console.log("Contraseña NO coincide. Credenciales inválidas.");
        await registrarAuditoria(
          AppDataSource.manager,
          'LOGIN_FAILED',
          null, // sin id usuario no se encontro 
          ipAddress,
          userAgent,
          ActionStatus.FAILURE,
          `Intento de login fallido para el contrasenia inexistente: ${correo}`,
          null
        );
        return null;
      }
    } else {
      console.log("Usuario no encontrado para el correo:", correo);
      // --- Auditoría de Usuario No Encontrado ---
      await registrarAuditoria(
        AppDataSource.manager,
        'LOGIN_FAILED',
        null, // sin id usuario no se encontro 
        ipAddress,
        userAgent,
        ActionStatus.FAILURE,
        `Intento de login fallido para el correo inexistente: ${correo}`,
        null

      );
      return null;
    }
  } catch (error: unknown) {
    console.error("Error en obtenerLoginPorMail (capturado en el servicio):", (error as Error).message);
    throw new Error("Ocurrió un error al intentar iniciar sesión.");
  } finally {
    console.log("--- Fin de obtenerLoginPorMail ---");
  }
};

// activar cuenta
export const validarOtpVerificacionCuenta = async (
  correo: string,
  codigoOtp: string,
  ipAddress: string | null,
  userAgent: string | null
): Promise<ValidationResponse> => {
  return await AppDataSource.manager.transaction(async (entityManager) => {
    const usuarioRepository = entityManager.getRepository(Usuario);
    const otpRepository = entityManager.getRepository(Otp);

    const usuario = await usuarioRepository.findOne({ where: { correo } });
    if (!usuario) {
      // no se encuentra el usuario
      return { success: false, message: 'Usuario no encontrado.' };
    }
    if (usuario.esta_verificado === 1) {
      return { success: true, message: 'Esta cuenta ya ha sido verificada.' };
    }

    const otpEncontrado = await otpRepository.findOne({
      where: {
        id_usuario: usuario.id,
        usado: false,
        tipoOtp: { nombre: 'VERIFICACION_CUENTA' }
      },
      relations: ['tipoOtp'],
      order: { creado_en: 'DESC' }
    });

    if (!otpEncontrado) {
      return { success: false, message: 'No se encontró un código de verificación pendiente.' };
    }

    // --- OTP Expired Logic ---
    if (new Date() > otpEncontrado.expira_en) {
      otpEncontrado.usado = true; 
      await otpRepository.save(otpEncontrado);

      await registrarAuditoria(
        entityManager,
        'VERIFY_ACCOUNT_FAILED',
        usuario.id,
        ipAddress,
        userAgent,
        ActionStatus.FAILURE,
        `Intento de verificación fallido para ${correo} (OTP expirado).`,
        null
      );

      return { success: false, message: 'El código OTP ha expirado. Por favor, solicita uno nuevo.' };
    }

    // --- otp es incorrecto ---
    if (otpEncontrado.codigo !== codigoOtp) {
      await registrarAuditoria(
        entityManager,
        'VERIFY_ACCOUNT_FAILED',
        usuario.id,
        ipAddress,
        userAgent,
        ActionStatus.FAILURE,
        `Intento de verificación fallido para ${correo} (OTP incorrecto).`,
        null
      );

      return { success: false, message: 'El código OTP es incorrecto.' };
    }

    // --- otp es correcto ---
    otpEncontrado.usado = true;
    usuario.esta_verificado = 1;

    await otpRepository.save(otpEncontrado);
    await usuarioRepository.save(usuario);


    await registrarAuditoria(
      entityManager,
      'VERIFY_ACCOUNT_SUCCESS',
      usuario.id,
      ipAddress,
      userAgent,
      ActionStatus.SUCCESS,
      `Cuenta verificada exitosamente para ${correo}.`,
      null
    );

    return { success: true, message: '¡Cuenta verificada exitosamente! Ahora puedes iniciar sesión.' };
  });
};

// login con doble factor
export const validarOtpLogin2FA = async (
    correo: string,
    codigoOtp: string,
    ipAddress: string | null,
    userAgent: string | null
  ): Promise<Verify2faResponse | null> => { // Devuelve el objeto de login o null
    const usuarioRepository = AppDataSource.getRepository(Usuario);
    const otpRepository = AppDataSource.getRepository(Otp);

    // 1. Buscar al usuario por su correo
    const usuario = await usuarioRepository.findOne({ where: { correo }, relations: ['rol'] });
    if (!usuario) {
      // Aunque es raro llegar aquí, es una buena validación
      return null;
    }

    // 2. Buscar el OTP más reciente, no usado y del tipo LOGIN_2FA
    const otpEncontrado = await otpRepository.findOne({
      where: {
        id_usuario: usuario.id,
        usado: false,
        tipoOtp: { nombre: 'LOGIN_2FA' }
      },
      relations: ['tipoOtp'],
      order: { creado_en: 'DESC' }
    });

    if (!otpEncontrado) {
      await registrarAuditoria(AppDataSource.manager, 'LOGIN_FAILED', usuario.id, 
        ipAddress, userAgent, ActionStatus.FAILURE, `Intento de login 2FA fallido para ${correo} (no se encontró OTP pendiente).`,null);
      return null;
    }

    // 3. Verificar si el OTP ha expirado
    if (new Date() > otpEncontrado.expira_en) {
      otpEncontrado.usado = true;
      await otpRepository.save(otpEncontrado);
      await registrarAuditoria(AppDataSource.manager, 'LOGIN_FAILED', usuario.id,
        ipAddress, userAgent, ActionStatus.FAILURE, `Intento de login 2FA fallido para ${correo} (OTP expirado).`,null);
      return null;
    }

    // 4. Verificar si el código coincide
    if (otpEncontrado.codigo !== codigoOtp) {
      await registrarAuditoria(AppDataSource.manager, 'LOGIN_FAILED', usuario.id, ipAddress, 
        userAgent, ActionStatus.FAILURE, `Intento de login 2FA fallido para ${correo} (OTP incorrecto).`,null);
      return null;
    }

    // 5. ¡Éxito! El OTP es correcto. Procedemos a finalizar el login.
    otpEncontrado.usado = true;
    await otpRepository.save(otpEncontrado);

    // Auditar el éxito del login
    await registrarAuditoria(AppDataSource.manager, 'LOGIN_SUCCESS', usuario.id, ipAddress, 
      userAgent, ActionStatus.SUCCESS, `Inicio de sesión exitoso vía 2FA para ${correo}.`,null);

    // Generar el token JWT (misma lógica que en tu login normal)
    const payload = { id: usuario.id, correo: usuario.correo, rolNombre: usuario.rol ? usuario.rol.nombre : null };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '2h' });

    const usuarioSinContrasena: Partial<Usuario> = { ...usuario };
    delete (usuarioSinContrasena as any).contrasena;

    // Devolver el mismo objeto que un login exitoso
    return {
      user: usuarioSinContrasena,
      token: token,
      twoFactorRequired: false
    };
  };

// cambiar contrasenia
export const cambiarContrasena = async (
  idUsuario: number,
  contrasenaActual: string,
  nuevaContrasena: string,
  ipAddress: string | null,
  userAgent: string | null
): Promise<{ success: boolean; message: string }> => {
  const usuarioRepository = AppDataSource.getRepository(Usuario);

  // 1. Busca al usuario usando el ID del token.
  const usuario = await usuarioRepository.findOne({ where: { id: idUsuario } });
  if (!usuario) {
    // Esto es una salvaguarda, no debería ocurrir si el token JWT es válido.
    throw new Error('Usuario autenticado no encontrado en la base de datos.');
  }

  // 2. Verifica que la contraseña actual proporcionada sea correcta.
  const isPasswordMatch = await bcrypt.compare(contrasenaActual, usuario.contrasena);
  if (!isPasswordMatch) {
 
    await registrarAuditoria(
      AppDataSource.manager,
      'PASSWORD_UPDATE_FAILED', 
      usuario.id,
      ipAddress,
      userAgent,
      ActionStatus.FAILURE,
      'Intento de cambio de contraseña con contraseña actual incorrecta.',
      null
    );
    throw new Error('La contraseña actual es incorrecta.');
  }

  // 3. Hashea y actualiza la nueva contraseña.
  const saltRounds = 10;
  const hashedNewPassword = await bcrypt.hash(nuevaContrasena, saltRounds);
  usuario.contrasena = hashedNewPassword;
  await usuarioRepository.save(usuario);

  // 4. Audita el cambio exitoso.
  await registrarAuditoria(
    AppDataSource.manager,
    'PASSWORD_UPDATED',
    usuario.id,
    ipAddress,
    userAgent,
    ActionStatus.SUCCESS,
    'El usuario ha cambiado su contraseña exitosamente.',
    null
  );
  
  // (Opcional, pero recomendado) Envía una notificación por correo al usuario.
  const { emailSubject, emailHtml } = preparePasswordChangedEmail(usuario.nombre);
  await sendEmail(usuario.correo, emailSubject, '', emailHtml);
  return { success: true, message: 'Contraseña actualizada exitosamente.' };
};

// La función para auditoria
export const registrarAuditoria = async (
  entityManager: EntityManager, nombreAccion: string, idUsuario: number | null, ipAddress: string | null, 
  userAgent: string | null, status: ActionStatus, details: string, idUsuarioObjetivo: number| null) => {
    // Usa el entityManager para obtener los repositorios, NO el AppDataSource
    const auditRepo = entityManager.getRepository(AuditLog);
    const actionTypeRepo = entityManager.getRepository(ActionType);

    const accion = await actionTypeRepo.findOne({ where: { nombre: nombreAccion } });
    if (accion) {
      const newLog = auditRepo.create({
        id_accion: accion.id,
        id_usuario: idUsuario,
        ip_address: ipAddress,
        user_agent: userAgent,
        status: status,
        details: details,
        target_user_id: idUsuarioObjetivo
      });
      // Esta operación de 'save' ahora es parte de la transacción principal
      await auditRepo.save(newLog);
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




export const cambiarEstadoUsuario = async (
  idAdmin: number,
  identificacionUsuarioObjetivo: string,
  nuevoEstadoActivo: number,
  ipAddress: string | null,
  userAgent: string | null
): Promise<{ success: boolean; message: string }> => {

  if (!identificacionUsuarioObjetivo) {
    throw new Error('El número de identificación del usuario objetivo es requerido.');
  }

  const usuarioRepository = AppDataSource.getRepository(Usuario);
  const usuarioObjetivo = await usuarioRepository.findOne({
    where: { numero_identificacion: identificacionUsuarioObjetivo },
    relations: ['rol']
  });

  if (!usuarioObjetivo) {
    throw new Error(`No se encontró un usuario con la identificación: ${identificacionUsuarioObjetivo}.`);
  }

  if (idAdmin === usuarioObjetivo.id) {
    throw new Error('Un administrador no puede bloquearse o desbloquearse a sí mismo.');
  }

  if (usuarioObjetivo.rol && usuarioObjetivo.rol.nombre === 'Admin' && nuevoEstadoActivo === 0) {
    throw new Error('No se puede bloquear a otro administrador.');
  }

  if (usuarioObjetivo.activo === nuevoEstadoActivo) {
    const estadoActualStr = nuevoEstadoActivo === 1 ? 'activo' : 'bloqueado';
    return { success: true, message: `El usuario ya se encuentra ${estadoActualStr}.` };
  }

  // Actualizar el estado
  usuarioObjetivo.activo = nuevoEstadoActivo;
  await usuarioRepository.save(usuarioObjetivo);

  // Preparar datos para la auditoría y notificación
  const esDesbloqueo = nuevoEstadoActivo === 1; // true si se está desbloqueando
  const actionName = esDesbloqueo ? 'USER_UNBLOCKED' : 'USER_BLOCKED';
  const actionVerb = esDesbloqueo ? 'desbloqueado' : 'bloqueado';
  const details = `El usuario ${usuarioObjetivo.correo} (ID: ${usuarioObjetivo.id}) ha sido ${actionVerb} por el admin ID: ${idAdmin}.`;

  // Registrar auditoría
  await registrarAuditoria(
    AppDataSource.manager,
    actionName,
    idAdmin,
    ipAddress,
    userAgent,
    ActionStatus.SUCCESS,
    details,
    usuarioObjetivo.id
  );

 
  try {

    const { emailSubject, emailHtml } = prepareAccountStatusChangeEmail(
      usuarioObjetivo.nombre, 
      esDesbloqueo            
    );
    // Envía el correo
    await sendEmail(
      usuarioObjetivo.correo, 
      emailSubject,
      `Estado de tu cuenta actualizado.`, 
      emailHtml
    );
    console.log(`Notificación de estado (${actionVerb}) enviada a ${usuarioObjetivo.correo}`);
  } catch (emailError) {
   
    console.error(`ERROR AL ENVIAR CORREO de notificación de estado para ${usuarioObjetivo.correo}:`, emailError);
  }


  const message = `El usuario ha sido ${actionVerb} exitosamente.`;
  return { success: true, message };
};
