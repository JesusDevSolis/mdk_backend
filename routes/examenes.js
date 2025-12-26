const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Importar controladores
const {
    getAllExamenes,
    getExamenById,
    createExamen,
    updateExamen,
    deleteExamen,
    inscribirAlumno,
    desinscribirAlumno,
    registrarPagoExamen,
    getAlumnosElegibles,
    cambiarEstado,
    calificarAlumno,
    getCalificacionAlumno,
    getCalificacionesExamen,
    getEstadisticas,
    getConfiguracionesExamenes // ✅ NUEVO
} = require('../controllers/examenController');

// Importar middleware de autenticación
const {
    authenticate,
    isAdmin,
    isInstructor
} = require('../middleware/auth');

// Middleware para validar MongoID
const validateParamId = (paramName) => {
    return (req, res, next) => {
        const id = req.params[paramName];
        
        if (!id) {
            return res.status(400).json({
                success: false,
                message: `El parámetro ${paramName} es requerido`
            });
        }
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: `El parámetro ${paramName} no es un ID válido`
            });
        }
        
        next();
    };
};

// ========================================
// RUTAS PÚBLICAS (requieren autenticación)
// ========================================

// GET /api/examenes - Obtener todos los exámenes
router.get(
    '/',
    authenticate,
    getAllExamenes
);

// ✅ NUEVO: GET /api/examenes/configuraciones - Obtener configuraciones de exámenes
router.get(
    '/configuraciones',
    authenticate,
    isInstructor,
    getConfiguracionesExamenes
);

// GET /api/examenes/estadisticas - Obtener estadísticas
router.get(
    '/estadisticas',
    authenticate,
    getEstadisticas
);

// GET /api/examenes/:id - Obtener examen por ID
router.get(
    '/:id',
    authenticate,
    validateParamId('id'),
    getExamenById
);

// GET /api/examenes/:id/alumnos-elegibles - Obtener alumnos elegibles
router.get(
    '/:id/alumnos-elegibles',
    authenticate,
    validateParamId('id'),
    getAlumnosElegibles
);

// GET /api/examenes/:id/calificaciones - Obtener todas las calificaciones del examen
router.get(
    '/:id/calificaciones',
    authenticate,
    validateParamId('id'),
    getCalificacionesExamen
);

// GET /api/examenes/:id/calificaciones/:alumnoId - Obtener calificación de un alumno
router.get(
    '/:id/calificaciones/:alumnoId',
    authenticate,
    validateParamId('id'),
    validateParamId('alumnoId'),
    getCalificacionAlumno
);

// ========================================
// RUTAS ADMIN E INSTRUCTOR (crear/editar)
// ========================================

// POST /api/examenes - Crear examen
router.post(
    '/',
    authenticate,
    createExamen
);

// PUT /api/examenes/:id - Actualizar examen
router.put(
    '/:id',
    authenticate,
    validateParamId('id'),
    updateExamen
);

// PUT /api/examenes/:id/estado - Cambiar estado del examen
router.put(
    '/:id/estado',
    authenticate,
    validateParamId('id'),
    cambiarEstado
);

// POST /api/examenes/:id/inscribir - Inscribir alumno
router.post(
    '/:id/inscribir',
    authenticate,
    validateParamId('id'),
    inscribirAlumno
);

// DELETE /api/examenes/:id/alumnos/:alumnoId - Desinscribir alumno
router.delete(
    '/:id/alumnos/:alumnoId',
    authenticate,
    validateParamId('id'),
    validateParamId('alumnoId'),
    desinscribirAlumno
);

// POST /api/examenes/:id/pago - Registrar pago de examen
router.post(
    '/:id/pago',
    authenticate,
    validateParamId('id'),
    registrarPagoExamen
);

// POST /api/examenes/:id/calificar - Calificar alumno
router.post(
    '/:id/calificar',
    authenticate,
    validateParamId('id'),
    calificarAlumno
);

// ========================================
// RUTAS SOLO ADMIN
// ========================================

// DELETE /api/examenes/:id - Eliminar examen (soft delete)
router.delete(
    '/:id',
    authenticate,
    isAdmin,
    validateParamId('id'),
    deleteExamen
);

module.exports = router;