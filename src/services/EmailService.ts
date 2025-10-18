import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv'; // Importar dotenv para cargar variables de entorno
import { ConfigService } from './config.service';

dotenv.config(); // Cargar las variables de entorno desde el archivo .env

// --- INICIO DE DEBUG DE VARIABLES DE ENTORNO ---
console.log("DEBUG: EMAIL_SERVICE_HOST:", process.env.EMAIL_SERVICE_HOST);
console.log("DEBUG: EMAIL_SERVICE_PORT:", process.env.EMAIL_SERVICE_PORT);
console.log("DEBUG: EMAIL_SERVICE_USER:", process.env.EMAIL_SERVICE_USER);
console.log("DEBUG: EMAIL_SERVICE_SECURE:", process.env.EMAIL_SERVICE_SECURE);
// --- FIN DE DEBUG DE VARIABLES DE ENTORNO ---

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVICE_HOST, // Servidor SMTP (ej. smtp.gmail.com)
  port: parseInt(process.env.EMAIL_SERVICE_PORT || '587', 10), // Puerto SMTP (ej. 587 o 465)
  secure: process.env.EMAIL_SERVICE_SECURE === 'true', // true para SSL (puerto 465), false para STARTTLS (puerto 587)
  auth: {
    user: process.env.EMAIL_SERVICE_USER, // Tu dirección de correo electrónico (remitente)
    pass: process.env.EMAIL_SERVICE_PASS, // Tu contraseña de aplicación o normal
  },

});


export const sendEmail = async (to: string, subject: string, text: string, html?: string): Promise<any> => {
  try {
    // Aquí es donde se construye y se envía el correo.
    const remitente = ConfigService.get('NOMBRE_APP', 'Soporte');
    const info = await transporter.sendMail({
      from: `"${remitente}" <${process.env.EMAIL_SERVICE_USER}>`, // Remitente (puede ser diferente a EMAIL_SERVICE_USER si tu SMTP lo permite)
      to: to,       // Destinatario
      subject: subject, // Asunto del correo
      text: text,     // Contenido en texto plano
      html: html,     // Contenido en HTML (si se proporciona, anula el texto plano en clientes que lo soporten)
    });

    console.log('Mensaje de correo enviado con éxito: %s', info.messageId);
    console.log('URL de vista previa del mensaje (solo para desarrollo): %s', nodemailer.getTestMessageUrl(info));
    return info;
  } catch (error: unknown) {
    console.error("Error al enviar correo electrónico:", (error as Error).message);
    // Relanzar el error para que el llamador pueda manejarlo adecuadamente.
    throw new Error(`Fallo al enviar el correo: ${(error as Error).message}`);
  }
};


export const generateOtp = (length: number = 6): string => {
  let otp = '';
  for (let i = 0; i < length; i++) {
    // Añade un dígito aleatorio (0-9) en cada iteración
    otp += Math.floor(Math.random() * 10);
  }
  return otp;
};

export const prepareOtpVerificationEmail = (userName: string, otpCode: string) => {
  const appName = ConfigService.get('NOMBRE_APP', 'Tu Aplicación');
  const teamName = ConfigService.get('NOMBRE_EQUIPO', 'El Equipo de Soporte');
  const emailSubject = `Verifica tu cuenta en ${appName}`;
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #0056b3;">Verifica tu Correo Electrónico</h2>
      <p>Hola ${userName},</p>
      <p>Gracias por registrarte en APP Control Etikos. Para activar tu cuenta, por favor usa el siguiente código de verificación:</p>
      <p style="font-size: 24px; font-weight: bold; color: #007bff; background-color: #f0f8ff; padding: 10px; border-radius: 5px; display: inline-block;">
        ${otpCode}
      </p>
      <p>Este código es válido por los próximos 15 minutos.</p>
      <p>Si no te registraste en APP Control Etikos, por favor ignora este correo.</p>
      <p>Gracias,</p>
      <p>${teamName}</p>
    </div>
  `;
  return { emailSubject, emailHtml };
};


export const prepareLoginSuccessEmail = (
  userName: string,
  ipAddress: string | null,
  userAgent: string | null
) => {
  const appName = ConfigService.get('NOMBRE_APP', 'Tu Aplicación');
  const teamName = ConfigService.get('NOMBRE_EQUIPO', 'El Equipo de Soporte');
  const emailSubject = `Alerta de Seguridad: Nuevo inicio de sesión en ${appName}`;
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #d9534f;">Alerta de Seguridad: Nuevo Inicio de Sesión</h2>
      <p>Hola ${userName},</p>
      <p>Te informamos que se ha detectado un nuevo inicio de sesión en tu cuenta de APP Control Etikos. Aquí están los detalles:</p>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-left: 5px solid #f0ad4e; margin: 15px 0;">
        <p><strong>Dirección IP:</strong> ${ipAddress || 'No disponible'}</p>
        <p><strong>Dispositivo/Navegador:</strong> ${userAgent || 'No disponible'}</p>
      </div>

      <p><strong>Si no reconoces esta actividad, te recomendamos cambiar tu contraseña de inmediato y revisar la seguridad de tu cuenta.</strong></p>
      <p>Si fuiste tú, puedes ignorar este mensaje de forma segura.</p>
      
      <p>Gracias,</p>
      <p>${teamName}</p>
    </div>
  `;
  return { emailSubject, emailHtml };
};



export const otpVerificaion2Pasos = (
  userName: string,
  otpCode: string
) => {
  const appName = ConfigService.get('NOMBRE_APP', 'Tu Aplicación');
  const teamName = ConfigService.get('NOMBRE_EQUIPO', 'El Equipo de Soporte');
  const emailSubject = `Tu código de verificación para iniciar sesión en ${appName}`;
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #0056b3;">Completa tu Inicio de Sesión</h2>
      <p>Hola ${userName},</p>
      <p>Para completar tu inicio de sesión, por favor usa el siguiente código de verificación. Este paso adicional ayuda a mantener tu cuenta segura.</p>
      
      <p style="font-size: 24px; font-weight: bold; color: #007bff; background-color: #f0f8ff; padding: 10px; border-radius: 5px; display: inline-block;">
        ${otpCode}
      </p>

      <p>Este código es válido por los próximos 15 minutos.</p>
      <p>Si no estás intentando iniciar sesión, por favor ignora este correo y considera cambiar tu contraseña como medida de seguridad.</p>
      
      <p>Gracias,</p>
      <p>${teamName}</p>
    </div>
  `;
  return { emailSubject, emailHtml };
};

export const preparePasswordChangedEmail = (userName: string) => {
  const appName = ConfigService.get('NOMBRE_APP', 'Tu Aplicación');
  const teamName = ConfigService.get('NOMBRE_EQUIPO', 'El Equipo de Soporte');
  const emailSubject = `Confirmación de Seguridad: Tu contraseña ha sido cambiada en ${appName}`;
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #28a745;">Contraseña Actualizada Exitosamente</h2>
      <p>Hola ${userName},</p>
      <p>Te confirmamos que la contraseña de tu cuenta en APP Control Etikos ha sido cambiada exitosamente.</p>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-left: 5px solid #d9534f; margin: 15px 0;">
        <p><strong>Importante:</strong> Si no realizaste este cambio, por favor, contacta a nuestro equipo de soporte de inmediato para asegurar tu cuenta.</p>
      </div>

      <p>Si fuiste tú quien realizó el cambio, puedes ignorar este mensaje de forma segura.</p>
      
      <p>Gracias por mantener tu cuenta segura,</p>
       <p>${teamName}</p>
    </div>
  `;
  return { emailSubject, emailHtml };
};

export const prepareAccountStatusChangeEmail = (
  userName: string,
  isBeingUnblocked: boolean // true si se está desbloqueando, false si se está bloqueando
) => {
   const appName = ConfigService.get('NOMBRE_APP', 'Tu Aplicación');
  const teamName = ConfigService.get('NOMBRE_EQUIPO', 'El Equipo de Soporte');
  const actionText = isBeingUnblocked ? 'desbloqueada' : 'bloqueada';
  const subjectAction = isBeingUnblocked ? 'Restauración de Acceso' : 'Suspensión de Acceso';
  const titleColor = isBeingUnblocked ? '#28a745' : '#d9534f'; // Verde para desbloqueo, Rojo para bloqueo

  const emailSubject = `Notificación de Seguridad: Tu cuenta ha sido ${actionText} en ${appName}`; ;
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: ${titleColor};">${subjectAction} de Cuenta</h2>
      <p>Hola ${userName},</p>
      <p>Te informamos que tu cuenta en APP Control Etikos ha sido ${actionText} por un administrador.</p>

      ${isBeingUnblocked 
        ? '<p>Ahora puedes iniciar sesión nuevamente con tus credenciales habituales.</p>'
        : '<p>Esto significa que temporalmente no podrás acceder a tu cuenta. Esta acción se toma generalmente por motivos de seguridad o incumplimiento de términos.</p>'
      }
      
      <div style="background-color: #f9f9f9; padding: 15px; border-left: 5px solid #007bff; margin: 15px 0;">
        <p><strong>Si crees que esto es un error o necesitas más información, por favor, contacta a nuestro equipo de soporte.</strong></p>
        </div>

      <p>Atentamente,</p>
      <p>${teamName}</p>
    </div>
  `;
  return { emailSubject, emailHtml };
};


