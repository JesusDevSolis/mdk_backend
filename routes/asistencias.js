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
    getEstadisticasGenerales
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

// ✅ NUEVO: Middleware flexible para validar MongoID en diferentes parámetros
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

// @route   GET /api/asistencias/estadisticas
// @desc    Obtener estadísticas generales de asistencias
// @access  Private (Admin, Instructor)
router.get('/estadisticas', 
    authenticate, 
    isInstructor, 
    logAuthRequest, 
    getEstadisticasGenerales
);

// @route   GET /api/asistencias/alumno/:alumnoId
// @desc    Obtener asistencias por alumno
// @access  Private (Admin, Instructor)
router.get('/alumno/:alumnoId', 
    authenticate, 
    isInstructor,
    validateParamId('alumnoId'),  // ✅ CORREGIDO: Validar el parámetro correcto
    logAuthRequest, 
    getAsistenciasByAlumno
);

// @route   GET /api/asistencias/horario/:horarioId
// @desc    Obtener asistencias por horario
// @access  Private (Admin, Instructor)
router.get('/horario/:horarioId', 
    authenticate, 
    isInstructor,
    validateParamId('horarioId'),  // ✅ CORREGIDO: Validar el parámetro correcto
    logAuthRequest, 
    getAsistenciasByHorario
);

// @route   GET /api/asistencias/fecha/:fecha
// @desc    Obtener asistencias por fecha
// @access  Private (Admin, Instructor)
router.get('/fecha/:fecha', 
    authenticate, 
    isInstructor, 
    logAuthRequest, 
    getAsistenciasByFecha
);

// @route   POST /api/asistencias/marcar-grupo
// @desc    Marcar asistencia de grupo (por horario)
// @access  Private (Admin, Instructor)
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

// @route   GET /api/asistencias
// @desc    Obtener todas las asistencias
// @access  Private (Admin, Instructor)
router.get('/', 
    authenticate, 
    isInstructor, 
    logAuthRequest, 
    getAllAsistencias
);

// @route   GET /api/asistencias/:id
// @desc    Obtener asistencia por ID
// @access  Private (Admin, Instructor)
router.get('/:id', 
    authenticate, 
    isInstructor,
    validateMongoId, 
    logAuthRequest, 
    getAsistenciaById
);

// @route   POST /api/asistencias
// @desc    Marcar asistencia individual
// @access  Private (Admin, Instructor)
router.post('/', 
    authenticate, 
    isInstructor, 
    sanitizeInput, 
    logAuthRequest, 
    marcarAsistencia
);

// @route   PUT /api/asistencias/:id
// @desc    Actualizar asistencia
// @access  Private (Admin, Instructor)
router.put('/:id', 
    authenticate, 
    isInstructor,
    validateMongoId, 
    sanitizeInput, 
    logAuthRequest, 
    updateAsistencia
);

// @route   DELETE /api/asistencias/:id
// @desc    Eliminar asistencia
// @access  Private (Admin only)
router.delete('/:id', 
    authenticate, 
    isAdmin, 
    validateMongoId, 
    logAuthRequest, 
    deleteAsistencia
);

module.exports = router;