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
//crear cuenta
router.post("/createUser", UserController.crear);
router.post("/verificarCuenta",limiter, UserController.verificarCuenta);// bien terminado
//login
router.post("/login",limiter, UserController.LoginPorMail);
router.post("/validarOtp2Fa",limiter, UserController.verificarLogin2FA);//falta

// cambiar contraseña
router.post('/cambiarContrasenia', authenticateJWT, UserController.cambiarContrasena); // ya esta
router.post('/activarVerificacion2Fa', authenticateJWT, UserController.gestionarVerificacion2FA); // ya revisar bug de activar

// administracion de usuarios
router.post('/buscar-por-cedula', authenticateJWT, UserController.obtenerPorCedula);// ya esta
router.post('/bloquearUsuario', authenticateJWT, UserController.bloquearUsuario);// ya esta 
router.post('/desbloquearUsuario', authenticateJWT, UserController.desbloquearUsuario);// ya esta

// recuperación de contraseña
router.post('/recuperarPasword',limiter , UserController.solicitarRecuperacionContrasenia);// ya esta
router.post('/resetPasword',limiter , UserController.restablecerContrasena);// ya esta

// cerrar sesión
router.post('/cerrarSesion',authenticateJWT , UserController.cerrarSesion);





export default router;
