import { Request, Response } from 'express';
import { crearUsuario, obtenerLoginPorMail, obtenerRolesActivos, obtenerUsuarioPorIdentificacion,obtenerNegociosPorUsuario } from '../services/UserService'; // Importa tus funciones de servicio
import { AppDataSource } from '../config/data-source'; // Asegúrate de importar AppDataSource
import { Usuario } from '../entities/Usuario'; // Asegúrate de importar la entidad Usuario

interface CustomRequest extends Request {
  user?: {
    id: number;
    correo: string;
    id_rol: number;
    rolNombre: string | null;
  };
}

export class UserController {
  
  
  static async crear(req: Request, res: Response) {
    try {
      const { nombre, correo, contrasena, id_rol, numero_telefono, numero_identificacion } = req.body;

      if (!contrasena || contrasena.length < 8) {
        return res.status(400).json({ mensaje: "La contraseña es demasiado corta o no fue proporcionada (mínimo 8 caracteres)." });
      }
      if (!correo) {
        return res.status(400).json({ mensaje: "El correo electrónico es obligatorio." });
      }
      if (!nombre) {
        return res.status(400).json({ mensaje: "El nombre es obligatorio." });
      }
      if (!id_rol) {
        return res.status(400).json({ mensaje: "El ID del rol es obligatorio." });
      }

      const nuevoUsuario = await crearUsuario({
        nombre,
        correo,
        contrasena,
        id_rol,
        numero_telefono,
        numero_identificacion,
      });

      const usuarioParaRespuesta: Partial<Usuario> = { ...nuevoUsuario };
      delete (usuarioParaRespuesta as any).contrasena;

      res.status(201).json({
        mensaje: "Usuario creado correctamente. Por favor, inicia sesión.",
        usuario: usuarioParaRespuesta
      });
    } catch (error: unknown) {
      console.error("Error creando usuario:", (error as Error).message);
      
      // CORREGIDO: Eliminar la lógica duplicada para errores de unicidad
      // Ahora el controlador solo propaga el mensaje de error lanzado por el servicio
      res.status(400).json({ // Usar 400 o 409 si es un error de negocio esperado del servicio
        mensaje: (error as Error).message // Propagar el mensaje específico del servicio
      });
    }
  }

  /*static async obtenerPorId(req: Request, res: Response) {
    const id = parseInt( req.body.id);
    console.log("METODO LISTA ID", id)
    const usuario = await UsuarioService.obtenerUsuarioPorId(id);
    if (usuario) res.json(usuario);
    else res.status(404).json({ mensaje: 'Usuario no encontrado' });
  }*/

  static async LoginPorMail(req: Request, res: Response) {
    try {
      const { email, password } = req.body; // Controller extracts data from the request

      // Controller calls the service function, passing the extracted data
      const usuario = await obtenerLoginPorMail(email, password);

      if (usuario) {
        // Controller processes the result from the service and sends an HTTP response
        res.status(200).json({ message: 'Inicio de sesión exitoso', 
          user: usuario.user, // <--- Accede al objeto de usuario
          token: usuario.token 
      });
      } else {
        res.status(401).json({ message: 'Credenciales inválidas' });
      }
    } catch (error: unknown) {
      // ... error handling ...
    }
  }



  static async RolesActivos(req: Request, res: Response) {
    try {
      // Llama al servicio para obtener los roles activos.
      // El servicio ya contiene la lógica de filtrado y manejo de errores.
      const roles = await obtenerRolesActivos();

      // Si la operación es exitosa, devuelve la lista de roles activos.
      res.status(200).json(roles);
    } catch (error: unknown) {
      // Captura y registra cualquier error que ocurra en el servicio o durante la petición.
      console.error("Error en RolController.obtenerActivos:", (error as Error).message);
      // Devuelve una respuesta de error al cliente.
      res.status(500).json({
        mensaje: "Error interno del servidor al obtener roles activos.",
        error: (error as Error).message,
      });
    }
  }

  /* a futuro poder administar roles desde sistena
  static async crearRol(req: Request, res: Response) {
    try {
      const { nombre, descripcion, activo } = req.body;
      // Llama a un servicio para crear el rol
      // const nuevoRol = await RolService.crearRol({ nombre, descripcion, activo });
      // res.status(201).json(nuevoRol);
      res.status(501).json({ mensaje: "Crear rol aún no implementado." });
    } catch (error: unknown) {
      console.error("Error al crear rol:", (error as Error).message);
      res.status(500).json({ mensaje: "Error al crear rol.", error: (error as Error).message });
    }
  }*/
  
 static async obtenerPorCedula(req: CustomRequest, res: Response) {
    try {
      if (!req.user) { // CORREGIDO: Acceso a req.user para verificar autenticación
        return res.status(401).json({ mensaje: "Usuario no autenticado." });
      }
      if (req.user.rolNombre !== 'Administrador') { // CORREGIDO: Acceso a req.user.rolNombre
        console.warn(`Intento de búsqueda de colaborador por usuario no autorizado: ${req.user.correo} (Rol: ${req.user.rolNombre})`); // CORREGIDO: Acceso a req.user.correo y req.user.rolNombre
        return res.status(403).json({ mensaje: "Acceso denegado. Solo los administradores pueden buscar colaboradores." });
      }

      const { cedula } = req.body;

      if (!cedula) {
        return res.status(400).json({ mensaje: "El campo 'cedula' es obligatorio en el cuerpo de la solicitud para la búsqueda." });
      }

      const colaboradorEncontrado = await obtenerUsuarioPorIdentificacion(cedula);

      if (colaboradorEncontrado) {
        res.status(200).json({
          mensaje: "Colaborador encontrado exitosamente.",
          colaborador: colaboradorEncontrado,
        });
      } else {
        res.status(404).json({
          mensaje: "No se encontró un colaborador con esa identificación o el usuario no tiene el rol de 'Colaborador'."
        });
      }

    } catch (error: unknown) {
      console.error("Error en UserController.obtenerPorCedula:", (error as Error).message);
      res.status(500).json({ mensaje: "Error interno del servidor al buscar colaborador por identificación.", error: (error as Error).message });
    }
  }

  static async obtenerMisNegociosVinculados(req: CustomRequest, res: Response) {
      try {
  
          if (!req.user) {
          return res.status(401).json({ mensaje: "Usuario no autenticado." });
        }
  
        if (req.user.rolNombre == 'Cliente') {
          console.warn(`Intento un cliente traer datos de empresas no autorizado: ${req.user.correo} (Rol: ${req.user.rolNombre})`);
          return res.status(403).json({ mensaje: "Acceso denegado. Solo los colaboradores pueden traer las empresas." });
        }
  
        const idUsuario = req.user.id;
  
        if (!idUsuario) {
          return res.status(403).json({ mensaje: "Token inválido o no contiene la información del usuario." });
        }
  
        const negocios = await obtenerNegociosPorUsuario(idUsuario);
        res.status(200).json({
          mensaje: "Negocios vinculados obtenidos exitosamente.",
          negocios: negocios,
        });
  
      } catch (error: unknown) {
  
      }
    }
  

}
