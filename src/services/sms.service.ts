import twilio from 'twilio';
import * as dotenv from 'dotenv';

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = twilio(accountSid, authToken);


export const sendSms = async (to: string, body: string): Promise<{ success: boolean, message: string }> => {
  if (!to || !body) {
    return { success: false, message: "Número de teléfono o cuerpo del mensaje no proporcionado." };
  }

  try {
    const message = await twilioClient.messages.create({
      body: body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to, // El número del destinatario (ej. +593987654321)
    });
    console.log('Mensaje SMS enviado con éxito. SID:', message.sid);
    return { success: true, message: `Mensaje SMS enviado. SID: ${message.sid}` };
  } catch (error) {
    console.error("Error al enviar el SMS:", error);
    return { success: false, message: "Fallo al enviar el SMS debido a un error de Twilio o número inválido." };
  }
}