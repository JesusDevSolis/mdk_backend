const Examen = require('../models/Examen');
const Calificacion = require('../models/Calificacion');
const Graduacion = require('../models/Graduacion');
const Alumno = require('../models/Alumno');
const User = require('../models/User');
const Configuracion = require('../models/Configuracion');
const Payment     = require('../models/Payments'); // ✅ NUEVO
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

// ========================================
// ✅ NUEVO: OBTENER CONFIGURACIONES DE EXÁMENES
// ========================================
exports.getConfiguracionesExamenes = async (req, res) => {
    try {
        const calificacionMinima = await getConfigValue('examen_calificacion_minima', 60);
        const asistenciaMinima = await getConfigValue('examen_asistencia_minima', 75);
        const diasMinimosCinturon = await getConfigValue('examen_dias_minimos_cinturon', 90);
        const costoBase = await getConfigValue('examen_costo_base', 500);

        res.status(200).json({
            success: true,
            data: {
                calificacionMinima,
                asistenciaMinima,
                diasMinimosCinturon,
                costoBase
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

        const filters = { isActive: true };

        if (req.user.role === 'instructor' && req.user.sucursal) {
            filters.sucursal = req.user.sucursal;
        } else if (sucursal) {
            filters.sucursal = sucursal;
        }

        if (tipo) filters.tipo = tipo;
        if (estado) filters.estado = estado;
        if (cinturonObjetivo) filters.cinturonObjetivo = cinturonObjetivo;

        if (search) {
            filters.$or = [
                { nombre: { $regex: search, $options: 'i' } },
                { descripcion: { $regex: search, $options: 'i' } }
            ];
        }

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
        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const examenes = await Examen.find(filters)
            .populate('sucursal', 'name address')
            .populate('instructores', 'name email')
            .populate('creadoPor', 'name email')
            .sort(sort)
            .limit(parseInt(limit))
            .skip(skip)
            .lean();

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
            .populate('sucursal', 'name address')
            .populate('instructores', 'name email belt')
            .populate('alumnosInscritos.alumno', 'firstName lastName belt email enrollment.studentId')
            .populate('creadoPor', 'name email')
            .lean();

        if (!examen) {
            return res.status(404).json({
                success: false,
                message: 'Examen no encontrado'
            });
        }

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
// CREAR NUEVO EXAMEN (✅ INTEGRADO CON CONFIGURACIÓN)
// ========================================
exports.createExamen = async (req, res) => {
    try {
        // ✅ Obtener valores de configuración
        const costoBasePorDefecto = await getConfigValue('examen_costo_base', 500);
        const asistenciaMinimaDefecto = await getConfigValue('examen_asistencia_minima', 75);
        const diasMinimosCinturonDefecto = await getConfigValue('examen_dias_minimos_cinturon', 90);

        const examenData = {
            ...req.body,
            creadoPor: req.user._id,
            costoExamen: req.body.costoExamen || costoBasePorDefecto,
            requisitos: {
                asistenciaMinima: req.body.requisitos?.asistenciaMinima || asistenciaMinimaDefecto,
                diasMinimosCinturon: req.body.requisitos?.diasMinimosCinturon || diasMinimosCinturonDefecto,
                pagosAlCorriente: req.body.requisitos?.pagosAlCorriente !== undefined ? req.body.requisitos.pagosAlCorriente : true,
                costoExamen: req.body.requisitos?.costoExamen || costoBasePorDefecto
            }
        };

        const examen = new Examen(examenData);
        await examen.save();

        const examenCreado = await Examen.findById(examen._id)
            .populate('sucursal', 'name')
            .populate('instructores', 'name email')
            .lean();

        res.status(201).json({
            success: true,
            message: 'Examen creado exitosamente',
            data: examenCreado
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

        if (req.user.role === 'instructor' && req.user.sucursal) {
            if (examen.sucursal.toString() !== req.user.sucursal.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permiso para actualizar este examen'
                });
            }
        }

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
// ELIMINAR EXAMEN
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
// INSCRIBIR ALUMNO (✅ INTEGRADO CON CONFIGURACIÓN)
// ========================================
exports.inscribirAlumno = async (req, res) => {
    try {
        const { id } = req.params;
        const { alumnoId, descuento, autorizadoSinPago, motivoAutorizacion } = req.body;

        const examen = await Examen.findById(id);
        if (!examen) {
            return res.status(404).json({
                success: false,
                message: 'Examen no encontrado'
            });
        }

        const alumno = await Alumno.findById(alumnoId);
        if (!alumno) {
            return res.status(404).json({
                success: false,
                message: 'Alumno no encontrado'
            });
        }

        if (examen.tipo === 'graduacion' && examen.cinturonActualRequerido && !autorizadoSinPago) {
            if (alumno.belt.level !== examen.cinturonActualRequerido) {
                // Solo bloquear si cinturonActualRequerido está definido y no hay autorización
                // Advertir pero no bloquear — el admin puede inscribir con autorizarSinPago=true
                return res.status(400).json({
                    success: false,
                    message: `El alumno debe tener cinturón ${examen.cinturonActualRequerido} para inscribirse. Si desea inscribirlo de todas formas, active "Autorizar sin requisitos".`,
                    requisito: 'cinturon',
                    cinturonRequerido: examen.cinturonActualRequerido,
                    cinturonActual: alumno.belt.level
                });
            }
        }

        // ✅ Verificar requisitos con configuración
        const asistenciaMinima = await getConfigValue('examen_asistencia_minima', 75);
        const diasMinimosCinturon = await getConfigValue('examen_dias_minimos_cinturon', 90);

        const porcentajeAsistencia = alumno.stats?.attendancePercentage || 0;
        if (porcentajeAsistencia < asistenciaMinima && !autorizadoSinPago) {
            return res.status(400).json({
                success: false,
                message: `El alumno no cumple el requisito de asistencia mínima (${asistenciaMinima}%). Actual: ${porcentajeAsistencia}%`,
                requisito: 'asistencia',
                requerido: asistenciaMinima,
                actual: porcentajeAsistencia
            });
        }

        if (alumno.belt?.date) {
            const diasConCinturon = Math.floor((Date.now() - new Date(alumno.belt.date).getTime()) / (1000 * 60 * 60 * 24));
            if (diasConCinturon < diasMinimosCinturon && !autorizadoSinPago) {
                return res.status(400).json({
                    success: false,
                    message: `El alumno no cumple el requisito de días mínimos con el cinturón (${diasMinimosCinturon} días). Actual: ${diasConCinturon} días`,
                    requisito: 'diasCinturon',
                    requerido: diasMinimosCinturon,
                    actual: diasConCinturon
                });
            }
        }

        await examen.inscribirAlumno(alumnoId, {
            descuento: descuento || 0,
            autorizadoSinPago: autorizadoSinPago || false,
            autorizadoPor: autorizadoSinPago ? req.user._id : null,
            motivoAutorizacion: motivoAutorizacion || ''
        });

        // ── Crear pago pendiente si el examen tiene costo ──────────────────
        const costoExamen = Number(examen.requisitos?.costoExamen) || 0
        let pagoCreado = null
        let pagoError  = null
        if (costoExamen > 0) {
            try {
                const descuentoPct = Number(descuento) || 0
                const montoFinal   = Math.round((costoExamen - (costoExamen * descuentoPct / 100)) * 100) / 100

                const pagoExistente = await Payment.findOne({
                    alumno:    new mongoose.Types.ObjectId(alumnoId),
                    examenRef: new mongoose.Types.ObjectId(id),
                    isActive:  true
                })

                if (!pagoExistente) {
                    // Usar fecha del examen como dueDate (mínimo hoy para evitar estado vencido)
                    const hoy = new Date()
                    hoy.setHours(23, 59, 59, 0)
                    const fechaExamen = examen.fecha ? new Date(examen.fecha) : hoy
                    // Si la fecha ya pasó, usar mañana como dueDate
                    const dueDate = fechaExamen < new Date() ? hoy : fechaExamen

                    pagoCreado = await Payment.create({
                        alumno:      new mongoose.Types.ObjectId(alumnoId),
                        sucursal:    examen.sucursal,
                        type:        'examen',
                        description: `Pago de examen: ${examen.nombre}`,
                        amount:      montoFinal,
                        total:       montoFinal,
                        status:      'pendiente',
                        dueDate:     dueDate,
                        examenRef:   new mongoose.Types.ObjectId(id),
                        period: {
                            month: dueDate.getMonth() + 1,
                            year:  dueDate.getFullYear(),
                        },
                        createdBy: req.user._id,
                        isActive:  true,
                    })
                    console.log(`✅ Pago de examen creado: ${pagoCreado._id} para alumno ${alumnoId}`)
                } else {
                    console.log(`ℹ️  Ya existe pago de examen para alumno ${alumnoId}`)
                }
            } catch (pagoErr) {
                pagoError = pagoErr.message
                console.error('=== ERROR CREANDO PAGO DE EXAMEN ===')
                console.error('Mensaje:', pagoErr.message)
                if (pagoErr.errors) {
                    Object.keys(pagoErr.errors).forEach(k => {
                        console.error(`  Campo "${k}": ${pagoErr.errors[k].message}`)
                    })
                }
            }
        }

        const examenActualizado = await Examen.findById(id)
            .populate('alumnosInscritos.alumno', 'firstName lastName belt')
            .lean();

        res.status(200).json({
            success: true,
            message: pagoError
                ? `Alumno inscrito exitosamente (aviso: pago no generado — ${pagoError})`
                : 'Alumno inscrito exitosamente',
            pagoCreado: pagoCreado ? { id: pagoCreado._id, monto: pagoCreado.total } : null,
            data: examenActualizado
        });
    } catch (error) {
        console.error('Error al inscribir alumno:', error);
        res.status(500).json({
            success: false,
            message: 'Error al inscribir alumno',
            error: error.message
        });
    }
};

// ========================================
// DESINSCRIBIR ALUMNO
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

        if (examen.estado === 'completado') {
            return res.status(400).json({
                success: false,
                message: 'No se puede desinscribir alumnos de un examen completado'
            });
        }

        const inscripcion = examen.alumnosInscritos.find(i => i.alumno.toString() === alumnoId);
        if (!inscripcion) {
            return res.status(400).json({
                success: false,
                message: 'El alumno no está inscrito en este examen'
            });
        }

        if (inscripcion.calificado) {
            return res.status(400).json({
                success: false,
                message: 'No se puede desinscribir. El alumno ya tiene calificación registrada'
            });
        }

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
        const { id } = req.params;
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
// OBTENER ALUMNOS ELEGIBLES
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

        const filters = {
            isActive: true,
            'enrollment.sucursal': examen.sucursal
        };

        if (examen.tipo === 'graduacion') {
            filters['belt.level'] = examen.cinturonActualRequerido;
        }

        let alumnosElegibles = await Alumno.find(filters)
            .select('firstName lastName belt email phone enrollment stats')
            .lean();

        const alumnosInscritosIds = examen.alumnosInscritos.map(
            i => i.alumno.toString()
        );

        alumnosElegibles = alumnosElegibles.filter(
            alumno => !alumnosInscritosIds.includes(alumno._id.toString())
        );

        // ✅ Verificar requisitos con configuración
        const asistenciaMinima = await getConfigValue('examen_asistencia_minima', 75);
        const diasMinimosCinturon = await getConfigValue('examen_dias_minimos_cinturon', 90);

        const alumnosConRequisitos = alumnosElegibles.map((alumno) => {
            const porcentajeAsistencia = alumno.stats?.attendancePercentage || 0;
            const cumpleAsistencia = porcentajeAsistencia >= asistenciaMinima;

            let cumpleDiasCinturon = true;
            let diasConCinturon = 0;
            if (alumno.belt?.date) {
                diasConCinturon = Math.floor((Date.now() - new Date(alumno.belt.date).getTime()) / (1000 * 60 * 60 * 24));
                cumpleDiasCinturon = diasConCinturon >= diasMinimosCinturon;
            }

            return {
                ...alumno,
                cumpleRequisitos: cumpleAsistencia && cumpleDiasCinturon,
                requisitosDetalle: {
                    asistencia: {
                        cumple: cumpleAsistencia,
                        actual: porcentajeAsistencia,
                        requerido: asistenciaMinima
                    },
                    diasCinturon: {
                        cumple: cumpleDiasCinturon,
                        actual: diasConCinturon,
                        requerido: diasMinimosCinturon
                    }
                }
            };
        });

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
// CAMBIAR ESTADO
// ========================================
exports.cambiarEstado = async (req, res) => {
    try {
        const { id } = req.params;
        let { estado } = req.body;

        // Aceptar ambas variantes: 'en_curso' (frontend) y 'en_proceso' (legacy)
        const estadosValidos = ['programado', 'en_proceso', 'en_curso', 'completado', 'cancelado'];
        // Normalizar: en_curso → en_proceso para consistencia en BD
        if (estado === 'en_curso') estado = 'en_proceso';
        
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
// OBTENER ESTADÍSTICAS
// ========================================
exports.getEstadisticas = async (req, res) => {
    try {
        const { sucursal, fechaInicio, fechaFin } = req.query;

        const filters = { isActive: true };

        if (req.user.role === 'instructor' && req.user.sucursal) {
            filters.sucursal = req.user.sucursal;
        } else if (sucursal) {
            filters.sucursal = sucursal;
        }

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

// ========================================
// CALIFICAR ALUMNO (✅ INTEGRADO CON CONFIGURACIÓN)
// ========================================
exports.calificarAlumno = async (req, res) => {
    try {
        const { id } = req.params;
        const { alumnoId, calificaciones, calificacionFinal, aprobado } = req.body;

        if (!alumnoId) {
            return res.status(400).json({
                success: false,
                message: 'El ID del alumno es requerido'
            });
        }

        if (!calificaciones || !Array.isArray(calificaciones) || calificaciones.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Las calificaciones son requeridas'
            });
        }

        if (calificacionFinal === undefined || calificacionFinal === null) {
            return res.status(400).json({
                success: false,
                message: 'La calificación final es requerida'
            });
        }

        const examen = await Examen.findById(id);
        if (!examen) {
            return res.status(404).json({
                success: false,
                message: 'Examen no encontrado'
            });
        }

        const inscripcion = examen.alumnosInscritos.find(
            i => i.alumno.toString() === alumnoId.toString()
        );

        if (!inscripcion) {
            return res.status(400).json({
                success: false,
                message: 'El alumno no está inscrito en este examen'
            });
        }

        // ── Verificar pago si el examen tiene costo ─────────────────────────
        const costoExamen = examen.requisitos?.costoExamen || 0
        if (costoExamen > 0 && !inscripcion.autorizadoSinPago) {
            // Verificar contra Payment directamente (fuente de verdad)
            const pagoPendiente = await Payment.findOne({
                alumno:    alumnoId,
                examenRef: id,
                status:    'pagado',
                isActive:  true
            })
            // También verificar el flag en el subdocumento (para compatibilidad)
            const pagadoEnSubdoc = inscripcion.pagoExamen?.pagado || false

            if (!pagoPendiente && !pagadoEnSubdoc) {
                return res.status(400).json({
                    success: false,
                    message: `El alumno no ha pagado el examen ($${costoExamen}). Registra el pago en la sección Pagos antes de calificar.`,
                    codigo: 'PAGO_PENDIENTE'
                })
            }

            // Si el pago existe en Payment pero el subdocumento no está actualizado, sincronizar
            if (pagoPendiente && !pagadoEnSubdoc) {
                inscripcion.pagoExamen.pagado      = true
                inscripcion.pagoExamen.montoPagado = pagoPendiente.total || costoExamen
                inscripcion.pagoExamen.fechaPago   = pagoPendiente.paidDate || new Date()
                await examen.save()
            }
        }

        // ✅ Obtener calificación mínima de configuración
        const calificacionMinima = await getConfigValue('examen_calificacion_minima', 60);

        let calificacion = await Calificacion.findOne({
            examen: id,
            alumno: alumnoId
        });

        const calificacionData = {
            examen: id,
            alumno: alumnoId,
            evaluadoPor: req.user._id,
            fechaEvaluacion: Date.now(),
            calificacionesPorCategoria: calificaciones.map(cal => ({
                categoria: cal.categoria,
                calificacion: cal.puntuacion,
                peso: cal.peso,
                observaciones: cal.observaciones || ''
            })),
            calificacionFinal,
            resultado: calificacionFinal >= calificacionMinima ? 'aprobado' : 'reprobado',
            calificacionMinima,
            estado: 'finalizada'
        };

        if (calificacion) {
            Object.assign(calificacion, calificacionData);
            calificacion.modificadoPor = req.user._id;
            await calificacion.save();
        } else {
            calificacion = new Calificacion(calificacionData);
            await calificacion.save();
        }

        inscripcion.calificado = true;
        inscripcion.aprobado = calificacionFinal >= calificacionMinima;
        inscripcion.calificacionId = calificacion._id;
        
        examen.modificadoPor = req.user._id;
        await examen.save();

        const calificacionCompleta = await Calificacion.findById(calificacion._id)
            .populate('alumno', 'firstName lastName belt')
            .populate('evaluadoPor', 'name email');

        res.status(200).json({
            success: true,
            message: 'Calificación guardada exitosamente',
            data: calificacionCompleta
        });
    } catch (error) {
        console.error('Error al calificar alumno:', error);
        res.status(500).json({
            success: false,
            message: 'Error al calificar alumno',
            error: error.message
        });
    }
};

// ========================================
// OBTENER CALIFICACIÓN DE UN ALUMNO
// ========================================
exports.getCalificacionAlumno = async (req, res) => {
    try {
        const { id, alumnoId } = req.params;

        if (!alumnoId) {
            return res.status(400).json({
                success: false,
                message: 'El ID del alumno es requerido'
            });
        }

        const calificacion = await Calificacion.findOne({
            examen: id,
            alumno: alumnoId,
            isActive: true
        })
        .populate('alumno', 'firstName lastName belt')
        .populate('evaluadoPor', 'name email');

        if (!calificacion) {
            return res.status(404).json({
                success: false,
                message: 'No se encontró calificación para este alumno'
            });
        }

        res.status(200).json({
            success: true,
            data: calificacion
        });
    } catch (error) {
        console.error('Error al obtener calificación:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener calificación',
            error: error.message
        });
    }
};

// ========================================
// OBTENER TODAS LAS CALIFICACIONES DE UN EXAMEN
// ========================================
exports.getCalificacionesExamen = async (req, res) => {
    try {
        const { id } = req.params;

        const calificaciones = await Calificacion.find({
            examen: id,
            isActive: true
        })
        .populate('alumno', 'firstName lastName belt')
        .populate('evaluadoPor', 'name email')
        .sort({ calificacionFinal: -1 });

        // Enriquecer con datos de graduación para cada calificación aprobada
        const Graduacion = require('../models/Graduacion');
        const graduaciones = await Graduacion.find({ examen: id, isActive: true })
            .select('alumno cinturonNuevo estado _id')
            .lean();

        // Mapa alumnoId → graduación
        const gradMap = {};
        graduaciones.forEach(g => { gradMap[g.alumno.toString()] = g; });

        const calificacionesEnriquecidas = calificaciones.map(c => {
            const obj = c.toObject ? c.toObject() : { ...c };
            const grad = gradMap[obj.alumno?._id?.toString()];
            if (grad) {
                obj.graduacionId  = grad._id;
                obj.cinturonNuevo = grad.cinturonNuevo;
                obj.graduado      = true;
            } else {
                obj.graduado = false;
            }
            return obj;
        });

        const estadisticas = await Calificacion.getEstadisticasExamen(id);

        res.status(200).json({
            success: true,
            data: {
                calificaciones: calificacionesEnriquecidas,
                estadisticas
            }
        });
    } catch (error) {
        console.error('Error al obtener calificaciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener calificaciones',
            error: error.message
        });
    }
};

module.exports = exports;
// ========================================
// SINCRONIZAR PAGOS DE ALUMNOS INSCRITOS
// Crea pagos pendientes para alumnos inscritos que no los tienen aún
// ========================================
exports.sincronizarPagos = async (req, res) => {
    try {
        const { id } = req.params;

        const examen = await Examen.findById(id)
            .populate('alumnosInscritos.alumno', 'firstName lastName enrollment.sucursal')

        if (!examen) {
            return res.status(404).json({ success: false, message: 'Examen no encontrado' })
        }

        const costoExamen = examen.requisitos?.costoExamen || 0
        if (costoExamen === 0) {
            return res.status(200).json({
                success: true,
                message: 'Este examen no tiene costo, no se requieren pagos',
                creados: 0
            })
        }

        const fechaExamen = examen.fecha ? new Date(examen.fecha) : new Date()
        let creados = 0
        const errores = []

        for (const inscripcion of examen.alumnosInscritos) {
            const alumnoId = inscripcion.alumno?._id || inscripcion.alumno
            if (!alumnoId) continue

            try {
                const yaExiste = await Payment.findOne({
                    alumno: alumnoId,
                    examenRef: id,
                    isActive: true
                })

                if (!yaExiste) {
                    const mongoose = require('mongoose')
                    const descPct  = Number(inscripcion.pagoExamen?.descuentoAplicado) || 0
                    const monto    = Math.round((costoExamen - (costoExamen * descPct / 100)) * 100) / 100
                    // dueDate: si la fecha del examen ya pasó, usar hoy al final del día
                    const hoy = new Date()
                    hoy.setHours(23, 59, 59, 0)
                    const dueDate = fechaExamen < new Date() ? hoy : fechaExamen
                    const sucursalPago = examen.sucursal 
                        || inscripcion.alumno?.enrollment?.sucursal
                        || null
                    await Payment.create({
                        alumno:      new mongoose.Types.ObjectId(alumnoId.toString()),
                        sucursal:    sucursalPago,
                        type:        'examen',
                        description: `Pago de examen: ${examen.nombre}`,
                        amount:      monto,
                        total:       monto,
                        status:      inscripcion.pagoExamen?.pagado ? 'pagado' : 'pendiente',
                        dueDate:     dueDate,
                        examenRef:   new mongoose.Types.ObjectId(id),
                        period: {
                            month: dueDate.getMonth() + 1,
                            year:  dueDate.getFullYear(),
                        },
                        createdBy: req.user._id,
                        isActive:  true,
                    })
                    creados++
                    console.log(`✅ Pago sincronizado para alumno ${alumnoId}`)
                }
            } catch (err) {
                errores.push({ alumnoId, error: err.message })
            }
        }

        res.status(200).json({
            success: true,
            message: `${creados} pago(s) creado(s)${errores.length ? `, ${errores.length} error(es)` : ''}`,
            creados,
            errores
        })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}