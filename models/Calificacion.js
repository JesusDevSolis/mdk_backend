const mongoose = require('mongoose');

// ========================================
// ESQUEMA DE CALIFICACIÓN
// ========================================
const calificacionSchema = new mongoose.Schema({
    // Relación con el Examen
    examen: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Examen',
        required: [true, 'El examen es requerido']
    },

    // Alumno Evaluado
    alumno: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Alumno',
        required: [true, 'El alumno es requerido']
    },

    // Instructor que Evalúa
    evaluadoPor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'El instructor evaluador es requerido'],
        validate: {
            validator: async function(instructorId) {
                const User = mongoose.model('User');
                const instructor = await User.findById(instructorId);
                return instructor && instructor.role === 'instructor';
            },
            message: 'El evaluador debe ser un instructor'
        }
    },

    // Fecha de Evaluación
    fechaEvaluacion: {
        type: Date,
        default: Date.now
    },

    // Calificaciones por Categoría
    calificacionesPorCategoria: [{
        categoria: {
            type: String,
            required: true,
            trim: true
        },
        calificacion: {
            type: Number,
            required: true,
            min: [0, 'La calificación debe ser mayor o igual a 0'],
            max: [100, 'La calificación no puede exceder 100']
        },
        peso: {
            type: Number,
            required: true,
            min: [0, 'El peso debe ser mayor o igual a 0'],
            max: [100, 'El peso no puede exceder 100']
        },
        observaciones: {
            type: String,
            trim: true,
            maxlength: [500, 'Las observaciones no pueden exceder 500 caracteres']
        }
    }],

    // Calificación Final (promedio ponderado)
    calificacionFinal: {
        type: Number,
        min: [0, 'La calificación final debe ser mayor o igual a 0'],
        max: [100, 'La calificación final no puede exceder 100']
    },

    // Nota Adicional (Excelente, Sobresaliente, etc.)
    notaAdicional: {
        type: String,
        trim: true,
        maxlength: [100, 'La nota adicional no puede exceder 100 caracteres']
    },

    // Resultado Final
    resultado: {
        type: String,
        enum: ['aprobado', 'reprobado', 'pendiente'],
        default: 'pendiente'
    },

    // Calificación Mínima para Aprobar (del examen)
    calificacionMinima: {
        type: Number,
        default: 70,
        min: [0, 'La calificación mínima debe ser mayor o igual a 0'],
        max: [100, 'La calificación mínima no puede exceder 100']
    },

    // Observaciones Generales
    observacionesGenerales: {
        type: String,
        trim: true,
        maxlength: [1000, 'Las observaciones generales no pueden exceder 1000 caracteres']
    },

    // Fortalezas del Alumno
    fortalezas: [{
        type: String,
        trim: true,
        maxlength: [200, 'La fortaleza no puede exceder 200 caracteres']
    }],

    // Áreas de Mejora
    areasMejora: [{
        type: String,
        trim: true,
        maxlength: [200, 'El área de mejora no puede exceder 200 caracteres']
    }],

    // Estado de la Calificación
    estado: {
        type: String,
        enum: ['borrador', 'finalizada', 'revisada'],
        default: 'borrador'
    },

    // Revisión por Admin (opcional)
    revisadoPor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    fechaRevision: {
        type: Date
    },

    comentariosRevision: {
        type: String,
        trim: true,
        maxlength: [500, 'Los comentarios de revisión no pueden exceder 500 caracteres']
    },

    // Información de Auditoría
    modificadoPor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    isActive: {
        type: Boolean,
        default: true
    }

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ========================================
// ÍNDICES
// ========================================
calificacionSchema.index({ examen: 1, alumno: 1 }, { unique: true }); // Un alumno solo puede tener una calificación por examen
calificacionSchema.index({ alumno: 1, fechaEvaluacion: -1 });
calificacionSchema.index({ evaluadoPor: 1 });
calificacionSchema.index({ resultado: 1 });

// ========================================
// VIRTUALS
// ========================================

// Aprobado o no
calificacionSchema.virtual('aprobo').get(function() {
    return this.resultado === 'aprobado';
});

// Porcentaje de aprobación
calificacionSchema.virtual('porcentajeAprobacion').get(function() {
    if (!this.calificacionFinal || !this.calificacionMinima) return 0;
    return Math.round((this.calificacionFinal / this.calificacionMinima) * 100);
});

// ========================================
// MÉTODOS DE INSTANCIA
// ========================================

// Calcular calificación final (promedio ponderado)
calificacionSchema.methods.calcularCalificacionFinal = function() {
    if (!this.calificacionesPorCategoria || this.calificacionesPorCategoria.length === 0) {
        this.calificacionFinal = 0;
        return 0;
    }

    let sumaCalificacionesPonderadas = 0;
    let sumaPesos = 0;

    this.calificacionesPorCategoria.forEach(cat => {
        const calificacionPonderada = (cat.calificacion * cat.peso) / 100;
        sumaCalificacionesPonderadas += calificacionPonderada;
        sumaPesos += cat.peso;
    });

    // Si los pesos no suman 100, normalizar
    if (sumaPesos !== 100 && sumaPesos > 0) {
        this.calificacionFinal = (sumaCalificacionesPonderadas / sumaPesos) * 100;
    } else {
        this.calificacionFinal = sumaCalificacionesPonderadas;
    }

    // Redondear a 2 decimales
    this.calificacionFinal = Math.round(this.calificacionFinal * 100) / 100;

    return this.calificacionFinal;
};

// Determinar si aprobó o reprobó
calificacionSchema.methods.determinarResultado = function() {
    if (!this.calificacionFinal) {
        this.calcularCalificacionFinal();
    }

    if (this.calificacionFinal >= this.calificacionMinima) {
        this.resultado = 'aprobado';
    } else {
        this.resultado = 'reprobado';
    }

    return this.resultado;
};

// Finalizar calificación
calificacionSchema.methods.finalizar = function() {
    this.calcularCalificacionFinal();
    this.determinarResultado();
    this.estado = 'finalizada';
    return this.save();
};

// Generar reporte de calificación
calificacionSchema.methods.generarReporte = function() {
    return {
        examen: this.examen,
        alumno: this.alumno,
        evaluadoPor: this.evaluadoPor,
        fechaEvaluacion: this.fechaEvaluacion,
        calificacionFinal: this.calificacionFinal,
        notaAdicional: this.notaAdicional,
        resultado: this.resultado,
        detallesPorCategoria: this.calificacionesPorCategoria.map(cat => ({
            categoria: cat.categoria,
            calificacion: cat.calificacion,
            peso: cat.peso,
            observaciones: cat.observaciones
        })),
        observacionesGenerales: this.observacionesGenerales,
        fortalezas: this.fortalezas,
        areasMejora: this.areasMejora
    };
};

// ========================================
// MÉTODOS ESTÁTICOS
// ========================================

// Obtener calificaciones de un alumno
calificacionSchema.statics.getCalificacionesAlumno = async function(alumnoId, options = {}) {
    const query = { alumno: alumnoId, isActive: true };
    
    if (options.examen) {
        query.examen = options.examen;
    }
    
    if (options.resultado) {
        query.resultado = options.resultado;
    }

    return this.find(query)
        .populate('examen', 'nombre tipo fecha cinturonObjetivo')
        .populate('evaluadoPor', 'name email')
        .sort({ fechaEvaluacion: -1 })
        .lean();
};

// Obtener calificaciones de un examen
calificacionSchema.statics.getCalificacionesExamen = async function(examenId, options = {}) {
    const query = { examen: examenId, isActive: true };
    
    if (options.resultado) {
        query.resultado = options.resultado;
    }
    
    if (options.estado) {
        query.estado = options.estado;
    }

    return this.find(query)
        .populate('alumno', 'firstName lastName belt')
        .populate('evaluadoPor', 'name email')
        .sort({ calificacionFinal: -1 })
        .lean();
};

// Obtener estadísticas de un examen
calificacionSchema.statics.getEstadisticasExamen = async function(examenId) {
    const calificaciones = await this.find({ 
        examen: examenId, 
        isActive: true,
        estado: { $in: ['finalizada', 'revisada'] }
    }).lean();

    if (calificaciones.length === 0) {
        return {
        totalCalificaciones: 0,
        aprobados: 0,
        reprobados: 0,
        pendientes: 0,
        promedioGeneral: 0,
        calificacionMaxima: 0,
        calificacionMinima: 0
        };
    }

    const aprobados = calificaciones.filter(c => c.resultado === 'aprobado').length;
    const reprobados = calificaciones.filter(c => c.resultado === 'reprobado').length;
    const pendientes = calificaciones.filter(c => c.resultado === 'pendiente').length;

    const calificacionesNumericas = calificaciones
        .map(c => c.calificacionFinal)
        .filter(c => c !== undefined && c !== null);

    const promedioGeneral = calificacionesNumericas.length > 0
        ? calificacionesNumericas.reduce((sum, cal) => sum + cal, 0) / calificacionesNumericas.length
        : 0;

    const calificacionMaxima = calificacionesNumericas.length > 0
        ? Math.max(...calificacionesNumericas)
        : 0;

    const calificacionMinima = calificacionesNumericas.length > 0
        ? Math.min(...calificacionesNumericas)
        : 0;

    return {
        totalCalificaciones: calificaciones.length,
        aprobados,
        reprobados,
        pendientes,
        promedioGeneral: Math.round(promedioGeneral * 100) / 100,
        calificacionMaxima,
        calificacionMinima,
        porcentajeAprobacion: calificaciones.length > 0 
        ? Math.round((aprobados / calificaciones.length) * 100) 
        : 0
    };
};

// ========================================
// MIDDLEWARE
// ========================================

// Calcular calificación final antes de guardar
calificacionSchema.pre('save', function(next) {
    if (this.calificacionesPorCategoria && this.calificacionesPorCategoria.length > 0) {
        this.calcularCalificacionFinal();
        
        // Solo determinar resultado si está finalizada
        if (this.estado === 'finalizada') {
            this.determinarResultado();
        }
    }
    next();
});

// Validar que existe inscripción en el examen
calificacionSchema.pre('save', async function(next) {
    if (this.isNew) {
        try {
            const Examen = mongoose.model('Examen');
            const examen = await Examen.findById(this.examen);
            
            if (!examen) {
                return next(new Error('El examen no existe'));
            }

            const inscrito = examen.alumnosInscritos.some(
                i => i.alumno.toString() === this.alumno.toString()
            );

            if (!inscrito) {
                return next(new Error('El alumno no está inscrito en este examen'));
            }

            // Heredar calificación mínima del examen si existe
            if (!this.calificacionMinima && examen.requisitos && examen.requisitos.calificacionMinima) {
                this.calificacionMinima = examen.requisitos.calificacionMinima;
            }

            next();
        } catch (error) {
            next(error);
        }
    } else {
        next();
    }
});

// ========================================
// MODELO
// ========================================
module.exports = mongoose.model('Calificacion', calificacionSchema);