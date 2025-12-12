const mongoose = require('mongoose');

// ========================================
// ESQUEMA DE GRADUACIÓN
// ========================================
const graduacionSchema = new mongoose.Schema({
    // Relación con el Examen
    examen: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Examen',
        required: [true, 'El examen es requerido']
    },

    // Relación con la Calificación
    calificacion: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Calificacion',
        required: [true, 'La calificación es requerida'],
        validate: {
            validator: async function(calificacionId) {
                const Calificacion = mongoose.model('Calificacion');
                const calificacion = await Calificacion.findById(calificacionId);
                return calificacion && calificacion.resultado === 'aprobado';
            },
        message: 'Solo se puede graduar a alumnos que aprobaron el examen'
        }
    },

    // Alumno Graduado
    alumno: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Alumno',
        required: [true, 'El alumno es requerido']
    },

    // Información del Cinturón
    cinturonAnterior: {
        type: String,
        required: [true, 'El cinturón anterior es requerido'],
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
        ]
    },

    cinturonNuevo: {
        type: String,
        required: [true, 'El cinturón nuevo es requerido'],
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
        ]
    },

    // Fecha de Graduación
    fechaGraduacion: {
        type: Date,
        required: [true, 'La fecha de graduación es requerida'],
        default: Date.now
    },

    // Instructor(es) Certificador(es)
    certificadoPor: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        validate: {
            validator: async function(instructorId) {
                const User = mongoose.model('User');
                const instructor = await User.findById(instructorId);
                return instructor && instructor.role === 'instructor';
            },
            message: 'El certificador debe ser un instructor'
        }
    }],

    // Información del Certificado
    certificado: {
        // Número de Certificado (único)
        numero: {
            type: String,
            unique: true,
            sparse: true, // Permite nulls pero mantiene unicidad cuando existe
            trim: true,
            maxlength: [50, 'El número de certificado no puede exceder 50 caracteres']
        },
        
        // Archivo del Certificado (escaneado)
        archivo: {
            type: String, // URL o path del archivo
            trim: true
        },
        
        // Tipo de archivo
        tipoArchivo: {
            type: String,
            enum: ['pdf', 'jpg', 'jpeg', 'png'],
            lowercase: true
        },
        
        // Tamaño del archivo (en bytes)
        tamanoArchivo: {
            type: Number,
            min: 0
        },
        
        // Fecha de emisión del certificado
        fechaEmision: {
            type: Date
        },
        
        // Institución que emite (si aplica)
        institucionEmisora: {
            type: String,
            trim: true,
            maxlength: [100, 'La institución no puede exceder 100 caracteres']
        },
        
        // Observaciones del certificado
        observaciones: {
            type: String,
            trim: true,
            maxlength: [500, 'Las observaciones no pueden exceder 500 caracteres']
        }
    },

    // Estado de la Graduación
    estado: {
        type: String,
        enum: ['pendiente', 'aprobada', 'certificada', 'cancelada'],
        default: 'pendiente'
    },

    // Aprobación por Admin (para graduaciones importantes como cinta negra)
    aprobadoPor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    fechaAprobacion: {
        type: Date
    },

    // Notas de Graduación
    notas: {
        type: String,
        trim: true,
        maxlength: [1000, 'Las notas no pueden exceder 1000 caracteres']
    },

    // Ceremonia de Graduación (opcional)
    ceremonia: {
        realizada: {
            type: Boolean,
            default: false
        },
        fecha: Date,
        lugar: {
            type: String,
            trim: true,
            maxlength: [200, 'El lugar no puede exceder 200 caracteres']
        },
        asistentes: {
            type: Number,
            min: 0
        },
        fotos: [{
            type: String, // URLs de fotos
            trim: true
        }]
    },

    // Registro de Actualización en Alumno
    alumnoActualizado: {
        type: Boolean,
        default: false
    },

    fechaActualizacionAlumno: {
        type: Date
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
graduacionSchema.index({ alumno: 1, fechaGraduacion: -1 });
graduacionSchema.index({ examen: 1 });
graduacionSchema.index({ cinturonNuevo: 1 });
graduacionSchema.index({ estado: 1 });
graduacionSchema.index({ 'certificado.numero': 1 }, { sparse: true });

// ========================================
// VIRTUALS
// ========================================

// Verificar si es graduación a cinta negra
graduacionSchema.virtual('esCintaNegra').get(function() {
    return this.cinturonNuevo.includes('negro');
});

// Verificar si tiene certificado
graduacionSchema.virtual('tieneCertificado').get(function() {
    return !!(this.certificado && this.certificado.archivo);
});

// Días desde la graduación
graduacionSchema.virtual('diasDesdeGraduacion').get(function() {
    if (!this.fechaGraduacion) return 0;
    const hoy = new Date();
    const diferencia = hoy - this.fechaGraduacion;
    return Math.floor(diferencia / (1000 * 60 * 60 * 24));
});

// ========================================
// MÉTODOS DE INSTANCIA
// ========================================

// Generar número de certificado automático
graduacionSchema.methods.generarNumeroCertificado = function() {
    const año = this.fechaGraduacion.getFullYear();
    const mes = String(this.fechaGraduacion.getMonth() + 1).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Formato: CERT-AAAA-MM-XXXXXX
    this.certificado.numero = `CERT-${año}-${mes}-${random}`;
    
    return this.certificado.numero;
};

// Actualizar cinturón del alumno
graduacionSchema.methods.actualizarCinturonAlumno = async function() {
    try {
        const Alumno = mongoose.model('Alumno');
        const alumno = await Alumno.findById(this.alumno);
        
        if (!alumno) {
            throw new Error('Alumno no encontrado');
        }

        // Actualizar cinturón
        alumno.belt.level = this.cinturonNuevo;
        alumno.belt.dateObtained = this.fechaGraduacion;
        alumno.belt.certifiedBy = this.certificadoPor[0]; // Primer instructor certificador
        
        await alumno.save();

        // Marcar como actualizado
        this.alumnoActualizado = true;
        this.fechaActualizacionAlumno = Date.now();
        await this.save();

        return alumno;

    } catch (error) {
        console.error('Error al actualizar cinturón del alumno:', error);
        throw error;
    }
};

// Aprobar graduación (por admin)
graduacionSchema.methods.aprobar = async function(adminId) {
    this.estado = 'aprobada';
    this.aprobadoPor = adminId;
    this.fechaAprobacion = Date.now();
    
    return this.save();
};

// Certificar graduación (con archivo)
graduacionSchema.methods.certificar = async function(archivoInfo) {
    if (!this.certificado.numero) {
        this.generarNumeroCertificado();
    }

    this.certificado.archivo = archivoInfo.path || archivoInfo.url;
    this.certificado.tipoArchivo = archivoInfo.mimetype?.split('/')[1] || archivoInfo.tipo;
    this.certificado.tamanoArchivo = archivoInfo.size;
    this.certificado.fechaEmision = Date.now();
    
    this.estado = 'certificada';
    
    return this.save();
};

// Cancelar graduación
graduacionSchema.methods.cancelar = async function(motivo) {
    this.estado = 'cancelada';
    this.notas = this.notas ? `${this.notas}\n\nCANCELADA: ${motivo}` : `CANCELADA: ${motivo}`;
    
    return this.save();
};

// Registrar ceremonia
graduacionSchema.methods.registrarCeremonia = async function(ceremoniaInfo) {
    this.ceremonia = {
        realizada: true,
        fecha: ceremoniaInfo.fecha || Date.now(),
        lugar: ceremoniaInfo.lugar || '',
        asistentes: ceremoniaInfo.asistentes || 0,
        fotos: ceremoniaInfo.fotos || []
    };
    
    return this.save();
};

// Generar reporte de graduación
graduacionSchema.methods.generarReporte = function() {
    return {
        alumno: this.alumno,
        examen: this.examen,
        calificacion: this.calificacion,
        cinturonAnterior: this.cinturonAnterior,
        cinturonNuevo: this.cinturonNuevo,
        fechaGraduacion: this.fechaGraduacion,
        certificadoPor: this.certificadoPor,
        numeroCertificado: this.certificado?.numero,
        tieneCertificado: this.tieneCertificado,
        estado: this.estado,
        ceremonia: this.ceremonia,
        esCintaNegra: this.esCintaNegra
    };
};

// ========================================
// MÉTODOS ESTÁTICOS
// ========================================

// Obtener historial de graduaciones de un alumno
graduacionSchema.statics.getHistorialAlumno = async function(alumnoId) {
    return this.find({ alumno: alumnoId, isActive: true })
        .populate('examen', 'nombre tipo fecha')
        .populate('certificadoPor', 'name email')
        .populate('calificacion', 'calificacionFinal notaAdicional')
        .sort({ fechaGraduacion: -1 })
        .lean();
};

// Obtener graduaciones de un examen
graduacionSchema.statics.getGraduacionesExamen = async function(examenId) {
    return this.find({ examen: examenId, isActive: true })
        .populate('alumno', 'firstName lastName')
        .populate('certificadoPor', 'name')
        .populate('calificacion', 'calificacionFinal')
        .sort({ fechaGraduacion: -1 })
        .lean();
};

// Obtener graduaciones pendientes de aprobación
graduacionSchema.statics.getPendientesAprobacion = async function() {
    return this.find({ 
        estado: 'pendiente', 
        isActive: true 
    })
        .populate('alumno', 'firstName lastName')
        .populate('examen', 'nombre fecha')
        .populate('calificacion', 'calificacionFinal')
        .sort({ fechaGraduacion: -1 })
        .lean();
};

// Obtener graduaciones sin certificado
graduacionSchema.statics.getSinCertificado = async function() {
    return this.find({ 
        estado: { $in: ['aprobada', 'pendiente'] },
        'certificado.archivo': { $exists: false },
        isActive: true 
    })
        .populate('alumno', 'firstName lastName')
        .populate('examen', 'nombre fecha')
        .sort({ fechaGraduacion: -1 })
        .lean();
};

// Obtener estadísticas de graduaciones
graduacionSchema.statics.getEstadisticas = async function(filtros = {}) {
    const query = { isActive: true };
    
    if (filtros.sucursal) {
        const Alumno = mongoose.model('Alumno');
        const alumnos = await Alumno.find({ 
        'enrollment.sucursal': filtros.sucursal 
        }).select('_id');
        query.alumno = { $in: alumnos.map(a => a._id) };
    }
    
    if (filtros.fechaInicio && filtros.fechaFin) {
        query.fechaGraduacion = { 
            $gte: filtros.fechaInicio, 
            $lte: filtros.fechaFin 
        };
    }

    const graduaciones = await this.find(query).lean();

    return {
        total: graduaciones.length,
        aprobadas: graduaciones.filter(g => g.estado === 'aprobada').length,
        certificadas: graduaciones.filter(g => g.estado === 'certificada').length,
        pendientes: graduaciones.filter(g => g.estado === 'pendiente').length,
        canceladas: graduaciones.filter(g => g.estado === 'cancelada').length,
        cintasNegras: graduaciones.filter(g => g.cinturonNuevo.includes('negro')).length,
        conCertificado: graduaciones.filter(g => g.certificado && g.certificado.archivo).length
    };
};

// ========================================
// MIDDLEWARE
// ========================================

// Validar que el alumno esté inscrito en el examen
graduacionSchema.pre('save', async function(next) {
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

            next();
        } catch (error) {
            next(error);
        }
    } else {
        next();
    }
});

// Generar número de certificado si no existe
graduacionSchema.pre('save', function(next) {
    if (this.estado === 'certificada' && !this.certificado.numero) {
        this.generarNumeroCertificado();
    }
    next();
});

// Actualizar alumno automáticamente cuando se aprueba
graduacionSchema.post('save', async function(doc) {
    if (doc.estado === 'aprobada' && !doc.alumnoActualizado) {
        try {
            await doc.actualizarCinturonAlumno();
        } catch (error) {
            console.error('Error al actualizar alumno en post-save:', error);
        }
    }
});

// ========================================
// MODELO
// ========================================
module.exports = mongoose.model('Graduacion', graduacionSchema);