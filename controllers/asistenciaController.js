const Asistencia = require('../models/Asistencia');
const Alumno = require('../models/Alumno');
const Horario = require('../models/Horario');
const User = require('../models/User');
const Configuracion = require('../models/Configuracion'); // ✅ NUEVO
const mongoose = require('mongoose');

// ✅ NUEVO: Función helper para obtener valores de configuración
const getConfigValue = async (clave, valorDefecto) => {
    try {
        return await Configuracion.getValor(clave, valorDefecto);
    } catch (error) {
        console.warn(`No se pudo obtener configuración ${clave}, usando valor por defecto:`, valorDefecto);
        return valorDefecto;
    }
};

// ✅ NUEVO: Función para determinar estado automáticamente según hora de llegada
const determinarEstadoAsistencia = async (horaRegistro, horaInicioClase) => {
    try {
        // Obtener tolerancia de configuración
        const toleranciaMinutos = await getConfigValue('asistencia_tolerancia_retardo', 15);

        // Convertir horas a minutos desde medianoche para comparar
        const [horaR, minR] = horaRegistro.split(':').map(Number);
        const [horaI, minI] = horaInicioClase.split(':').map(Number);

        const minutosRegistro = horaR * 60 + minR;
        const minutosInicio = horaI * 60 + minI;

        const diferencia = minutosRegistro - minutosInicio;

        // Determinar estado
        if (diferencia <= 0) {
            return 'presente'; // Llegó a tiempo o antes
        } else if (diferencia <= toleranciaMinutos) {
            return 'retardo'; // Llegó con retardo dentro de tolerancia
        } else {
            return 'ausente'; // Llegó demasiado tarde (fuera de tolerancia)
        }

    } catch (error) {
        console.error('Error al determinar estado:', error);
        return 'presente'; // Default en caso de error
    }
};

// ========================================
// ✅ NUEVO: OBTENER CONFIGURACIONES DE ASISTENCIAS
// ========================================
exports.getConfiguracionesAsistencias = async (req, res) => {
    try {
        const toleranciaRetardo = await getConfigValue('asistencia_tolerancia_retardo', 15);
        const diasJustificar = await getConfigValue('asistencia_dias_justificar', 3);
        const requiereJustificante = await getConfigValue('asistencia_requiere_justificante', false);

        res.status(200).json({
            success: true,
            data: {
                toleranciaRetardo,
                diasJustificar,
                requiereJustificante
            }
        });
    } catch (error) {
        console.error('Error al obtener configuraciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener configuraciones',
            error: error.message
        });
    }
};

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

        const filters = {};

        if (alumno) filters.alumno = alumno;
        if (horario) filters.horario = horario;
        if (instructor) filters.instructor = instructor;
        if (estado) filters.estado = estado;

        // Filtrar por instructor si no es admin
        if (req.user.role === 'instructor') {
            const horariosInstructor = await Horario.find({ 
                instructor: req.user._id,
                isActive: true 
            }).select('_id');
            
            const horarioIds = horariosInstructor.map(h => h._id);
            
            if (horarioIds.length > 0) {
                filters.horario = { $in: horarioIds };
            } else {
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

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

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

        const total = await Asistencia.countDocuments(filters);
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

// ===== MARCAR ASISTENCIA INDIVIDUAL (✅ INTEGRADO CON TOLERANCIA) =====
exports.marcarAsistencia = async (req, res) => {
    try {
        const { alumnoId, horarioId, fecha, estado, notas, horaRegistro } = req.body;

        // Validaciones
        if (!alumnoId || !horarioId) {
            return res.status(400).json({
                success: false,
                message: 'Alumno y horario son requeridos'
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

        // Preparar fecha
        const fechaAsistencia = fecha ? new Date(fecha) : new Date();
        fechaAsistencia.setHours(0, 0, 0, 0);

        // ✅ INTEGRACIÓN: Determinar estado automáticamente si se proporciona horaRegistro
        let estadoFinal = estado;
        if (horaRegistro && horario.horaInicio && !estado) {
            estadoFinal = await determinarEstadoAsistencia(horaRegistro, horario.horaInicio);
        }

        // Si aún no hay estado, se requiere
        if (!estadoFinal) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere especificar el estado o proporcionar la hora de registro'
            });
        }

        // Verificar si ya existe asistencia
        const asistenciaExistente = await Asistencia.findOne({
            alumno: alumnoId,
            horario: horarioId,
            fecha: fechaAsistencia
        });

        let asistencia;

        if (asistenciaExistente) {
            asistenciaExistente.estado = estadoFinal;
            asistenciaExistente.modificadoPor = req.user._id;
            asistenciaExistente.fechaModificacion = new Date();
            
            if (notas) asistenciaExistente.notas = notas;
            if (horaRegistro) asistenciaExistente.horaRegistro = horaRegistro;

            asistencia = await asistenciaExistente.save();
        } else {
            asistencia = new Asistencia({
                alumno: alumnoId,
                horario: horarioId,
                instructor: req.user._id,
                fecha: fechaAsistencia,
                estado: estadoFinal,
                notas,
                horaRegistro,
                registradoPor: req.user._id
            });

            await asistencia.save();
        }

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

// ===== MARCAR ASISTENCIA GRUPAL (✅ INTEGRADO CON TOLERANCIA) =====
exports.marcarAsistenciaGrupo = async (req, res) => {
    try {
        const { horarioId, fecha, asistencias } = req.body;

        if (!horarioId || !asistencias || !Array.isArray(asistencias)) {
            return res.status(400).json({
                success: false,
                message: 'Horario y lista de asistencias son requeridos'
            });
        }

        const horario = await Horario.findById(horarioId);
        if (!horario) {
            return res.status(404).json({
                success: false,
                message: 'El horario no existe'
            });
        }

        const fechaAsistencia = fecha ? new Date(fecha) : new Date();
        fechaAsistencia.setHours(0, 0, 0, 0);

        const resultados = [];
        const errores = [];

        for (const item of asistencias) {
            try {
                const { alumnoId, estado, notas, horaRegistro } = item;

                if (!alumnoId) {
                    errores.push({
                        alumnoId,
                        error: 'ID de alumno requerido'
                    });
                    continue;
                }

                // ✅ INTEGRACIÓN: Determinar estado automáticamente
                let estadoFinal = estado;
                if (horaRegistro && horario.horaInicio && !estado) {
                    estadoFinal = await determinarEstadoAsistencia(horaRegistro, horario.horaInicio);
                }

                if (!estadoFinal) {
                    errores.push({
                        alumnoId,
                        error: 'Estado o hora de registro requeridos'
                    });
                    continue;
                }

                const asistenciaExistente = await Asistencia.findOne({
                    alumno: alumnoId,
                    horario: horarioId,
                    fecha: fechaAsistencia
                });

                let asistencia;

                if (asistenciaExistente) {
                    asistenciaExistente.estado = estadoFinal;
                    asistenciaExistente.modificadoPor = req.user._id;
                    asistenciaExistente.fechaModificacion = new Date();
                    
                    if (notas) asistenciaExistente.notas = notas;
                    if (horaRegistro) asistenciaExistente.horaRegistro = horaRegistro;

                    asistencia = await asistenciaExistente.save();
                } else {
                    asistencia = new Asistencia({
                        alumno: alumnoId,
                        horario: horarioId,
                        instructor: req.user._id,
                        fecha: fechaAsistencia,
                        estado: estadoFinal,
                        notas,
                        horaRegistro,
                        registradoPor: req.user._id
                    });

                    await asistencia.save();
                }

                resultados.push({
                    alumnoId,
                    asistenciaId: asistencia._id,
                    estado: estadoFinal,
                    success: true
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
            message: `Asistencias procesadas: ${resultados.length} exitosas, ${errores.length} con errores`,
            data: {
                exitosas: resultados,
                errores: errores
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
        const { estado, notas, horaRegistro, justificacion } = req.body;

        const asistencia = await Asistencia.findById(id);

        if (!asistencia) {
            return res.status(404).json({
                success: false,
                message: 'Asistencia no encontrada'
            });
        }

        if (estado) asistencia.estado = estado;
        if (notas !== undefined) asistencia.notas = notas;
        if (horaRegistro) asistencia.horaRegistro = horaRegistro;
        if (justificacion) {
            asistencia.justificacion = {
                motivo: justificacion.motivo,
                documento: justificacion.documento,
                aprobadoPor: req.user._id,
                fechaAprobacion: new Date()
            };
        }

        asistencia.modificadoPor = req.user._id;
        asistencia.fechaModificacion = new Date();

        await asistencia.save();

        const asistenciaActualizada = await Asistencia.findById(id)
            .populate('alumno', 'firstName lastName enrollment.studentId')
            .populate('horario', 'nombre dias horaInicio horaFin')
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

        const asistencia = await Asistencia.findByIdAndDelete(id);

        if (!asistencia) {
            return res.status(404).json({
                success: false,
                message: 'Asistencia no encontrada'
            });
        }

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
        const { fechaInicio, fechaFin, horario } = req.query;

        const filters = { alumno: alumnoId };

        if (horario) filters.horario = horario;

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

        const asistencias = await Asistencia.find(filters)
            .populate('horario', 'nombre dias horaInicio horaFin')
            .populate('instructor', 'name')
            .sort({ fecha: -1 })
            .lean();

        const estadisticas = {
            total: asistencias.length,
            presente: asistencias.filter(a => a.estado === 'presente').length,
            retardo: asistencias.filter(a => a.estado === 'retardo').length,
            ausente: asistencias.filter(a => a.estado === 'ausente').length,
            justificada: asistencias.filter(a => a.estado === 'justificada').length,
            porcentajeAsistencia: asistencias.length > 0 
                ? ((asistencias.filter(a => a.estado === 'presente' || a.estado === 'retardo').length / asistencias.length) * 100).toFixed(2)
                : 0
        };

        res.status(200).json({
            success: true,
            data: asistencias,
            estadisticas
        });
    } catch (error) {
        console.error('Error al obtener asistencias por alumno:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener asistencias del alumno',
            error: error.message
        });
    }
};

// ===== OBTENER ASISTENCIAS POR HORARIO =====
exports.getAsistenciasByHorario = async (req, res) => {
    try {
        const { horarioId } = req.params;
        const { fecha } = req.query;

        const filters = { horario: horarioId };

        if (fecha) {
            const fechaBusqueda = new Date(fecha);
            fechaBusqueda.setHours(0, 0, 0, 0);
            filters.fecha = fechaBusqueda;
        }

        const asistencias = await Asistencia.find(filters)
            .populate('alumno', 'firstName lastName enrollment.studentId profilePhoto')
            .populate('instructor', 'name')
            .populate('registradoPor', 'name')
            .sort({ fecha: -1 })
            .lean();

        res.status(200).json({
            success: true,
            data: asistencias,
            count: asistencias.length
        });
    } catch (error) {
        console.error('Error al obtener asistencias por horario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener asistencias del horario',
            error: error.message
        });
    }
};

// ===== OBTENER ASISTENCIAS POR FECHA =====
exports.getAsistenciasByFecha = async (req, res) => {
    try {
        const { fecha } = req.params;

        const fechaBusqueda = new Date(fecha);
        fechaBusqueda.setHours(0, 0, 0, 0);

        const asistencias = await Asistencia.find({ fecha: fechaBusqueda })
            .populate('alumno', 'firstName lastName enrollment.studentId profilePhoto')
            .populate('horario', 'nombre dias horaInicio horaFin sucursal')
            .populate('instructor', 'name')
            .sort({ 'horario.horaInicio': 1 })
            .lean();

        res.status(200).json({
            success: true,
            data: asistencias,
            count: asistencias.length
        });
    } catch (error) {
        console.error('Error al obtener asistencias por fecha:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener asistencias de la fecha',
            error: error.message
        });
    }
};

// ===== OBTENER ESTADÍSTICAS GENERALES =====
exports.getEstadisticasGenerales = async (req, res) => {
    try {
        const { sucursal, fechaInicio, fechaFin } = req.query;

        const filters = {};

        if (fechaInicio || fechaFin) {
            filters.fecha = {};
            if (fechaInicio) filters.fecha.$gte = new Date(fechaInicio);
            if (fechaFin) filters.fecha.$lte = new Date(fechaFin);
        }

        const asistencias = await Asistencia.find(filters).lean();

        const estadisticas = {
            total: asistencias.length,
            porEstado: {
                presente: asistencias.filter(a => a.estado === 'presente').length,
                retardo: asistencias.filter(a => a.estado === 'retardo').length,
                ausente: asistencias.filter(a => a.estado === 'ausente').length,
                justificada: asistencias.filter(a => a.estado === 'justificada').length
            },
            porcentajeAsistencia: asistencias.length > 0
                ? ((asistencias.filter(a => a.estado === 'presente' || a.estado === 'retardo').length / asistencias.length) * 100).toFixed(2)
                : 0
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