const express = require('express');
const router = express.Router();

// Importar controladores
const {
    getDashboardStats,
    getActividadReciente,
    getSucursalesStats,
    getFinancieroStats,
    getAlumnosStats,
    getResumen,
    getSucursalesComparativa
} = require('../controllers/dashboardController');

// Importar middleware de autenticación
const {
    authenticate,
    isAdmin,
    isInstructor,
    logAuthRequest
} = require('../middleware/auth');

// @route   GET /api/dashboard/resumen
// @desc    Obtener resumen rápido para tarjetas principales
// @access  Private (Admin, Instructor)
router.get('/resumen', 
    authenticate, 
    isInstructor, 
    logAuthRequest, 
    getResumen
);

// @route   GET /api/dashboard/stats
// @desc    Obtener estadísticas generales completas
// @access  Private (Admin, Instructor)
router.get('/stats', 
    authenticate, 
    isInstructor, 
    logAuthRequest, 
    getDashboardStats
);

// @route   GET /api/dashboard/actividad-reciente
// @desc    Obtener actividad reciente (alumnos, pagos, próximos vencimientos)
// @access  Private (Admin, Instructor)
router.get('/actividad-reciente', 
    authenticate, 
    isInstructor, 
    logAuthRequest, 
    getActividadReciente
);

// @route   GET /api/dashboard/sucursales-stats
// @desc    Obtener estadísticas por sucursal
// @access  Private (Admin, Instructor)
router.get('/sucursales-stats', 
    authenticate, 
    isInstructor, 
    logAuthRequest, 
    getSucursalesStats
);

// @route   GET /api/dashboard/sucursales-comparativa
// @desc    Obtener comparativa de sucursales para tabla
// @access  Private (Admin, Instructor)
router.get('/sucursales-comparativa', 
    authenticate, 
    isInstructor, 
    logAuthRequest, 
    getSucursalesComparativa
);

// @route   GET /api/dashboard/financiero
// @desc    Obtener estadísticas financieras detalladas
// @access  Private (Admin only)
router.get('/financiero', 
    authenticate, 
    isAdmin, 
    logAuthRequest, 
    getFinancieroStats
);

// @route   GET /api/dashboard/alumnos-stats
// @desc    Obtener estadísticas de alumnos (género, edad, distribución)
// @access  Private (Admin, Instructor)
router.get('/alumnos-stats', 
    authenticate, 
    isInstructor, 
    logAuthRequest, 
    getAlumnosStats
);

module.exports = router;