const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Importar controladores
const {
    procesarGraduaciones,
    getAllGraduaciones,
    getGraduacionesByExamen,
    getGraduacionesByAlumno,
    getEstadisticas
} = require('../controllers/graduacionController');

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

// GET /api/graduaciones - Obtener todas las graduaciones
router.get(
    '/',
    authenticate,
    getAllGraduaciones
);

// GET /api/graduaciones/estadisticas - Obtener estadísticas
router.get(
    '/estadisticas',
    authenticate,
    getEstadisticas
);

// GET /api/graduaciones/examen/:examenId - Obtener graduaciones por examen
router.get(
    '/examen/:examenId',
    authenticate,
    validateParamId('examenId'),
    getGraduacionesByExamen
);

// GET /api/graduaciones/alumno/:alumnoId - Obtener graduaciones por alumno
router.get(
    '/alumno/:alumnoId',
    authenticate,
    validateParamId('alumnoId'),
    getGraduacionesByAlumno
);

// ========================================
// RUTAS ADMIN E INSTRUCTOR
// ========================================

// POST /api/graduaciones/procesar - Procesar graduaciones masivas
router.post(
    '/procesar',
    authenticate,
    procesarGraduaciones
);

module.exports = router;