import { Router } from "express";
import {  UserController } from "../controllers/UserController";
import { authenticateJWT } from '../middlewares/auth.middleware'; 

const router = Router();

router.post("/users", UserController.crear);
router.post("/login", UserController.LoginPorMail);
router.post("/rol", UserController.RolesActivos);
router.post('/buscar-por-cedula', authenticateJWT, UserController.obtenerPorCedula);
router.post('/empresasVinculadas', authenticateJWT, UserController.obtenerMisNegociosVinculados);
//router.post("/userId", UserController.obtenerPorId);


export default router;
