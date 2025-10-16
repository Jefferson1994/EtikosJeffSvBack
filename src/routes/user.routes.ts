import { Router } from "express";
import {  UserController } from "../controllers/UserController";
import { authenticateJWT } from '../middlewares/auth.middleware'; 
import rateLimit from "express-rate-limit";

const router = Router();

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5,
    message: { ok: false, mensaje: 'Demasiadas solicitudes, por favor intente de nuevo más tarde.' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
});

router.post("/users", UserController.crear);
router.post("/login",limiter, UserController.LoginPorMail);
router.post("/rol", UserController.RolesActivos);
router.post('/buscar-por-cedula', authenticateJWT, UserController.obtenerPorCedula);
router.post('/empresasVinculadas', authenticateJWT, UserController.obtenerMisNegociosVinculados);
//router.post("/userId", UserController.obtenerPorId);


export default router;
