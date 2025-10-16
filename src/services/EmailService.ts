import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv'; // Importar dotenv para cargar variables de entorno

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
    const info = await transporter.sendMail({
      from: `"App pruebas Sistema Control financiero barberia" <${process.env.EMAIL_SERVICE_USER}>`, // Remitente (puede ser diferente a EMAIL_SERVICE_USER si tu SMTP lo permite)
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
  const emailSubject = 'Verifica tu cuenta en Nombre App';
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #0056b3;">Verifica tu Correo Electrónico</h2>
      <p>Hola ${userName},</p>
      <p>Gracias por registrarte en Nombre App. Para activar tu cuenta, por favor usa el siguiente código de verificación:</p>
      <p style="font-size: 24px; font-weight: bold; color: #007bff; background-color: #f0f8ff; padding: 10px; border-radius: 5px; display: inline-block;">
        ${otpCode}
      </p>
      <p>Este código es válido por los próximos 15 minutos.</p>
      <p>Si no te registraste en Nombre App, por favor ignora este correo.</p>
      <p>Gracias,</p>
      <p>El Equipo de Nombre App</p>
    </div>
  `;
  return { emailSubject, emailHtml };
};
