const mongoose = require('mongoose');

// ========================================
// ESQUEMA DE EXAMEN
// ========================================
const examenSchema = new mongoose.Schema({
    // Información Básica del Examen
    nombre: {
        type: String,
        required: [true, 'El nombre del examen es requerido'],
        trim: true,
        maxlength: [100, 'El nombre no puede exceder 100 caracteres']
    },
    
    descripcion: {
        type: String,
        trim: true,
        maxlength: [500, 'La descripción no puede exceder 500 caracteres']
    },

    // Tipo de Examen
    tipo: {
        type: String,
        enum: ['graduacion', 'evaluacion_tecnica', 'evaluacion_semestral', 'otro'],
        required: [true, 'El tipo de examen es requerido'],
        default: 'graduacion'
    },

    // Fecha y Hora
    fecha: {
        type: Date,
        required: [true, 'La fecha del examen es requerida'],
        validate: {
        validator: function(date) {
            // Permitir fechas pasadas para registro histórico
            return date instanceof Date && !isNaN(date);
        },
        message: 'La fecha del examen debe ser válida'
        }
    },

    hora: {
        type: String,
        required: [true, 'La hora del examen es requerida'],
        match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)']
    },

    // Cinturón Objetivo (para exámenes de graduación)
    cinturonObjetivo: {
        type: String,
        enum: [
            'blanco-amarillo',
            'amarillo',
            'amarillo-naranja',
            'naranja',
            'naranja-verde',
            'verde',
            'verde-azul',
            'azul',
            'azul-marron',
            'marron',
            'marron-negro',
            'negro-1',
            'negro-2',
            'negro-3',
            'negro-4',
            'negro-5',
            'negro-6',
            'negro-7',
            'negro-8',
            'negro-9'
        ],
        required: function() {
        return this.tipo === 'graduacion';
        }
    },

    // Cinturón Actual Requerido (para filtrar alumnos elegibles)
    cinturonActualRequerido: {
        type: String,
        enum: [
            'blanco',
            'blanco-amarillo',
            'amarillo',
            'amarillo-naranja',
            'naranja',
            'naranja-verde',
            'verde',
            'verde-azul',
            'azul',
            'azul-marron',
            'marron',
            'marron-negro',
            'negro-1',
            'negro-2',
            'negro-3',
            'negro-4',
            'negro-5',
            'negro-6',
            'negro-7',
            'negro-8'
        ],
        required: function() {
            return this.tipo === 'graduacion';
        }
    },

    // Sucursal donde se realiza
    sucursal: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sucursal',
        required: [true, 'La sucursal es requerida']
    },

    // Instructor(es) responsable(s)
    instructores: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        validate: {
            validator: async function(instructorId) {
                const User = mongoose.model('User');
                const instructor = await User.findById(instructorId);
                return instructor && instructor.role === 'instructor';
            },
            message: 'El instructor debe existir y tener rol de instructor'
        }
    }],

    // Categorías de Evaluación (dinámicas)
    categorias: [{
        nombre: {
            type: String,
            required: true,
            trim: true,
            maxlength: [50, 'El nombre de la categoría no puede exceder 50 caracteres']
        },
        descripcion: {
            type: String,
            trim: true,
            maxlength: [200, 'La descripción no puede exceder 200 caracteres']
        },
        peso: {
            type: Number,
            required: true,
            min: [0, 'El peso debe ser mayor o igual a 0'],
            max: [100, 'El peso no puede exceder 100'],
            default: 25
        }
    }],

    // Requisitos del Examen
    requisitos: {
        // Porcentaje mínimo de asistencias
        asistenciaMinima: {
            type: Number,
            min: [0, 'El porcentaje mínimo debe ser mayor o igual a 0'],
            max: [100, 'El porcentaje no puede exceder 100'],
            default: 75
        },
        
        // Días mínimos con cinturón actual
        diasMinimosCinturon: {
            type: Number,
            min: [0, 'Los días mínimos deben ser mayor o igual a 0'],
            default: 90 // 3 meses
        },
        
        // Requiere pagos al corriente
        pagosAlCorriente: {
            type: Boolean,
            default: true
        },
        
        // Costo del examen
        costoExamen: {
            type: Number,
            required: [true, 'El costo del examen es requerido'],
            min: [0, 'El costo debe ser mayor o igual a 0'],
            default: 0
        }
    },

    // Alumnos Inscritos en el Examen
    alumnosInscritos: [{
        alumno: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Alumno',
        required: true
        },
        fechaInscripcion: {
        type: Date,
        default: Date.now
        },
        // Pago del examen
        pagoExamen: {
        pagado: {
            type: Boolean,
            default: false
        },
        montoPagado: {
            type: Number,
            default: 0,
            min: 0
        },
        descuento: {
            type: Number,
            default: 0,
            min: 0,
            max: 100 // Porcentaje
        },
        fechaPago: Date,
        referenciaPago: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Payment' // Si está vinculado a un pago registrado
        }
        },
        // ⚙️ CANDADO ESPECIAL: Permite presentar sin pago completo
        autorizadoSinPago: {
        type: Boolean,
        default: false
        },
        autorizadoPor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User' // Admin que autorizó
        },
        motivoAutorizacion: {
        type: String,
        trim: true,
        maxlength: [200, 'El motivo no puede exceder 200 caracteres']
        },
        // Validación de requisitos
        cumpleRequisitos: {
        asistencia: {
            cumple: { type: Boolean, default: false },
            porcentaje: { type: Number, default: 0 }
        },
        tiempoCinturon: {
            cumple: { type: Boolean, default: false },
            dias: { type: Number, default: 0 }
        },
        pagosAlCorriente: {
            cumple: { type: Boolean, default: false }
        }
        },
        // Calificación
        calificado: {
            type: Boolean,
            default: false
        },
        aprobado: {
            type: Boolean,
            default: false
        },
        calificacionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Calificacion'
        }
    }],

    // Estado del Examen
    estado: {
        type: String,
        enum: ['programado', 'en_proceso', 'completado', 'cancelado'],
        default: 'programado'
    },

    // Notas adicionales
    notas: {
        type: String,
        trim: true,
        maxlength: [1000, 'Las notas no pueden exceder 1000 caracteres']
    },

    // Información de Auditoría
    creadoPor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

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
examenSchema.index({ sucursal: 1, fecha: -1 });
examenSchema.index({ estado: 1 });
examenSchema.index({ cinturonObjetivo: 1 });
examenSchema.index({ 'alumnosInscritos.alumno': 1 });

// ========================================
// VIRTUALS
// ========================================

// Total de alumnos inscritos
examenSchema.virtual('totalInscritos').get(function() {
    return this.alumnosInscritos.length;
});

// Total de alumnos que cumplen requisitos
examenSchema.virtual('alumnosCumplenRequisitos').get(function() {
    return this.alumnosInscritos.filter(inscripcion => {
        const req = inscripcion.cumpleRequisitos;
        return req.asistencia.cumple && 
            req.tiempoCinturon.cumple && 
            (req.pagosAlCorriente.cumple || inscripcion.autorizadoSinPago);
    }).length;
});

// Total recaudado del examen
examenSchema.virtual('totalRecaudado').get(function() {
    return this.alumnosInscritos.reduce((total, inscripcion) => {
        return total + (inscripcion.pagoExamen.montoPagado || 0);
    }, 0);
});

// Total pendiente de pago
examenSchema.virtual('totalPendiente').get(function() {
    return this.alumnosInscritos.reduce((total, inscripcion) => {
        if (inscripcion.pagoExamen.pagado) return total;
        
        const costoBase = this.requisitos.costoExamen;
        const descuento = inscripcion.pagoExamen.descuento || 0;
        const costoFinal = costoBase * (1 - descuento / 100);
        const pagado = inscripcion.pagoExamen.montoPagado || 0;
        
        return total + Math.max(0, costoFinal - pagado);
    }, 0);
});

// ========================================
// MÉTODOS DE INSTANCIA
// ========================================

// Verificar si un alumno cumple requisitos
examenSchema.methods.verificarRequisitosAlumno = async function(alumnoId) {
    const Alumno = mongoose.model('Alumno');
    const Asistencia = mongoose.model('Asistencia');
    const Payment = mongoose.model('Payment');

    try {
        const alumno = await Alumno.findById(alumnoId);
        if (!alumno) throw new Error('Alumno no encontrado');

        const resultado = {
            asistencia: { cumple: false, porcentaje: 0 },
            tiempoCinturon: { cumple: false, dias: 0 },
            pagosAlCorriente: { cumple: false }
        };

        // 1. Verificar asistencias
        const totalAsistencias = await Asistencia.countDocuments({
            alumno: alumnoId,
            isActive: true
        });

        const asistenciasPresentes = await Asistencia.countDocuments({
            alumno: alumnoId,
            estado: 'presente',
            isActive: true
        });

        const porcentajeAsistencia = totalAsistencias > 0 
                                    ? (asistenciasPresentes / totalAsistencias) * 100 
                                    : 0;

        resultado.asistencia.porcentaje = Math.round(porcentajeAsistencia);
        resultado.asistencia.cumple = porcentajeAsistencia >= this.requisitos.asistenciaMinima;

        // 2. Verificar tiempo con cinturón
        const fechaObtencionCinturon = alumno.belt.dateObtained || alumno.createdAt;
        const diasConCinturon = Math.floor((Date.now() - fechaObtencionCinturon) / (1000 * 60 * 60 * 24));
        
        resultado.tiempoCinturon.dias = diasConCinturon;
        resultado.tiempoCinturon.cumple = diasConCinturon >= this.requisitos.diasMinimosCinturon;

        // 3. Verificar pagos al corriente (si es requerido)
        if (this.requisitos.pagosAlCorriente) {
            const pagosPendientes = await Payment.countDocuments({
                alumno: alumnoId,
                status: { $in: ['pendiente', 'vencido'] },
                isActive: true
            });

            resultado.pagosAlCorriente.cumple = pagosPendientes === 0;
        } else {
            resultado.pagosAlCorriente.cumple = true;
        }

        return resultado;

    } catch (error) {
        console.error('Error al verificar requisitos:', error);
        throw error;
    }
};

// Inscribir alumno al examen
examenSchema.methods.inscribirAlumno = async function(alumnoId, options = {}) {
    // Verificar si ya está inscrito
    const yaInscrito = this.alumnosInscritos.some(
        inscripcion => inscripcion.alumno.toString() === alumnoId.toString()
    );

    if (yaInscrito) {
        throw new Error('El alumno ya está inscrito en este examen');
    }

    // Verificar requisitos
    const requisitos = await this.verificarRequisitosAlumno(alumnoId);

    // Crear inscripción
    const nuevaInscripcion = {
        alumno: alumnoId,
        fechaInscripcion: Date.now(),
        pagoExamen: {
            pagado: false,
            montoPagado: 0,
            descuento: options.descuento || 0
        },
        autorizadoSinPago: options.autorizadoSinPago || false,
        autorizadoPor: options.autorizadoPor || null,
        motivoAutorizacion: options.motivoAutorizacion || '',
        cumpleRequisitos: requisitos
    };

    this.alumnosInscritos.push(nuevaInscripcion);
    return this.save();
};

// Registrar pago del examen
examenSchema.methods.registrarPagoExamen = async function(alumnoId, montoPagado, referenciaPago = null) {
    const inscripcion = this.alumnosInscritos.find(
        i => i.alumno.toString() === alumnoId.toString()
    );

    if (!inscripcion) {
        throw new Error('El alumno no está inscrito en este examen');
    }

    const costoBase = this.requisitos.costoExamen;
    const descuento = inscripcion.pagoExamen.descuento || 0;
    const costoFinal = costoBase * (1 - descuento / 100);

    inscripcion.pagoExamen.montoPagado = (inscripcion.pagoExamen.montoPagado || 0) + montoPagado;
    inscripcion.pagoExamen.pagado = inscripcion.pagoExamen.montoPagado >= costoFinal;
    inscripcion.pagoExamen.fechaPago = Date.now();
    
    if (referenciaPago) {
        inscripcion.pagoExamen.referenciaPago = referenciaPago;
    }

    return this.save();
};

// ========================================
// MIDDLEWARE
// ========================================

// Validar que la suma de pesos de categorías sea 100
examenSchema.pre('save', function(next) {
    if (this.categorias && this.categorias.length > 0) {
        const sumaPesos = this.categorias.reduce((sum, cat) => sum + (cat.peso || 0), 0);
        
        if (Math.abs(sumaPesos - 100) > 0.01) { // Tolerancia de 0.01 para errores de redondeo
            return next(new Error(`La suma de los pesos debe ser 100 (actual: ${sumaPesos})`));
        }
    }
    next();
});

// ========================================
// MODELO
// ========================================
module.exports = mongoose.model('Examen', examenSchema);