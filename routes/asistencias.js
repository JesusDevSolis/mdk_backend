const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Importar controladores
const {
    getAllAsistencias,
    getAsistenciaById,
    marcarAsistencia,
    marcarAsistenciaGrupo,
    updateAsistencia,
    deleteAsistencia,
    getAsistenciasByAlumno,
    getAsistenciasByHorario,
    getAsistenciasByFecha,
    getEstadisticasGenerales,
    getConfiguracionesAsistencias // ✅ NUEVO
} = require('../controllers/asistenciaController');

// Importar middleware de autenticación
const {
    authenticate,
    isAdmin,
    isInstructor,
    logAuthRequest
} = require('../middleware/auth');

// Importar middleware de validación
const {
    validateMongoId,
    sanitizeInput
} = require('../middleware/validation');

// Middleware flexible para validar MongoID en diferentes parámetros
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

// ============================================
// RUTAS ESPECÍFICAS (deben ir antes de /:id)
// ============================================

// ✅ NUEVO: Obtener configuraciones de asistencias
// GET /api/asistencias/configuraciones
router.get('/configuraciones', 
    authenticate, 
    isInstructor, 
    getConfiguracionesAsistencias
);

// Obtener estadísticas generales de asistencias
// GET /api/asistencias/estadisticas
router.get('/estadisticas', 
    authenticate, 
    isInstructor, 
    logAuthRequest, 
    getEstadisticasGenerales
);

// Obtener asistencias por alumno
// GET /api/asistencias/alumno/:alumnoId
router.get('/alumno/:alumnoId', 
    authenticate, 
    isInstructor,
    validateParamId('alumnoId'),
    logAuthRequest, 
    getAsistenciasByAlumno
);

// Obtener asistencias por horario
// GET /api/asistencias/horario/:horarioId
router.get('/horario/:horarioId', 
    authenticate, 
    isInstructor,
    validateParamId('horarioId'),
    logAuthRequest, 
    getAsistenciasByHorario
);

// Obtener asistencias por fecha
// GET /api/asistencias/fecha/:fecha
router.get('/fecha/:fecha', 
    authenticate, 
    isInstructor, 
    logAuthRequest, 
    getAsistenciasByFecha
);

// Marcar asistencia de grupo (por horario)
// POST /api/asistencias/marcar-grupo
router.post('/marcar-grupo', 
    authenticate, 
    isInstructor, 
    sanitizeInput, 
    logAuthRequest, 
    marcarAsistenciaGrupo
);

// ============================================
// RUTAS CRUD PRINCIPALES
// ============================================

// Obtener todas las asistencias
// GET /api/asistencias
router.get('/', 
    authenticate, 
    isInstructor, 
    logAuthRequest, 
    getAllAsistencias
);

// Obtener asistencia por ID
// GET /api/asistencias/:id
router.get('/:id', 
    authenticate, 
    isInstructor,
    validateMongoId, 
    logAuthRequest, 
    getAsistenciaById
);

// Marcar asistencia individual (✅ INTEGRADO CON TOLERANCIA)
// POST /api/asistencias
// Body: { alumnoId, horarioId, fecha, estado, horaRegistro }
router.post('/', 
    authenticate, 
    isInstructor, 
    sanitizeInput, 
    logAuthRequest, 
    marcarAsistencia
);

// Actualizar asistencia
// PUT /api/asistencias/:id
router.put('/:id', 
    authenticate, 
    isInstructor,
    validateMongoId, 
    sanitizeInput, 
    logAuthRequest, 
    updateAsistencia
);

// Eliminar asistencia
// DELETE /api/asistencias/:id
router.delete('/:id', 
    authenticate, 
    isAdmin, 
    validateMongoId, 
    logAuthRequest, 
    deleteAsistencia
);

module.exports = router;