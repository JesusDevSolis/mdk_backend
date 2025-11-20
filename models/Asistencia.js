const mongoose = require('mongoose');

const asistenciaSchema = new mongoose.Schema({
    // ===== RELACIONES =====
    alumno: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Alumno',
        required: [true, 'El alumno es requerido'],
        index: true
    },
    horario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Horario',
        required: [true, 'El horario es requerido'],
        index: true
    },
    instructor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'El instructor/admin es requerido']
        // Se valida en pre-save que sea instructor o admin
    },

    // ===== INFORMACIÓN DE LA ASISTENCIA =====
    fecha: {
        type: Date,
        required: [true, 'La fecha es requerida'],
        index: true,
        default: Date.now
    },
    estado: {
        type: String,
        enum: {
            values: ['presente', 'ausente', 'justificado', 'retardo'],
            message: '{VALUE} no es un estado válido'
        },
        required: [true, 'El estado es requerido'],
        default: 'ausente'
    },

    // ===== INFORMACIÓN ADICIONAL =====
    notas: {
        type: String,
        trim: true,
        maxlength: [500, 'Las notas no pueden exceder 500 caracteres']
    },
    horaRegistro: {
        type: String,
        trim: true,
        validate: {
            validator: function(value) {
                if (!value) return true;
                // Validar formato HH:MM (24 horas)
                return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value);
            },
            message: 'La hora de registro debe estar en formato HH:MM (24 horas)'
        }
    },

    // ===== AUDITORÍA =====
    registradoPor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    modificadoPor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    fechaModificacion: {
        type: Date
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ===== ÍNDICES COMPUESTOS =====
// Índice compuesto para evitar duplicados (mismo alumno, mismo horario, misma fecha)
asistenciaSchema.index({ alumno: 1, horario: 1, fecha: 1 }, { unique: true });

// Índices para mejorar performance en consultas comunes
asistenciaSchema.index({ fecha: -1 });
asistenciaSchema.index({ estado: 1 });
asistenciaSchema.index({ 'horario': 1, 'fecha': -1 });
asistenciaSchema.index({ 'alumno': 1, 'fecha': -1 });

// ===== VIRTUALS =====

// Virtual para obtener el día de la semana
asistenciaSchema.virtual('diaSemana').get(function() {
    if (!this.fecha) return null;
    
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    return dias[new Date(this.fecha).getDay()];
});

// Virtual para formato de fecha legible
asistenciaSchema.virtual('fechaFormateada').get(function() {
    if (!this.fecha) return null;
    
    return new Date(this.fecha).toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
});

// ===== MÉTODOS DE INSTANCIA =====

// Método para obtener información pública
asistenciaSchema.methods.getPublicInfo = function() {
    return {
        _id: this._id,
        alumno: this.alumno,
        horario: this.horario,
        instructor: this.instructor,
        fecha: this.fecha,
        fechaFormateada: this.fechaFormateada,
        diaSemana: this.diaSemana,
        estado: this.estado,
        notas: this.notas,
        horaRegistro: this.horaRegistro,
        registradoPor: this.registradoPor,
        modificadoPor: this.modificadoPor,
        fechaModificacion: this.fechaModificacion,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
    };
};

// Método para cambiar estado de asistencia
asistenciaSchema.methods.cambiarEstado = async function(nuevoEstado, usuarioId, notas = null) {
    const estadosValidos = ['presente', 'ausente', 'justificado', 'retardo'];
    
    if (!estadosValidos.includes(nuevoEstado)) {
        throw new Error('Estado no válido');
    }

    this.estado = nuevoEstado;
    this.modificadoPor = usuarioId;
    this.fechaModificacion = new Date();
    
    if (notas) {
        this.notas = notas;
    }

    await this.save();
    return this;
};

// ===== MÉTODOS ESTÁTICOS =====

// Método para buscar asistencias por alumno
asistenciaSchema.statics.findByAlumno = function(alumnoId, filters = {}) {
    return this.find({ 
        alumno: alumnoId,
        ...filters 
    })
    .populate('horario', 'nombre dias horaInicio horaFin')
    .populate('instructor', 'name')
    .populate('registradoPor', 'name')
    .sort({ fecha: -1 });
};

// Método para buscar asistencias por horario
asistenciaSchema.statics.findByHorario = function(horarioId, filters = {}) {
    return this.find({ 
        horario: horarioId,
        ...filters 
    })
    .populate('alumno', 'firstName lastName enrollment.studentId profilePhoto')
    .populate('instructor', 'name')
    .populate('registradoPor', 'name')
    .sort({ fecha: -1 });
};

// Método para buscar asistencias por fecha
asistenciaSchema.statics.findByFecha = function(fecha, filters = {}) {
    const startOfDay = new Date(fecha);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(fecha);
    endOfDay.setHours(23, 59, 59, 999);

    return this.find({
        fecha: {
            $gte: startOfDay,
            $lte: endOfDay
        },
        ...filters
    })
    .populate('alumno', 'firstName lastName enrollment.studentId profilePhoto')
    .populate('horario', 'nombre dias horaInicio horaFin')
    .populate('instructor', 'name')
    .populate('registradoPor', 'name')
    .sort({ fecha: -1 });
};

// Método para obtener estadísticas de asistencia de un alumno
asistenciaSchema.statics.getEstadisticasAlumno = async function(alumnoId, fechaInicio = null, fechaFin = null) {
    const matchStage = { alumno: new mongoose.Types.ObjectId(alumnoId) };

    // Filtrar por rango de fechas si se proporciona
    if (fechaInicio || fechaFin) {
        matchStage.fecha = {};
        if (fechaInicio) matchStage.fecha.$gte = new Date(fechaInicio);
        if (fechaFin) matchStage.fecha.$lte = new Date(fechaFin);
    }

    const stats = await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$estado',
                count: { $sum: 1 }
            }
        }
    ]);

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

    // Calcular porcentaje (presente + retardo = asistió)
    if (resultado.total > 0) {
        resultado.porcentajeAsistencia = Math.round(
            ((resultado.presente + resultado.retardo) / resultado.total) * 100
        );
    }

    return resultado;
};

// Método para obtener estadísticas de asistencia por horario
asistenciaSchema.statics.getEstadisticasHorario = async function(horarioId, fecha = null) {
    const matchStage = { horario: new mongoose.Types.ObjectId(horarioId) };

    if (fecha) {
        const startOfDay = new Date(fecha);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(fecha);
        endOfDay.setHours(23, 59, 59, 999);

        matchStage.fecha = {
            $gte: startOfDay,
            $lte: endOfDay
        };
    }

    const stats = await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$estado',
                count: { $sum: 1 }
            }
        }
    ]);

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

    return resultado;
};

// ===== MIDDLEWARE =====

// Pre-save: Validar instructor
asistenciaSchema.pre('save', async function(next) {
    // Solo validar si es un documento nuevo o si el instructor cambió
    if (this.isNew || this.isModified('instructor')) {
        try {
            const User = mongoose.model('User');
            const instructor = await User.findById(this.instructor);
            
            if (!instructor) {
                return next(new Error('El instructor no existe'));
            }
            
            // ✅ PERMITIR admin O instructor
            if (instructor.role !== 'instructor' && instructor.role !== 'admin') {
                return next(new Error('El usuario no tiene permisos para marcar asistencia (debe ser admin o instructor)'));
            }
            
            if (!instructor.isActive) {
                return next(new Error('El usuario no está activo'));
            }
        } catch (error) {
            return next(error);
        }
    }
    next();
});

// Post-save: Actualizar estadísticas del alumno
asistenciaSchema.post('save', async function(doc) {
    try {
        const Alumno = mongoose.model('Alumno');
        const alumno = await Alumno.findById(doc.alumno);
        
        if (alumno) {
            // Obtener estadísticas actualizadas
            const stats = await mongoose.model('Asistencia').getEstadisticasAlumno(doc.alumno);
            
            // Actualizar stats del alumno
            alumno.stats.totalClasses = stats.total;
            alumno.stats.attendanceCount = stats.presente + stats.retardo;
            alumno.stats.attendancePercentage = stats.porcentajeAsistencia;
            alumno.stats.lastAttendance = doc.fecha;
            
            await alumno.save();
        }
    } catch (error) {
        console.error('Error actualizando estadísticas del alumno:', error);
    }
});

// Pre-remove: Actualizar estadísticas al eliminar
asistenciaSchema.pre('remove', async function(next) {
    try {
        const Alumno = mongoose.model('Alumno');
        const alumno = await Alumno.findById(this.alumno);
        
        if (alumno) {
            // Recalcular estadísticas después de eliminar
            const stats = await mongoose.model('Asistencia').getEstadisticasAlumno(this.alumno);
            
            alumno.stats.totalClasses = stats.total;
            alumno.stats.attendanceCount = stats.presente + stats.retardo;
            alumno.stats.attendancePercentage = stats.porcentajeAsistencia;
            
            await alumno.save();
        }
    } catch (error) {
        console.error('Error actualizando estadísticas al eliminar:', error);
    }
    next();
});

// Exportar el modelo
const Asistencia = mongoose.model('Asistencia', asistenciaSchema);

module.exports = Asistencia;