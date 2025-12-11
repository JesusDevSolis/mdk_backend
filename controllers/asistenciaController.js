const Asistencia = require('../models/Asistencia');
const Alumno = require('../models/Alumno');
const Horario = require('../models/Horario');
const User = require('../models/User');
const mongoose = require('mongoose');

// ===== OBTENER TODAS LAS ASISTENCIAS =====
exports.getAllAsistencias = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            alumno,
            horario,
            instructor,
            estado,
            fechaInicio,
            fechaFin,
            search,
            sortBy = 'fecha',
            sortOrder = 'desc'
        } = req.query;

        // Construir filtros
        const filters = {};

        if (alumno) filters.alumno = alumno;
        if (horario) filters.horario = horario;
        if (instructor) filters.instructor = instructor;
        if (estado) filters.estado = estado;

        // ✅ NUEVO: Filtrar por instructor si no es admin
        if (req.user.role === 'instructor') {
            // El instructor solo ve asistencias de horarios donde está asignado
            const horariosInstructor = await Horario.find({ 
                instructor: req.user._id,
                isActive: true 
            }).select('_id');
            
            const horarioIds = horariosInstructor.map(h => h._id);
            
            if (horarioIds.length > 0) {
                filters.horario = { $in: horarioIds };
            } else {
                // Si no tiene horarios, no ve ninguna asistencia
                filters.horario = null;
            }
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
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

        // Ejecutar query con paginación
        const asistencias = await Asistencia.find(filters)
            .populate('alumno', 'firstName lastName enrollment.studentId profilePhoto')
            .populate('horario', 'nombre dias horaInicio horaFin sucursal')
            .populate('instructor', 'name')
            .populate('registradoPor', 'name')
            .populate('modificadoPor', 'name')
            .sort(sortOptions)
            .limit(parseInt(limit))
            .skip(skip)
            .lean();

        // Contar total de documentos
        const total = await Asistencia.countDocuments(filters);

        // Calcular información de paginación
        const totalPages = Math.ceil(total / parseInt(limit));
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        res.status(200).json({
            success: true,
            data: asistencias,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages,
                hasNextPage,
                hasPrevPage
            }
        });
    } catch (error) {
        console.error('Error al obtener asistencias:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener las asistencias',
            error: error.message
        });
    }
};

// ===== OBTENER ASISTENCIA POR ID =====
exports.getAsistenciaById = async (req, res) => {
    try {
        const { id } = req.params;

        const asistencia = await Asistencia.findById(id)
            .populate('alumno', 'firstName lastName enrollment.studentId email phone profilePhoto')
            .populate('horario', 'nombre dias horaInicio horaFin sucursal nivel')
            .populate('instructor', 'name email')
            .populate('registradoPor', 'name email')
            .populate('modificadoPor', 'name email');

        if (!asistencia) {
            return res.status(404).json({
                success: false,
                message: 'Asistencia no encontrada'
            });
        }

        res.status(200).json({
            success: true,
            data: asistencia.getPublicInfo()
        });
    } catch (error) {
        console.error('Error al obtener asistencia:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener la asistencia',
            error: error.message
        });
    }
};

// ===== MARCAR ASISTENCIA INDIVIDUAL =====
exports.marcarAsistencia = async (req, res) => {
    try {
        const { alumnoId, horarioId, fecha, estado, notas, horaRegistro } = req.body;

        // Validaciones
        if (!alumnoId || !horarioId || !estado) {
            return res.status(400).json({
                success: false,
                message: 'Alumno, horario y estado son requeridos'
            });
        }

        // Validar que el alumno existe y está activo
        const alumno = await Alumno.findById(alumnoId);
        if (!alumno || !alumno.isActive) {
            return res.status(404).json({
                success: false,
                message: 'El alumno no existe o no está activo'
            });
        }

        // Validar que el horario existe
        const horario = await Horario.findById(horarioId);
        if (!horario) {
            return res.status(404).json({
                success: false,
                message: 'El horario no existe'
            });
        }

        // Verificar que el alumno está inscrito en el horario
        const estaInscrito = horario.alumnosInscritos.some(
            inscripcion => {
                const alumnoIdInscrito = inscripcion.alumno._id 
                    ? inscripcion.alumno._id.toString() 
                    : inscripcion.alumno.toString();
                return alumnoIdInscrito === alumnoId.toString() && inscripcion.activo;
            }
        );

        if (!estaInscrito) {
            return res.status(400).json({
                success: false,
                message: 'El alumno no está inscrito en este horario'
            });
        }

        // Preparar fecha (usar hoy si no se proporciona)
        const fechaAsistencia = fecha ? new Date(fecha) : new Date();
        fechaAsistencia.setHours(0, 0, 0, 0);

        // Verificar si ya existe asistencia para este alumno, horario y fecha
        const asistenciaExistente = await Asistencia.findOne({
            alumno: alumnoId,
            horario: horarioId,
            fecha: fechaAsistencia
        });

        let asistencia;

        if (asistenciaExistente) {
            // Actualizar asistencia existente
            asistenciaExistente.estado = estado;
            asistenciaExistente.modificadoPor = req.user._id;
            asistenciaExistente.fechaModificacion = new Date();
            
            if (notas) asistenciaExistente.notas = notas;
            if (horaRegistro) asistenciaExistente.horaRegistro = horaRegistro;

            asistencia = await asistenciaExistente.save();
        } else {
            // Crear nueva asistencia
            asistencia = new Asistencia({
                alumno: alumnoId,
                horario: horarioId,
                instructor: req.user._id,
                fecha: fechaAsistencia,
                estado,
                notas,
                horaRegistro,
                registradoPor: req.user._id
            });

            await asistencia.save();
        }

        // Obtener asistencia con relaciones pobladas
        const asistenciaCompleta = await Asistencia.findById(asistencia._id)
            .populate('alumno', 'firstName lastName enrollment.studentId profilePhoto')
            .populate('horario', 'nombre dias horaInicio horaFin')
            .populate('instructor', 'name')
            .populate('registradoPor', 'name');

        res.status(asistenciaExistente ? 200 : 201).json({
            success: true,
            message: asistenciaExistente 
                ? 'Asistencia actualizada exitosamente' 
                : 'Asistencia registrada exitosamente',
            data: asistenciaCompleta.getPublicInfo()
        });
    } catch (error) {
        console.error('Error al marcar asistencia:', error);
        
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Ya existe un registro de asistencia para este alumno en esta fecha y horario'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error al marcar la asistencia',
            error: error.message
        });
    }
};

// ===== MARCAR ASISTENCIA GRUPAL (POR HORARIO) =====
exports.marcarAsistenciaGrupo = async (req, res) => {
    try {
        const { horarioId, fecha, asistencias } = req.body;

        // Validaciones
        if (!horarioId || !asistencias || !Array.isArray(asistencias)) {
            return res.status(400).json({
                success: false,
                message: 'Horario y lista de asistencias son requeridos'
            });
        }

        // Validar que el horario existe
        const horario = await Horario.findById(horarioId);
        if (!horario) {
            return res.status(404).json({
                success: false,
                message: 'El horario no existe'
            });
        }

        // Preparar fecha
        const fechaAsistencia = fecha ? new Date(fecha) : new Date();
        fechaAsistencia.setHours(0, 0, 0, 0);

        const resultados = [];
        const errores = [];

        // Procesar cada asistencia
        for (const item of asistencias) {
            try {
                const { alumnoId, estado, notas } = item;

                if (!alumnoId || !estado) {
                    errores.push({
                        alumnoId,
                        error: 'Alumno y estado son requeridos'
                    });
                    continue;
                }

                // Verificar si ya existe
                let asistencia = await Asistencia.findOne({
                    alumno: alumnoId,
                    horario: horarioId,
                    fecha: fechaAsistencia
                });

                if (asistencia) {
                    // Actualizar
                    asistencia.estado = estado;
                    asistencia.modificadoPor = req.user._id;
                    asistencia.fechaModificacion = new Date();
                    if (notas) asistencia.notas = notas;
                    await asistencia.save();
                } else {
                    // Crear
                    asistencia = new Asistencia({
                        alumno: alumnoId,
                        horario: horarioId,
                        instructor: req.user._id,
                        fecha: fechaAsistencia,
                        estado,
                        notas,
                        registradoPor: req.user._id
                    });
                    await asistencia.save();
                }

                resultados.push({
                    alumnoId,
                    success: true,
                    asistenciaId: asistencia._id
                });
            } catch (error) {
                errores.push({
                    alumnoId: item.alumnoId,
                    error: error.message
                });
            }
        }

        res.status(200).json({
            success: true,
            message: `Asistencias procesadas: ${resultados.length} exitosas, ${errores.length} errores`,
            data: {
                exitosas: resultados,
                errores: errores.length > 0 ? errores : undefined
            }
        });
    } catch (error) {
        console.error('Error al marcar asistencia grupal:', error);
        res.status(500).json({
            success: false,
            message: 'Error al marcar las asistencias',
            error: error.message
        });
    }
};

// ===== ACTUALIZAR ASISTENCIA =====
exports.updateAsistencia = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado, notas, horaRegistro } = req.body;

        const asistencia = await Asistencia.findById(id);
        if (!asistencia) {
            return res.status(404).json({
                success: false,
                message: 'Asistencia no encontrada'
            });
        }

        // Actualizar campos
        if (estado) asistencia.estado = estado;
        if (notas !== undefined) asistencia.notas = notas;
        if (horaRegistro) asistencia.horaRegistro = horaRegistro;

        asistencia.modificadoPor = req.user._id;
        asistencia.fechaModificacion = new Date();

        await asistencia.save();

        const asistenciaActualizada = await Asistencia.findById(id)
            .populate('alumno', 'firstName lastName enrollment.studentId profilePhoto')
            .populate('horario', 'nombre dias horaInicio horaFin')
            .populate('instructor', 'name')
            .populate('registradoPor', 'name')
            .populate('modificadoPor', 'name');

        res.status(200).json({
            success: true,
            message: 'Asistencia actualizada exitosamente',
            data: asistenciaActualizada.getPublicInfo()
        });
    } catch (error) {
        console.error('Error al actualizar asistencia:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar la asistencia',
            error: error.message
        });
    }
};

// ===== ELIMINAR ASISTENCIA =====
exports.deleteAsistencia = async (req, res) => {
    try {
        const { id } = req.params;

        const asistencia = await Asistencia.findById(id);
        if (!asistencia) {
            return res.status(404).json({
                success: false,
                message: 'Asistencia no encontrada'
            });
        }

        await asistencia.remove();

        res.status(200).json({
            success: true,
            message: 'Asistencia eliminada exitosamente'
        });
    } catch (error) {
        console.error('Error al eliminar asistencia:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar la asistencia',
            error: error.message
        });
    }
};

// ===== OBTENER ASISTENCIAS POR ALUMNO =====
exports.getAsistenciasByAlumno = async (req, res) => {
    try {
        const { alumnoId } = req.params;
        const { fechaInicio, fechaFin, estado, page = 1, limit = 20 } = req.query;

        // Validar que el alumno existe
        const alumno = await Alumno.findById(alumnoId);
        if (!alumno) {
            return res.status(404).json({
                success: false,
                message: 'Alumno no encontrado'
            });
        }

        // Construir filtros
        const filters = {};
        if (estado) filters.estado = estado;
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

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const asistencias = await Asistencia.findByAlumno(alumnoId, filters)
            .limit(parseInt(limit))
            .skip(skip);

        const total = await Asistencia.countDocuments({ alumno: alumnoId, ...filters });

        // Obtener estadísticas
        const estadisticas = await Asistencia.getEstadisticasAlumno(
            alumnoId,
            fechaInicio,
            fechaFin
        );

        res.status(200).json({
            success: true,
            data: asistencias,
            estadisticas,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error al obtener asistencias del alumno:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener asistencias',
            error: error.message
        });
    }
};

// ===== OBTENER ASISTENCIAS POR HORARIO =====
exports.getAsistenciasByHorario = async (req, res) => {
    try {
        const { horarioId } = req.params;
        const { fecha, estado } = req.query;

        // Validar que el horario existe
        const horario = await Horario.findById(horarioId);
        if (!horario) {
            return res.status(404).json({
                success: false,
                message: 'Horario no encontrado'
            });
        }

        // Construir filtros
        const filters = {};
        if (estado) filters.estado = estado;
        if (fecha) {
            const fechaBusqueda = new Date(fecha);
            fechaBusqueda.setHours(0, 0, 0, 0);
            
            const fechaFin = new Date(fecha);
            fechaFin.setHours(23, 59, 59, 999);

            filters.fecha = {
                $gte: fechaBusqueda,
                $lte: fechaFin
            };
        }

        const asistencias = await Asistencia.findByHorario(horarioId, filters);

        // Obtener estadísticas
        const estadisticas = await Asistencia.getEstadisticasHorario(
            horarioId,
            fecha
        );

        res.status(200).json({
            success: true,
            data: asistencias,
            estadisticas,
            total: asistencias.length
        });
    } catch (error) {
        console.error('Error al obtener asistencias del horario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener asistencias',
            error: error.message
        });
    }
};

// ===== OBTENER ASISTENCIAS POR FECHA =====
exports.getAsistenciasByFecha = async (req, res) => {
    try {
        const { fecha } = req.params;
        const { horario, sucursal, estado } = req.query;

        const filters = {};
        if (horario) filters.horario = horario;
        if (estado) filters.estado = estado;

        let asistencias = await Asistencia.findByFecha(fecha, filters);

        // Filtrar por sucursal si se proporciona
        if (sucursal) {
            asistencias = asistencias.filter(a => 
                a.horario && 
                a.horario.sucursal && 
                a.horario.sucursal.toString() === sucursal
            );
        }

        res.status(200).json({
            success: true,
            data: asistencias,
            total: asistencias.length
        });
    } catch (error) {
        console.error('Error al obtener asistencias por fecha:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener asistencias',
            error: error.message
        });
    }
};

// ===== OBTENER ESTADÍSTICAS GENERALES =====
exports.getEstadisticasGenerales = async (req, res) => {
    try {
        const { fechaInicio, fechaFin, sucursal, horario } = req.query;

        const matchStage = {};

        // Filtros de fecha
        if (fechaInicio || fechaFin) {
            matchStage.fecha = {};
            if (fechaInicio) {
                const inicio = new Date(fechaInicio);
                inicio.setHours(0, 0, 0, 0);
                matchStage.fecha.$gte = inicio;
            }
            if (fechaFin) {
                const fin = new Date(fechaFin);
                fin.setHours(23, 59, 59, 999);
                matchStage.fecha.$lte = fin;
            }
        }

        if (horario) matchStage.horario = new mongoose.Types.ObjectId(horario);

        // Pipeline de agregación
        let pipeline = [
            { $match: matchStage }
        ];

        // Si hay filtro por sucursal, hacer lookup
        if (sucursal) {
            pipeline.push(
                {
                    $lookup: {
                        from: 'horarios',
                        localField: 'horario',
                        foreignField: '_id',
                        as: 'horarioInfo'
                    }
                },
                {
                    $unwind: '$horarioInfo'
                },
                {
                    $match: {
                        'horarioInfo.sucursal': new mongoose.Types.ObjectId(sucursal)
                    }
                }
            );
        }

        // Agrupar por estado
        pipeline.push({
            $group: {
                _id: '$estado',
                count: { $sum: 1 }
            }
        });

        const stats = await Asistencia.aggregate(pipeline);

        // Procesar resultados
        const resultado = {
            total: 0,
            presente: 0,
            ausente: 0,
            justificado: 0,
            retardo: 0,
            porcentajeAsistencia: 0
        };

        stats.forEach(stat => {
            resultado[stat._id] = stat.count;
            resultado.total += stat.count;
        });

        if (resultado.total > 0) {
            resultado.porcentajeAsistencia = Math.round(
                ((resultado.presente + resultado.retardo) / resultado.total) * 100
            );
        }

        res.status(200).json({
            success: true,
            data: resultado
        });
    } catch (error) {
        console.error('Error al obtener estadísticas generales:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas',
            error: error.message
        });
    }
};