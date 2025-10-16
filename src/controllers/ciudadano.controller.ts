// src/controllers/ciudadano.controller.ts
import { Request, Response } from 'express';
import { getDatosCiudadano } from '../services/ciudadano.service';

export async function validarCiudadano(req: Request, res: Response) {
    // 1. Extrae los datos del cuerpo de la petición
    console.log('Cuerpo de la petición:', req.body);
    const { tipo, identificacion } = req.body;

    // 2. Valida que los datos necesarios estén presentes
    if (!tipo || !identificacion) {
        return res.status(400).json({ 
            ok: false, 
            mensaje: 'El tipo y número de identificación son requeridos.' 
        });
    }

    try {
        // 3. Llama a la función del servicio para obtener los datos
        const resultado = await getDatosCiudadano(tipo, identificacion);
        return res.status(200).json(resultado);
    } catch (error) {
        // 4. Si algo falla en el servicio, envía una respuesta de error
        return res.status(500).json({ 
            ok: false, 
            mensaje: (error as Error).message 
        });
    }
}