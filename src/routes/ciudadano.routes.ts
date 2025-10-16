// src/routes/ciudadano.routes.ts
import { Router } from 'express';
import { validarCiudadano } from '../controllers/ciudadano.controller';

const router = Router();

// Cuando llegue una petición POST a la URL '/validar', se ejecutará la función 'validarCiudadano'
router.post('/validar', validarCiudadano);

export default router;