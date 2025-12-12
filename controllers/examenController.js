const Examen = require('../models/Examen');
const Calificacion = require('../models/Calificacion');
const Graduacion = require('../models/Graduacion');
const Alumno = require('../models/Alumno');
const User = require('../models/User');
const mongoose = require('mongoose');

// ========================================
// OBTENER TODOS LOS EXÁMENES
// ========================================
exports.getAllExamenes = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            sucursal,
            tipo,
            estado,
            cinturonObjetivo,
            fechaInicio,
            fechaFin,
            search,
            sortBy = 'fecha',
            sortOrder = 'desc'
        } = req.query;

        // Construir filtros
        const filters = { isActive: true };

        // Si es instructor, solo ve exámenes de su sucursal
        if (req.user.role === 'instructor' && req.user.sucursal) {
            filters.sucursal = req.user.sucursal;
        } else if (sucursal) {
            filters.sucursal = sucursal;
        }

        if (tipo) filters.tipo = tipo;
        if (estado) filters.estado = estado;
        if (cinturonObjetivo) filters.cinturonObjetivo = cinturonObjetivo;

        // Filtro por búsqueda
        if (search) {
            filters.$or = [
                { nombre: { $regex: search, $options: 'i' } },
                { descripcion: { $regex: search, $options: 'i' } }
            ];
        }

        // Filtro por rango de fechas
        if (fechaInicio || fechaFin) {
            filters.fecha = {};
            if (fechaInicio) {
                const inicio = new Date(fechaInicio);
                inicio.setHours(0, 0, 0, 0);
                filters.fecha.$gte = inicio;
            }
            if (fechaFin) {
                const fin = new Date(fechaFin);
                fin.setHours(23, 59, 59, 999);
                filters.fecha.$lte = fin;
            }
        }

        // Calcular skip para paginación
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Construir sort
        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        // Obtener exámenes
        const examenes = await Examen.find(filters)
                        .populate('sucursal', 'name address')
                        .populate('instructores', 'name email')
                        .populate('creadoPor', 'name email')
                        .sort(sort)
                        .limit(parseInt(limit))
                        .skip(skip)
                        .lean();

        // Contar total
        const total = await Examen.countDocuments(filters);

        res.status(200).json({
            success: true,
            data: examenes,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit)),
                limit: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Error al obtener exámenes:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener exámenes',
            error: error.message
        });
    }
};

// ========================================
// OBTENER EXAMEN POR ID
// ========================================
exports.getExamenById = async (req, res) => {
    try {
        const { id } = req.params;

        const examen = await Examen.findById(id)
                        .populate('sucursal', 'name address phone')
                        .populate('instructores', 'name email phone')
                        .populate('creadoPor', 'name email')
                        .populate('modificadoPor', 'name email')
                        .populate({
                            path: 'alumnosInscritos.alumno',
                            select: 'firstName lastName belt email phone'
                        })
                        .lean();

        if (!examen) {
            return res.status(404).json({
                success: false,
                message: 'Examen no encontrado'
            });
        }

        // Verificar permisos de instructor
        if (req.user.role === 'instructor' && req.user.sucursal) {
            if (examen.sucursal._id.toString() !== req.user.sucursal.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permiso para ver este examen'
                });
            }
        }

        res.status(200).json({
            success: true,
            data: examen
        });

    } catch (error) {
        console.error('Error al obtener examen:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener examen',
            error: error.message
        });
    }
};

// ========================================
// CREAR EXAMEN
// ========================================
exports.createExamen = async (req, res) => {
    try {
        const examenData = {
            ...req.body,
            creadoPor: req.user._id
        };

        // Si es instructor, asignar su sucursal automáticamente
        if (req.user.role === 'instructor' && req.user.sucursal) {
            examenData.sucursal = req.user.sucursal;
        }

        const nuevoExamen = new Examen(examenData);
        await nuevoExamen.save();

        const examenCompleto = await Examen.findById(nuevoExamen._id)
                                .populate('sucursal', 'name')
                                .populate('instructores', 'name email')
                                .lean();

        res.status(201).json({
            success: true,
            message: 'Examen creado exitosamente',
            data: examenCompleto
        });

    } catch (error) {
        console.error('Error al crear examen:', error);
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Error de validación',
                errors: Object.values(error.errors).map(err => err.message)
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error al crear examen',
            error: error.message
        });
    }
};

// ========================================
// ACTUALIZAR EXAMEN
// ========================================
exports.updateExamen = async (req, res) => {
    try {
        const { id } = req.params;

        const examen = await Examen.findById(id);

        if (!examen) {
            return res.status(404).json({
                success: false,
                message: 'Examen no encontrado'
            });
        }

        // Verificar permisos de instructor
        if (req.user.role === 'instructor' && req.user.sucursal) {
            if (examen.sucursal.toString() !== req.user.sucursal.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permiso para actualizar este examen'
                });
            }
        }

        // Actualizar campos
        Object.keys(req.body).forEach(key => {
            examen[key] = req.body[key];
        });

        examen.modificadoPor = req.user._id;
        await examen.save();

        const examenActualizado = await Examen.findById(id)
                                .populate('sucursal', 'name')
                                .populate('instructores', 'name email')
                                .lean();

        res.status(200).json({
            success: true,
            message: 'Examen actualizado exitosamente',
            data: examenActualizado
        });

    } catch (error) {
        console.error('Error al actualizar examen:', error);
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Error de validación',
                errors: Object.values(error.errors).map(err => err.message)
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error al actualizar examen',
            error: error.message
        });
    }
};

// ========================================
// ELIMINAR EXAMEN (SOFT DELETE)
// ========================================
exports.deleteExamen = async (req, res) => {
    try {
        const { id } = req.params;

        const examen = await Examen.findById(id);

        if (!examen) {
            return res.status(404).json({
                success: false,
                message: 'Examen no encontrado'
            });
        }

        // Solo admin puede eliminar
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo administradores pueden eliminar exámenes'
            });
        }

        examen.isActive = false;
        examen.modificadoPor = req.user._id;
        await examen.save();

        res.status(200).json({
            success: true,
            message: 'Examen eliminado exitosamente'
        });

    } catch (error) {
        console.error('Error al eliminar examen:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar examen',
            error: error.message
        });
    }
};

// ========================================
// INSCRIBIR ALUMNO AL EXAMEN
// ========================================
exports.inscribirAlumno = async (req, res) => {
    try {
        const { id } = req.params; // ID del examen
        const { alumnoId, descuento, autorizadoSinPago, motivoAutorizacion } = req.body;

        const examen = await Examen.findById(id);

        if (!examen) {
            return res.status(404).json({
                success: false,
                message: 'Examen no encontrado'
            });
        }

        // Verificar que el alumno existe
        const alumno = await Alumno.findById(alumnoId);
        if (!alumno) {
            return res.status(404).json({
                success: false,
                message: 'Alumno no encontrado'
            });
        }

        // Verificar que el alumno tiene el cinturón correcto
        if (examen.tipo === 'graduacion') {
            if (alumno.belt.level !== examen.cinturonActualRequerido) {
                return res.status(400).json({
                    success: false,
                    message: `El alumno debe tener cinturón ${examen.cinturonActualRequerido} para inscribirse`
                });
            }
        }

        // Inscribir alumno
        await examen.inscribirAlumno(alumnoId, {
            descuento: descuento || 0,
            autorizadoSinPago: autorizadoSinPago || false,
            autorizadoPor: autorizadoSinPago ? req.user._id : null,
            motivoAutorizacion: motivoAutorizacion || ''
        });

        const examenActualizado = await Examen.findById(id)
                                    .populate({
                                        path: 'alumnosInscritos.alumno',
                                        select: 'firstName lastName belt'
                                    })
                                    .lean();

        res.status(200).json({
            success: true,
            message: 'Alumno inscrito exitosamente',
            data: examenActualizado
        });

    } catch (error) {
        console.error('Error al inscribir alumno:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Error al inscribir alumno'
        });
    }
};

// ========================================
// DESINSCRIBIR ALUMNO DEL EXAMEN
// ========================================
exports.desinscribirAlumno = async (req, res) => {
    try {
        const { id, alumnoId } = req.params;

        const examen = await Examen.findById(id);

        if (!examen) {
            return res.status(404).json({
                success: false,
                message: 'Examen no encontrado'
            });
        }

        // Verificar si hay calificación registrada
        const calificacionExistente = await Calificacion.findOne({
            examen: id,
            alumno: alumnoId,
            isActive: true
        });

        if (calificacionExistente) {
            return res.status(400).json({
                success: false,
                message: 'No se puede desinscribir. El alumno ya tiene calificación registrada'
            });
        }

        // Remover del array
        examen.alumnosInscritos = examen.alumnosInscritos.filter(
            inscrito => inscrito.alumno.toString() !== alumnoId
        );

        await examen.save();

        res.status(200).json({
            success: true,
            message: 'Alumno desinscrito exitosamente'
        });

    } catch (error) {
        console.error('Error al desinscribir alumno:', error);
        res.status(500).json({
            success: false,
            message: 'Error al desinscribir alumno',
            error: error.message
        });
    }
};

// ========================================
// REGISTRAR PAGO DE EXAMEN
// ========================================
exports.registrarPagoExamen = async (req, res) => {
    try {
        const { id } = req.params; // ID del examen
        const { alumnoId, montoPagado, referenciaPago } = req.body;

        const examen = await Examen.findById(id);

        if (!examen) {
            return res.status(404).json({
                success: false,
                message: 'Examen no encontrado'
            });
        }

        await examen.registrarPagoExamen(alumnoId, montoPagado, referenciaPago);

        const examenActualizado = await Examen.findById(id)
                                    .populate({
                                        path: 'alumnosInscritos.alumno',
                                        select: 'firstName lastName'
                                    })
                                    .lean();

        res.status(200).json({
            success: true,
            message: 'Pago registrado exitosamente',
            data: examenActualizado
        });

    } catch (error) {
        console.error('Error al registrar pago:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Error al registrar pago'
        });
    }
};

// ========================================
// OBTENER ALUMNOS ELEGIBLES PARA EXAMEN
// ========================================
exports.getAlumnosElegibles = async (req, res) => {
    try {
        const { id } = req.params;

        const examen = await Examen.findById(id);

        if (!examen) {
            return res.status(404).json({
                success: false,
                message: 'Examen no encontrado'
            });
        }

        // Filtros base
        const filters = {
            isActive: true,
            'enrollment.sucursal': examen.sucursal
        };

        // Si es examen de graduación, filtrar por cinturón
        if (examen.tipo === 'graduacion') {
            filters['belt.level'] = examen.cinturonActualRequerido;
        }

        // Obtener alumnos
        let alumnosElegibles = await Alumno.find(filters)
                                .select('firstName lastName belt email phone enrollment')
                                .lean();

        // Filtrar alumnos ya inscritos
        const alumnosInscritosIds = examen.alumnosInscritos.map(
                                        i => i.alumno.toString()
                                    );

        alumnosElegibles = alumnosElegibles.filter(
                                        alumno => !alumnosInscritosIds.includes(alumno._id.toString())
                                    );

        // Verificar requisitos para cada alumno
        const alumnosConRequisitos = await Promise.all(
            alumnosElegibles.map(async (alumno) => {
                const requisitos = await examen.verificarRequisitosAlumno(alumno._id);
                return {
                    ...alumno,
                    cumpleRequisitos: requisitos
                };
            })
        );

        res.status(200).json({
            success: true,
            data: alumnosConRequisitos
        });

    } catch (error) {
        console.error('Error al obtener alumnos elegibles:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener alumnos elegibles',
            error: error.message
        });
    }
};

// ========================================
// CAMBIAR ESTADO DEL EXAMEN
// ========================================
exports.cambiarEstado = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        const estadosValidos = ['programado', 'en_proceso', 'completado', 'cancelado'];
        
        if (!estadosValidos.includes(estado)) {
            return res.status(400).json({
                success: false,
                message: 'Estado inválido'
            });
        }

        const examen = await Examen.findById(id);

        if (!examen) {
            return res.status(404).json({
                success: false,
                message: 'Examen no encontrado'
            });
        }

        examen.estado = estado;
        examen.modificadoPor = req.user._id;
        await examen.save();

        res.status(200).json({
            success: true,
            message: 'Estado actualizado exitosamente',
            data: examen
        });

    } catch (error) {
        console.error('Error al cambiar estado:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cambiar estado',
            error: error.message
        });
    }
};

// ========================================
// OBTENER ESTADÍSTICAS DE EXÁMENES
// ========================================
exports.getEstadisticas = async (req, res) => {
    try {
        const { sucursal, fechaInicio, fechaFin } = req.query;

        const filters = { isActive: true };

        // Si es instructor, solo su sucursal
        if (req.user.role === 'instructor' && req.user.sucursal) {
            filters.sucursal = req.user.sucursal;
        } else if (sucursal) {
            filters.sucursal = sucursal;
        }

        // Filtro de fechas
        if (fechaInicio || fechaFin) {
            filters.fecha = {};
            if (fechaInicio) filters.fecha.$gte = new Date(fechaInicio);
            if (fechaFin) filters.fecha.$lte = new Date(fechaFin);
        }

        const examenes = await Examen.find(filters).lean();

        const estadisticas = {
            total: examenes.length,
            porEstado: {
                programado: examenes.filter(e => e.estado === 'programado').length,
                en_proceso: examenes.filter(e => e.estado === 'en_proceso').length,
                completado: examenes.filter(e => e.estado === 'completado').length,
                cancelado: examenes.filter(e => e.estado === 'cancelado').length
            },
            porTipo: {
                graduacion: examenes.filter(e => e.tipo === 'graduacion').length,
                evaluacion_tecnica: examenes.filter(e => e.tipo === 'evaluacion_tecnica').length,
                evaluacion_semestral: examenes.filter(e => e.tipo === 'evaluacion_semestral').length,
                otro: examenes.filter(e => e.tipo === 'otro').length
            },
            totalInscritos: examenes.reduce((sum, e) => sum + e.alumnosInscritos.length, 0),
            totalRecaudado: examenes.reduce((sum, e) => {
                return sum + e.alumnosInscritos.reduce((total, inscrito) => {
                return total + (inscrito.pagoExamen?.montoPagado || 0);
                }, 0);
            }, 0)
        };

        res.status(200).json({
            success: true,
            data: estadisticas
        });

    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas',
            error: error.message
        });
    }
};

module.exports = exports;