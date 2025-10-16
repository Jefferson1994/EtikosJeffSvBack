import express from "express";
import "reflect-metadata";
import { AppDataSource } from "./config/data-source";
import userRoutes from "./routes/user.routes";
import cors from "cors";
import ciudadanoRoutes from './routes/ciudadano.routes';
import rateLimit from 'express-rate-limit';

const app = express();
app.use(cors());
app.use(express.json());

const cedulaLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5,
    message: { ok: false, mensaje: 'Demasiadas solicitudes, por favor intente de nuevo más tarde.' },
    standardHeaders: true,
    legacyHeaders: false,
});


AppDataSource.initialize()
  .then(async () => {
    console.log("Base de datos conectada");
    await AppDataSource.runMigrations(); 

    app.use("/api", userRoutes);
    app.use('/api/ciudadanos', cedulaLimiter, ciudadanoRoutes);

    app.listen(3000, () => {
      console.log("Servidor corriendo en http://localhost:3000");
    });
  })
  .catch((error) => console.error(error));
 

