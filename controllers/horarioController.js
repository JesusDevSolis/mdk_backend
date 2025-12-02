const Horario = require('../models/Horario');
const User = require('../models/User');
const Alumno = require('../models/Alumno');
const Sucursal = require('../models/Sucursal');
const mongoose = require('mongoose');

// ===== OBTENER TODOS LOS HORARIOS =====
exports.getAllHorarios = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            sucursal, 
            instructor, 
            dia,
            nivel,
            estado = 'activo',
            search,
            sortBy = 'dias',
            sortOrder = 'asc'
        } = req.query;

        // Construir filtros
        const filters = { isActive: true };

        if (sucursal) filters.sucursal = sucursal;
        if (instructor) filters.instructor = instructor;
        if (dia) filters.dias = dia;
        if (nivel) filters.nivel = nivel;
        if (estado) filters.estado = estado;

        // Búsqueda por nombre
        if (search) {
            filters.$or = [
                { nombre: { $regex: search, $options: 'i' } },
                { descripcion: { $regex: search, $options: 'i' } },
                { salon: { $regex: search, $options: 'i' } }
            ];
        }

        // Calcular skip para paginación
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Construir sort
        const sortOptions = {};
        if (sortBy === 'dia' || sortBy === 'dias') {
            // Orden personalizado para días de la semana
            sortOptions.dias = 1;
            sortOptions.horaInicio = 1;
        } else {
            sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
        }

        // Ejecutar query con paginación
        const horarios = await Horario.find(filters)
                                    .populate('sucursal', 'name address phone')
                                    .populate('instructor', 'name email phone instructorInfo.belt')
                                    .populate('alumnosInscritos.alumno', 'firstName lastName enrollment.studentId profilePhoto')
                                    .populate('createdBy', 'name email')
                                    .sort(sortOptions)
                                    .limit(parseInt(limit))
                                    .skip(skip)
                                    .lean();

        // Contar total de documentos
        const total = await Horario.countDocuments(filters);

        // Calcular información de paginación
        const totalPages = Math.ceil(total / parseInt(limit));
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        // ✅ CORREGIDO: Agregar virtuals manualmente (porque usamos .lean())
        const horariosConVirtuals = horarios.map(h => {
            const inscritosActivos = (h.alumnosInscritos || []).filter(a => a.activo).length;
            const capacidad = h.capacidadMaxima || 0;
            const disponibles = Math.max(0, capacidad - inscritosActivos);
            const porcentaje = capacidad > 0 ? Math.round((inscritosActivos / capacidad) * 100) : 0;
            
            return {
                ...h,
                duracionMinutos: calcularDuracion(h.horaInicio, h.horaFin),
                numeroInscritos: inscritosActivos,
                lugaresDisponibles: disponibles,
                porcentajeOcupacion: porcentaje, // ✅ AGREGADO
                estaLleno: disponibles === 0 // ✅ AGREGADO
            };
        });

        res.status(200).json({
            success: true,
            data: horariosConVirtuals,
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
        console.error('Error al obtener horarios:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener los horarios',
            error: error.message
        });
    }
};

// ===== OBTENER HORARIO POR ID =====
exports.getHorarioById = async (req, res) => {
    try {
        const { id } = req.params;

        const horario = await Horario.findById(id)
                                        .populate('sucursal', 'name address phone email')
                                        .populate('instructor', 'name email phone instructorInfo')
                                        .populate('alumnosInscritos.alumno', 'firstName lastName enrollment.studentId email phone profilePhoto belt')
                                        .populate('createdBy', 'name email')
                                        .populate('lastModifiedBy', 'name email');

        if (!horario) {
            return res.status(404).json({
                success: false,
                message: 'Horario no encontrado'
            });
        }

        // 🔍 DEBUG: Verificar datos antes de getPublicInfo
        const inscritosActivos = horario.alumnosInscritos.filter(a => a.activo).length;
        console.log('🔍 DEBUG getHorarioById:');
        console.log('  - ID:', id);
        console.log('  - Alumnos inscritos activos:', inscritosActivos);
        console.log('  - Capacidad:', horario.capacidadMaxima);
        console.log('  - Llamando a getPublicInfo()...');
        
        const publicInfo = horario.getPublicInfo();
        
        console.log('  - porcentajeOcupacion devuelto:', publicInfo.porcentajeOcupacion);
        console.log('  - numeroInscritos devuelto:', publicInfo.numeroInscritos);

        res.status(200).json({
            success: true,
            data: publicInfo
        });
    } catch (error) {
        console.error('Error al obtener horario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el horario',
            error: error.message
        });
    }
};

// ===== CREAR NUEVO HORARIO =====
exports.createHorario = async (req, res) => {
    try {
        const horarioData = {
            ...req.body,
            createdBy: req.user._id
        };

        // Validar que la sucursal existe
        if (horarioData.sucursal) {
            const sucursal = await Sucursal.findById(horarioData.sucursal);
            if (!sucursal) {
                return res.status(404).json({
                success: false,
                message: 'La sucursal especificada no existe'
                });
            }
        }

        // Validar que el instructor existe y es activo
        if (horarioData.instructor) {
            const instructor = await User.findOne({
                _id: horarioData.instructor,
                role: 'instructor',
                isActive: true
            });

            if (!instructor) {
                return res.status(404).json({
                success: false,
                message: 'El instructor especificado no existe o no está activo'
                });
            }
        }

        // Crear el horario
        const nuevoHorario = new Horario(horarioData);
        await nuevoHorario.save();

        // Obtener el horario con las relaciones pobladas
        const horario = await Horario.findById(nuevoHorario._id)
                                        .populate('sucursal', 'name address')
                                        .populate('instructor', 'name email instructorInfo.belt');

        res.status(201).json({
            success: true,
            message: 'Horario creado exitosamente',
            data: horario.getPublicInfo()
        });
    } catch (error) {
        console.error('Error al crear horario:', error);
        
        // Manejar errores de validación de Mongoose
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Error de validación',
                errors: Object.values(error.errors).map(err => err.message)
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error al crear el horario',
            error: error.message
        });
    }
};

// ===== ACTUALIZAR HORARIO =====
exports.updateHorario = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { 
            ...req.body,
            lastModifiedBy: req.user._id
        };

        // Verificar que el horario existe
        const horario = await Horario.findById(id);
        if (!horario) {
            return res.status(404).json({
                success: false,
                message: 'Horario no encontrado'
            });
        }

        // Validar sucursal si se actualiza
        if (updateData.sucursal && updateData.sucursal !== horario.sucursal.toString()) {
        const sucursal = await Sucursal.findById(updateData.sucursal);
            if (!sucursal) {
                return res.status(404).json({
                success: false,
                message: 'La sucursal especificada no existe'
                });
            }
        }

        // Validar instructor si se actualiza
        if (updateData.instructor && updateData.instructor !== horario.instructor.toString()) {
            const instructor = await User.findOne({
                _id: updateData.instructor,
                role: 'instructor',
                isActive: true
            });

            if (!instructor) {
                return res.status(404).json({
                    success: false,
                    message: 'El instructor especificado no existe o no está activo'
                });
            }
        }

        // Actualizar el horario
        // RETROCOMPATIBILIDAD: Si viene 'dia' (singular), convertir a 'dias' (array)
        if (updateData.dia && !updateData.dias) {
            updateData.dias = [updateData.dia];
            delete updateData.dia; // Eliminar el campo viejo
        }

        // Si viene 'dias' pero está vacío y hay 'dia', usar 'dia'
        if ((!updateData.dias || updateData.dias.length === 0) && updateData.dia) {
            updateData.dias = [updateData.dia];
            delete updateData.dia;
        }

        // Actualizar el horario
        const horarioActualizado = await Horario.findByIdAndUpdate(
            id,
            updateData,
            { 
                new: true, 
                runValidators: true 
            }
        )
        .populate('sucursal', 'name address')
        .populate('instructor', 'name email instructorInfo.belt')
        .populate('alumnosInscritos.alumno', 'firstName lastName enrollment.studentId');

        res.status(200).json({
            success: true,
            message: 'Horario actualizado exitosamente',
            data: horarioActualizado.getPublicInfo()
        });
    } catch (error) {
        console.error('Error al actualizar horario:', error);
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Error de validación',
                errors: Object.values(error.errors).map(err => err.message)
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error al actualizar el horario',
            error: error.message
        });
    }
};

// ===== ELIMINAR HORARIO (SOFT DELETE) =====
exports.deleteHorario = async (req, res) => {
    try {
        const { id } = req.params;

        const horario = await Horario.findById(id);
        if (!horario) {
            return res.status(404).json({
                success: false,
                message: 'Horario no encontrado'
            });
        }

        // Verificar si tiene alumnos inscritos activos
        const alumnosActivos = horario.alumnosInscritos.filter(a => a.activo).length;
        if (alumnosActivos > 0) {
            return res.status(400).json({
                success: false,
                message: `No se puede eliminar el horario porque tiene ${alumnosActivos} alumno(s) inscrito(s). Primero desinscribe a los alumnos o cambia el estado a "cancelado".`
            });
        }

        // Soft delete
        horario.isActive = false;
        horario.estado = 'cancelado';
        horario.lastModifiedBy = req.user._id;
        await horario.save();

        res.status(200).json({
            success: true,
            message: 'Horario eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error al eliminar horario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar el horario',
            error: error.message
        });
    }
};

// ===== INSCRIBIR ALUMNO EN HORARIO =====
exports.inscribirAlumno = async (req, res) => {
    try {
        const { id } = req.params; // ID del horario
        const { alumnoId } = req.body;

        if (!alumnoId) {
            return res.status(400).json({
                success: false,
                message: 'El ID del alumno es requerido'
            });
        }

        const horario = await Horario.findById(id);
        if (!horario) {
            return res.status(404).json({
                success: false,
                message: 'Horario no encontrado'
            });
        }

        // Usar el método del modelo
        await horario.inscribirAlumno(alumnoId);

        // Obtener el horario actualizado con las relaciones
        const horarioActualizado = await Horario.findById(id)
                                                .populate('sucursal', 'name')
                                                .populate('instructor', 'name')
                                                .populate('alumnosInscritos.alumno', 'firstName lastName enrollment.studentId');

        res.status(200).json({
            success: true,
            message: 'Alumno inscrito exitosamente',
            data: horarioActualizado.getPublicInfo()
        });
    } catch (error) {
        console.error('Error al inscribir alumno:', error);
        
        // Errores específicos del método inscribirAlumno
        if (error.message.includes('lleno') || error.message.includes('inscrito')) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error al inscribir al alumno',
            error: error.message
        });
    }
};

// ===== DESINSCRIBIR ALUMNO DE HORARIO =====
exports.desinscribirAlumno = async (req, res) => {
    try {
        const { id, alumnoId } = req.params;

        const horario = await Horario.findById(id);
        if (!horario) {
            return res.status(404).json({
                success: false,
                message: 'Horario no encontrado'
            });
        }

        // Usar el método del modelo
        await horario.desinscribirAlumno(alumnoId);

        // Obtener el horario actualizado
        const horarioActualizado = await Horario.findById(id)
        .populate('sucursal', 'name')
        .populate('instructor', 'name')
        .populate('alumnosInscritos.alumno', 'firstName lastName enrollment.studentId');

        res.status(200).json({
            success: true,
            message: 'Alumno desinscrito exitosamente',
            data: horarioActualizado.getPublicInfo()
        });
    } catch (error) {
        console.error('Error al desinscribir alumno:', error);
        
        if (error.message.includes('no está inscrito')) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error al desinscribir al alumno',
            error: error.message
        });
    }
};

// ===== OBTENER HORARIOS POR SUCURSAL =====
exports.getHorariosBySucursal = async (req, res) => {
    try {
        const { sucursalId } = req.params;

        // Verificar que la sucursal existe
        const sucursal = await Sucursal.findById(sucursalId);
        if (!sucursal) {
            return res.status(404).json({
                success: false,
                message: 'Sucursal no encontrada'
            });
        }

        const horarios = await Horario.findBySucursal(sucursalId);

        res.status(200).json({
            success: true,
            data: horarios,
            total: horarios.length
        });
    } catch (error) {
        console.error('Error al obtener horarios por sucursal:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener horarios',
            error: error.message
        });
    }
};

// ===== OBTENER HORARIOS POR INSTRUCTOR =====
exports.getHorariosByInstructor = async (req, res) => {
    try {
        const { instructorId } = req.params;

        // Verificar que el instructor existe
        const instructor = await User.findOne({
            _id: instructorId,
            role: 'instructor'
        });

        if (!instructor) {
            return res.status(404).json({
                success: false,
                message: 'Instructor no encontrado'
            });
        }

        const horarios = await Horario.findByInstructor(instructorId);

        res.status(200).json({
            success: true,
            data: horarios,
            total: horarios.length
        });
    } catch (error) {
        console.error('Error al obtener horarios por instructor:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener horarios',
            error: error.message
        });
    }
};

// ===== OBTENER HORARIOS POR DÍA =====
exports.getHorariosByDia = async (req, res) => {
    try {
        const { dia } = req.params;
        const { sucursal, nivel } = req.query;

        const filters = {};
        if (sucursal) filters.sucursal = sucursal;
        if (nivel) filters.nivel = nivel;

        const horarios = await Horario.findByDia(dia, filters);

        res.status(200).json({
            success: true,
            data: horarios,
            total: horarios.length
        });
    } catch (error) {
        console.error('Error al obtener horarios por día:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener horarios',
            error: error.message
        });
    }
};

// ===== OBTENER HORARIOS DISPONIBLES =====
exports.getHorariosDisponibles = async (req, res) => {
    try {
        const { sucursal, nivel, dia } = req.query;

        const filters = {};
        if (sucursal) filters.sucursal = mongoose.Types.ObjectId(sucursal);
        if (nivel) filters.nivel = nivel;
        if (dia) filters.dia = dia;

        const horarios = await Horario.findAvailable(filters);

        // Populate manualmente después del aggregate
        await Horario.populate(horarios, [
            { path: 'sucursal', select: 'name address' },
            { path: 'instructor', select: 'name email' }
        ]);

        res.status(200).json({
            success: true,
            data: horarios,
            total: horarios.length
        });
    } catch (error) {
        console.error('Error al obtener horarios disponibles:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener horarios disponibles',
            error: error.message
        });
    }
};

// ===== OBTENER ESTADÍSTICAS DE HORARIOS =====
exports.getHorariosStats = async (req, res) => {
    try {
        const { sucursal, instructor } = req.query;

        const filters = {};
        if (sucursal) filters.sucursal = mongoose.Types.ObjectId(sucursal);
        if (instructor) filters.instructor = mongoose.Types.ObjectId(instructor);

        const stats = await Horario.getStats(filters);

        res.status(200).json({
            success: true,
            data: stats
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

// ===== CAMBIAR ESTADO DE HORARIO =====
exports.cambiarEstadoHorario = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        const estadosValidos = ['activo', 'suspendido', 'cancelado', 'finalizado'];
        if (!estadosValidos.includes(estado)) {
            return res.status(400).json({
                success: false,
                message: 'Estado no válido'
            });
        }

        const horario = await Horario.findById(id);
        if (!horario) {
            return res.status(404).json({
                success: false,
                message: 'Horario no encontrado'
            });
        }

        horario.estado = estado;
        horario.lastModifiedBy = req.user._id;
        await horario.save();

        const horarioActualizado = await Horario.findById(id)
        .populate('sucursal', 'name')
        .populate('instructor', 'name');

        res.status(200).json({
            success: true,
            message: `Horario ${estado} exitosamente`,
            data: horarioActualizado.getPublicInfo()
        });
    } catch (error) {
        console.error('Error al cambiar estado:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cambiar estado del horario',
            error: error.message
        });
    }
};

// ===== FUNCIÓN AUXILIAR: Calcular duración =====
function calcularDuracion(horaInicio, horaFin) {
    if (!horaInicio || !horaFin) return 0;
    
    const [horaIni, minIni] = horaInicio.split(':').map(Number);
    const [horaFinNum, minFin] = horaFin.split(':').map(Number);
    
    const minutosInicio = horaIni * 60 + minIni;
    const minutosFin = horaFinNum * 60 + minFin;
    
    return minutosFin - minutosInicio;
}