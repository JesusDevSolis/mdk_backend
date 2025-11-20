const express = require('express');
const router = express.Router();

// Importar controladores
const {
    getAllHorarios,
    getHorarioById,
    createHorario,
    updateHorario,
    deleteHorario,
    inscribirAlumno,
    desinscribirAlumno,
    getHorariosBySucursal,
    getHorariosByInstructor,
    getHorariosByDia,
    getHorariosDisponibles,
    getHorariosStats,
    cambiarEstadoHorario
} = require('../controllers/horarioController');

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

// ============================================
// RUTAS ESPECÍFICAS (deben ir antes de /:id)
// ============================================

// @route   GET /api/horarios/stats
// @desc    Obtener estadísticas de horarios
// @access  Private (Admin, Instructor)
router.get('/stats', 
    authenticate, 
    isInstructor, 
    logAuthRequest, 
    getHorariosStats
);

// @route   GET /api/horarios/disponibles
// @desc    Obtener horarios disponibles (con lugares)
// @access  Private (Admin, Instructor)
router.get('/disponibles', 
    authenticate, 
    isInstructor, 
    logAuthRequest, 
    getHorariosDisponibles
);

// @route   GET /api/horarios/sucursal/:sucursalId
// @desc    Obtener horarios por sucursal
// @access  Private (Admin, Instructor)
router.get('/sucursal/:sucursalId', 
    authenticate, 
    isInstructor,
    validateMongoId, 
    logAuthRequest, 
    getHorariosBySucursal
);

// @route   GET /api/horarios/instructor/:instructorId
// @desc    Obtener horarios por instructor
// @access  Private (Admin, Instructor)
router.get('/instructor/:instructorId', 
    authenticate, 
    isInstructor,
    validateMongoId, 
    logAuthRequest, 
    getHorariosByInstructor
);

// @route   GET /api/horarios/dia/:dia
// @desc    Obtener horarios por día
// @access  Private (Admin, Instructor)
router.get('/dia/:dia', 
    authenticate, 
    isInstructor, 
    logAuthRequest, 
    getHorariosByDia
);

// ============================================
// RUTAS CRUD PRINCIPALES
// ============================================

// @route   GET /api/horarios
// @desc    Obtener todos los horarios
// @access  Private (Admin, Instructor)
router.get('/', 
    authenticate, 
    isInstructor, 
    logAuthRequest, 
    getAllHorarios
);

// @route   GET /api/horarios/:id
// @desc    Obtener horario por ID
// @access  Private (Admin, Instructor)
router.get('/:id', 
    authenticate, 
    isInstructor,
    validateMongoId, 
    logAuthRequest, 
    getHorarioById
);

// @route   POST /api/horarios
// @desc    Crear nuevo horario
// @access  Private (Admin, Instructor)
router.post('/', 
    authenticate, 
    isInstructor, 
    sanitizeInput, 
    logAuthRequest, 
    createHorario
);

// @route   PUT /api/horarios/:id
// @desc    Actualizar horario
// @access  Private (Admin, Instructor)
router.put('/:id', 
    authenticate, 
    isInstructor,
    validateMongoId, 
    sanitizeInput, 
    logAuthRequest, 
    updateHorario
);

// @route   DELETE /api/horarios/:id
// @desc    Eliminar horario (soft delete)
// @access  Private (Admin only)
router.delete('/:id', 
    authenticate, 
    isAdmin, 
    validateMongoId, 
    logAuthRequest, 
    deleteHorario
);

// ============================================
// RUTAS DE INSCRIPCIÓN
// ============================================

// @route   POST /api/horarios/:id/inscribir
// @desc    Inscribir alumno en horario
// @access  Private (Admin, Instructor)
router.post('/:id/inscribir', 
    authenticate, 
    isInstructor,
    validateMongoId, 
    sanitizeInput, 
    logAuthRequest, 
    inscribirAlumno
);

// @route   DELETE /api/horarios/:id/desinscribir/:alumnoId
// @desc    Desinscribir alumno de horario
// @access  Private (Admin, Instructor)
router.delete('/:id/desinscribir/:alumnoId', 
    authenticate, 
    isInstructor,
    validateMongoId, 
    logAuthRequest, 
    desinscribirAlumno
);

// ============================================
// RUTAS ADICIONALES
// ============================================

// @route   PUT /api/horarios/:id/estado
// @desc    Cambiar estado del horario
// @access  Private (Admin, Instructor)
router.put('/:id/estado', 
    authenticate, 
    isInstructor,
    validateMongoId, 
    sanitizeInput, 
    logAuthRequest, 
    cambiarEstadoHorario
);

module.exports = router;