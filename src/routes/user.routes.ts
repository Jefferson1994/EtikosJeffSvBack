import { Router } from "express";
import {  UserController } from "../controllers/UserController";
import { authenticateJWT } from '../middlewares/auth.middleware'; 
import rateLimit from "express-rate-limit";

const router = Router();

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100,
    message: { ok: false, mensaje: 'Demasiadas solicitudes, por favor intente de nuevo más tarde.' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
});
router.post("/createUser", UserController.crear);//terminada
router.post("/verificarCuenta",limiter, UserController.verificarCuenta);//terminada
//login
router.post("/login",limiter, UserController.LoginPorMail);
router.post("/validarOtp2Fa",limiter, UserController.verificarLogin2FA);//terminada 

// cambiar contraseña
router.post('/cambiarContrasenia', authenticateJWT, UserController.cambiarContrasena); //terminada
router.post('/activarVerificacion2Fa', authenticateJWT, UserController.gestionarVerificacion2FA); //terminada

// administracion de usuarios
router.post('/buscar-por-cedula', authenticateJWT, UserController.obtenerPorCedula);//terminada
router.post('/bloquearUsuario', authenticateJWT, UserController.bloquearUsuario);//terminada 
router.post('/desbloquearUsuario', authenticateJWT, UserController.desbloquearUsuario);//terminada

// recuperación de contraseña
router.post('/recuperarPasword',limiter , UserController.solicitarRecuperacionContrasenia);//terminada
router.post('/resetPasword',limiter , UserController.restablecerContrasena);//terminada

// cerrar sesión
router.post('/cerrarSesion',authenticateJWT , UserController.cerrarSesion);//terminada 





export default router;
