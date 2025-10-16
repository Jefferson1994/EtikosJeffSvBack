import twilio from 'twilio';
import * as dotenv from 'dotenv';

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = twilio(accountSid, authToken);

export const sendSms = async (to: string, body: string): Promise<any> => {
  try {
    const message = await twilioClient.messages.create({
      body: body, // El cuerpo del mensaje
      from: process.env.TWILIO_PHONE_NUMBER, // Tu número de Twilio
      to: to, // El número del destinatario (ej. +593987654321)
    });
    console.log('Mensaje SMS enviado con éxito. SID:', message.sid);
    return message;
  } catch (error) {
    console.error("Error al enviar el SMS:", error);
    throw new Error('Fallo al enviar el SMS.');
  }
};