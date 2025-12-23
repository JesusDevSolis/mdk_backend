const Graduacion = require('../models/Graduacion');
const Calificacion = require('../models/Calificacion');
const Examen = require('../models/Examen');
const Alumno = require('../models/Alumno');
const mongoose = require('mongoose');

// ========================================
// PROCESAR GRADUACIONES MASIVAS
// ========================================
exports.procesarGraduaciones = async (req, res) => {
    try {
        const { examenId, alumnosGraduar } = req.body;

        // Validaciones
        if (!examenId || !alumnosGraduar || !Array.isArray(alumnosGraduar) || alumnosGraduar.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Examen y lista de alumnos son requeridos'
            });
        }

        // Verificar que el examen exista
        const examen = await Examen.findById(examenId);
        if (!examen) {
            return res.status(404).json({
                success: false,
                message: 'Examen no encontrado'
            });
        }

        // Resultados
        const graduacionesExitosas = [];
        const graduacionesFallidas = [];

        // Procesar cada alumno
        for (const { alumnoId, calificacionId } of alumnosGraduar) {
            try {
                // Verificar que la calificación exista y esté aprobada
                const calificacion = await Calificacion.findById(calificacionId);
                if (!calificacion || calificacion.resultado !== 'aprobado') {
                    graduacionesFallidas.push({
                        alumnoId,
                        motivo: 'Calificación no encontrada o alumno no aprobado'
                    });
                    continue;
                }

                // Verificar que el alumno exista
                const alumno = await Alumno.findById(alumnoId);
                if (!alumno) {
                    graduacionesFallidas.push({
                        alumnoId,
                        motivo: 'Alumno no encontrado'
                    });
                    continue;
                }

                // Verificar que no esté ya graduado en este examen
                const graduacionExistente = await Graduacion.findOne({
                    examen: examenId,
                    alumno: alumnoId
                });

                if (graduacionExistente) {
                    graduacionesFallidas.push({
                        alumnoId,
                        motivo: 'El alumno ya fue graduado en este examen'
                    });
                    continue;
                }

                // Guardar cinturón anterior
                const cinturonAnterior = alumno.belt.level;
                const cinturonNuevo = examen.cinturonObjetivo;

                // Crear registro de graduación
                const graduacion = new Graduacion({
                    examen: examenId,
                    calificacion: calificacionId,
                    alumno: alumnoId,
                    cinturonAnterior,
                    cinturonNuevo,
                    fechaGraduacion: Date.now(),
                    certificadoPor: examen.instructores || [req.user._id],
                    calificacionObtenida: calificacion.calificacionFinal,
                    observaciones: `Graduación automática del examen: ${examen.nombre}`,
                    creadoPor: req.user._id,
                    alumnoActualizado: true,
                    fechaActualizacionAlumno: Date.now(),
                    estado: 'aprobada'
                });

                await graduacion.save();

                // Actualizar cinturón del alumno
                alumno.belt.level = cinturonNuevo;
                alumno.belt.dateObtained = Date.now();
                alumno.belt.certifiedBy = req.user._id;
                
                // Actualizar estadísticas de graduación
                if (!alumno.stats.graduationTests) {
                    alumno.stats.graduationTests = { passed: 0, failed: 0 };
                }
                alumno.stats.graduationTests.passed += 1;

                await alumno.save();

                graduacionesExitosas.push({
                    alumnoId,
                    alumnoNombre: `${alumno.firstName} ${alumno.lastName}`,
                    cinturonAnterior,
                    cinturonNuevo,
                    graduacionId: graduacion._id
                });

            } catch (error) {
                console.error(`Error graduando alumno ${alumnoId}:`, error);
                graduacionesFallidas.push({
                    alumnoId,
                    motivo: error.message
                });
            }
        }

        // Respuesta
        res.status(200).json({
            success: true,
            message: `Graduaciones procesadas: ${graduacionesExitosas.length} exitosas, ${graduacionesFallidas.length} fallidas`,
            data: {
                exitosas: graduacionesExitosas,
                fallidas: graduacionesFallidas,
                total: alumnosGraduar.length
            }
        });

    } catch (error) {
        console.error('Error procesando graduaciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error al procesar graduaciones',
            error: error.message
        });
    }
};

// ========================================
// OBTENER TODAS LAS GRADUACIONES
// ========================================
exports.getAllGraduaciones = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            examen,
            alumno,
            sucursal,
            fechaInicio,
            fechaFin
        } = req.query;

        // Construir filtros
        const filters = { isActive: true };

        if (examen) filters.examen = examen;
        if (alumno) filters.alumno = alumno;

        // Filtro por rango de fechas
        if (fechaInicio || fechaFin) {
            filters.fechaGraduacion = {};
            if (fechaInicio) filters.fechaGraduacion.$gte = new Date(fechaInicio);
            if (fechaFin) filters.fechaGraduacion.$lte = new Date(fechaFin);
        }

        // Si hay filtro de sucursal, necesitamos hacer lookup
        let query = Graduacion.find(filters);

        if (sucursal) {
            // Obtener alumnos de esa sucursal
            const alumnosSucursal = await Alumno.find({
                'enrollment.sucursal': sucursal,
                isActive: true
            }).select('_id');

            const alumnosIds = alumnosSucursal.map(a => a._id);
            filters.alumno = { $in: alumnosIds };
            query = Graduacion.find(filters);
        }

        // Paginación
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const graduaciones = await query
            .populate('examen', 'nombre tipo fecha cinturonObjetivo')
            .populate('alumno', 'firstName lastName belt enrollment')
            .populate('calificacion', 'calificacionFinal resultado')
            .populate('certificadoPor', 'name email')
            .sort({ fechaGraduacion: -1 })
            .limit(parseInt(limit))
            .skip(skip);

        const total = await Graduacion.countDocuments(filters);

        res.status(200).json({
            success: true,
            data: graduaciones,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit)),
                limit: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Error obteniendo graduaciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener graduaciones',
            error: error.message
        });
    }
};

// ========================================
// OBTENER GRADUACIONES POR EXAMEN
// ========================================
exports.getGraduacionesByExamen = async (req, res) => {
    try {
        const { examenId } = req.params;

        const graduaciones = await Graduacion.find({
            examen: examenId,
            isActive: true
        })
        .populate('alumno', 'firstName lastName belt enrollment')
        .populate('calificacion', 'calificacionFinal resultado')
        .populate('certificadoPor', 'name email')
        .sort({ fechaGraduacion: -1 });

        res.status(200).json({
            success: true,
            data: graduaciones,
            total: graduaciones.length
        });

    } catch (error) {
        console.error('Error obteniendo graduaciones por examen:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener graduaciones',
            error: error.message
        });
    }
};

// ========================================
// OBTENER GRADUACIONES POR ALUMNO
// ========================================
exports.getGraduacionesByAlumno = async (req, res) => {
    try {
        const { alumnoId } = req.params;

        const graduaciones = await Graduacion.find({
            alumno: alumnoId,
            isActive: true
        })
        .populate('examen', 'nombre tipo fecha cinturonObjetivo')
        .populate('calificacion', 'calificacionFinal resultado')
        .populate('certificadoPor', 'name email')
        .sort({ fechaGraduacion: -1 });

        res.status(200).json({
            success: true,
            data: graduaciones,
            total: graduaciones.length
        });

    } catch (error) {
        console.error('Error obteniendo graduaciones por alumno:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener graduaciones',
            error: error.message
        });
    }
};

// ========================================
// OBTENER ESTADÍSTICAS DE GRADUACIONES
// ========================================
exports.getEstadisticas = async (req, res) => {
    try {
        const { sucursal, fechaInicio, fechaFin } = req.query;

        const filters = { isActive: true };

        // Filtro por rango de fechas
        if (fechaInicio || fechaFin) {
            filters.fechaGraduacion = {};
            if (fechaInicio) filters.fechaGraduacion.$gte = new Date(fechaInicio);
            if (fechaFin) filters.fechaGraduacion.$lte = new Date(fechaFin);
        }

        const graduaciones = await Graduacion.find(filters)
            .populate('alumno', 'enrollment')
            .lean();

        // Filtrar por sucursal si se especifica
        let graduacionesFiltradas = graduaciones;
        if (sucursal) {
            graduacionesFiltradas = graduaciones.filter(g => 
                g.alumno?.enrollment?.sucursal?.toString() === sucursal
            );
        }

        // Calcular estadísticas
        const estadisticas = {
            total: graduacionesFiltradas.length,
            porCinturon: {},
            promedioCalificacion: 0,
            ultimasGraduaciones: []
        };

        // Contar por cinturón
        graduacionesFiltradas.forEach(g => {
            if (!estadisticas.porCinturon[g.cinturonNuevo]) {
                estadisticas.porCinturon[g.cinturonNuevo] = 0;
            }
            estadisticas.porCinturon[g.cinturonNuevo]++;
        });

        // Calcular promedio de calificación
        const calificaciones = graduacionesFiltradas
            .map(g => g.calificacionObtenida)
            .filter(c => c !== undefined && c !== null);

        if (calificaciones.length > 0) {
            estadisticas.promedioCalificacion = 
                calificaciones.reduce((sum, c) => sum + c, 0) / calificaciones.length;
        }

        res.status(200).json({
            success: true,
            data: estadisticas
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas',
            error: error.message
        });
    }
};

module.exports = exports;