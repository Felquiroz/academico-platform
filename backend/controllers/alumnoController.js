// Asegúrate de importar la conexión a tu base de datos (ajusta la ruta según tu proyecto)
const db = require('../config/db'); 

exports.getAll = async (req, res) => {
  try {
    // Consulta a la tabla alumnos que creamos antes
    const [alumnos] = await db.query('SELECT id, nombre, correo FROM alumnos ORDER BY nombre ASC');
    
    // Lo devolvemos dentro de un objeto "data" porque tu frontend espera res.data
    res.json({ data: alumnos }); 
  } catch (error) {
    console.error('Error obteniendo alumnos:', error);
    res.status(500).json({ message: 'Error en el servidor al obtener alumnos' });
  }
};