const mongoose = require('mongoose');

const horarioSchema = new mongoose.Schema({
    // ===== RELACIONES =====
    sucursal: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sucursal',
        required: [true, 'La sucursal es requerida'],
        index: true
    },
    instructor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'El instructor es requerido'],
        index: true,
        validate: {
            validator: async function(instructorId) {
                const User = mongoose.model('User');
                const instructor = await User.findById(instructorId);
                return instructor && instructor.role === 'instructor' && instructor.isActive;
            },
            message: 'El instructor debe existir, ser instructor y estar activo'
        }
    },

    // ===== INFORMACIÓN DEL HORARIO =====
    nombre: {
        type: String,
        required: [true, 'El nombre del horario es requerido'],
        trim: true,
        maxlength: [100, 'El nombre no puede exceder 100 caracteres']
    },
    descripcion: {
        type: String,
        trim: true,
        maxlength: [300, 'La descripción no puede exceder 300 caracteres']
    },

    // ===== DÍA Y HORA =====
    dias: {
        type: String,
        enum: {
            values: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'],
            message: '{VALUE} no es un día válido'
        },
        required: [true, 'El día es requerido'],
        index: true
    },
    horaInicio: {
        type: String,
        required: [true, 'La hora de inicio es requerida'],
        trim: true,
        validate: {
            validator: function(value) {
                // Validar formato HH:MM (24 horas)
                return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value);
            },
            message: 'La hora de inicio debe estar en formato HH:MM (24 horas)'
        }
    },
    horaFin: {
        type: String,
        required: [true, 'La hora de fin es requerida'],
        trim: true,
        validate: {
            validator: function(value) {
                // Validar formato HH:MM (24 horas)
                return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value);
            },
            message: 'La hora de fin debe estar en formato HH:MM (24 horas)'
        }
    },

    // ===== NIVEL Y CATEGORÍA =====
    nivel: {
        type: String,
        enum: {
            values: ['infantil', 'juvenil', 'adulto', 'mixto', 'avanzado', 'principiante'],
            message: '{VALUE} no es un nivel válido'
        },
        required: [true, 'El nivel es requerido'],
        default: 'mixto'
    },
    categoria: {
        type: String,
        enum: ['poomsae', 'combate', 'defensa_personal', 'acrobacia', 'general'],
        default: 'general'
    },

    // ===== CAPACIDAD =====
    capacidadMaxima: {
        type: Number,
        required: [true, 'La capacidad máxima es requerida'],
        min: [1, 'La capacidad debe ser al menos 1'],
        max: [50, 'La capacidad no puede exceder 50 alumnos'],
        default: 20
    },

    // ===== ALUMNOS INSCRITOS =====
    alumnosInscritos: [{
        alumno: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Alumno'
        },
        fechaInscripcion: {
            type: Date,
            default: Date.now
        },
        activo: {
            type: Boolean,
            default: true
        }
    }],

    // ===== ESTADO =====
    estado: {
        type: String,
        enum: {
            values: ['activo', 'suspendido', 'cancelado', 'finalizado'],
            message: '{VALUE} no es un estado válido'
        },
        default: 'activo',
        index: true
    },

    // ===== FECHAS DE VIGENCIA =====
    fechaInicio: {
        type: Date,
        required: [true, 'La fecha de inicio es requerida'],
        default: Date.now
    },
    fechaFin: {
        type: Date,
        validate: {
            validator: function(date) {
                if (!date) return true; // Opcional
                return date > this.fechaInicio;
            },
            message: 'La fecha de fin debe ser posterior a la fecha de inicio'
        }
    },

    // ===== RECURRENCIA =====
    recurrente: {
        type: Boolean,
        default: true
    },
    diasRecurrentes: [{
        type: String,
        enum: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
    }],

    // ===== PRECIO/COSTO =====
    precio: {
        type: Number,
        min: [0, 'El precio no puede ser negativo'],
        default: 0
    },

    // ===== SALA/UBICACIÓN =====
    salon: {
        type: String,
        trim: true,
        maxlength: [50, 'El nombre del salón no puede exceder 50 caracteres']
    },

    // ===== NOTAS =====
    notas: {
        type: String,
        trim: true,
        maxlength: [500, 'Las notas no pueden exceder 500 caracteres']
    },

    // ===== CONFIGURACIÓN =====
    configuracion: {
        permitirListaEspera: {
            type: Boolean,
            default: true
        },
        notificarInscripciones: {
            type: Boolean,
            default: true
        },
        requiereConfirmacion: {
            type: Boolean,
            default: false
        }
    },

    // ===== AUDITORÍA =====
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
    }, {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// ===== ÍNDICES COMPUESTOS =====
horarioSchema.index({ dias: 1, estado: 1 });
horarioSchema.index({ instructor: 1, estado: 1 });
horarioSchema.index({ nivel: 1, estado: 1 });
horarioSchema.index({ dia: 1, estado: 1 });
horarioSchema.index({ createdAt: -1 });
horarioSchema.index({ 'alumnosInscritos.alumno': 1 });

// ===== VIRTUALS =====

// Virtual para calcular duración en minutos
horarioSchema.virtual('duracionMinutos').get(function() {
    if (!this.horaInicio || !this.horaFin) return 0;

    const [horaIni, minIni] = this.horaInicio.split(':').map(Number);
    const [horaFin, minFin] = this.horaFin.split(':').map(Number);

    const minutosInicio = horaIni * 60 + minIni;
    const minutosFin = horaFin * 60 + minFin;

    return minutosFin - minutosInicio;
});

// Virtual para mostrar duración en formato legible
horarioSchema.virtual('duracionTexto').get(function() {
    const minutos = this.duracionMinutos;
    if (minutos === 0) return '0 minutos';

    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;

    if (horas === 0) return `${mins} minutos`;
    if (mins === 0) return `${horas} hora${horas > 1 ? 's' : ''}`;

    return `${horas}h ${mins}min`;
});

// Virtual para calcular lugares disponibles
horarioSchema.virtual('lugaresDisponibles').get(function() {
    const inscritos = this.alumnosInscritos.filter(a => a.activo).length;
    return Math.max(0, this.capacidadMaxima - inscritos);
});

// Virtual para calcular porcentaje de ocupación
horarioSchema.virtual('porcentajeOcupacion').get(function() {
    const inscritos = this.alumnosInscritos.filter(a => a.activo).length;
    if (this.capacidadMaxima === 0) return 0;
    return Math.round((inscritos / this.capacidadMaxima) * 100);
});

// Virtual para verificar si está lleno
horarioSchema.virtual('estaLleno').get(function() {
    return this.lugaresDisponibles === 0;
});

// Virtual para obtener número de inscritos activos
horarioSchema.virtual('numeroInscritos').get(function() {
    return this.alumnosInscritos.filter(a => a.activo).length;
});

// Virtual para formato de horario legible
horarioSchema.virtual('horarioTexto').get(function() {
    const diasMap = {
        'lunes': 'Lunes',
        'martes': 'Martes',
        'miercoles': 'Miércoles',
        'jueves': 'Jueves',
        'viernes': 'Viernes',
        'sabado': 'Sábado',
        'domingo': 'Domingo'
    };

    // Si hay múltiples días, mostrarlos separados por coma
    const diasTexto = this.dias && this.dias.length > 0 
        ? this.dias.map(d => diasMap[d]).join(', ')
        : 'Sin día asignado';

    return `${diasTexto} ${this.horaInicio} - ${this.horaFin}`;
});

// ===== MÉTODOS DE INSTANCIA =====

// Método para inscribir alumno
horarioSchema.methods.inscribirAlumno = async function(alumnoId) {
    // Verificar que no esté lleno
    if (this.estaLleno) {
        throw new Error('El horario está lleno');
    }

    // Verificar que el alumno no esté ya inscrito
    const yaInscrito = this.alumnosInscritos.some(
        a => a.alumno.toString() === alumnoId.toString() && a.activo
    );

    if (yaInscrito) {
        throw new Error('El alumno ya está inscrito en este horario');
    }

    // Verificar que el alumno exista y esté activo
    const Alumno = mongoose.model('Alumno');
    const alumno = await Alumno.findById(alumnoId);

    if (!alumno || !alumno.isActive || alumno.enrollment.status !== 'activo') {
        throw new Error('El alumno no existe o no está activo');
    }
        
    // Agregar alumno
    this.alumnosInscritos.push({
        alumno: alumnoId,
        fechaInscripcion: new Date(),
        activo: true
    });

    await this.save();
    return this;
};

// Método para desinscribir alumno
horarioSchema.methods.desinscribirAlumno = async function(alumnoId) {
    const inscripcion = this.alumnosInscritos.find(
        a => a.alumno.toString() === alumnoId.toString()
    );

    if (!inscripcion) {
        throw new Error('El alumno no está inscrito en este horario');
    }

    inscripcion.activo = false;
    await this.save();
    return this;
};

// Método para obtener información pública
horarioSchema.methods.getPublicInfo = function() {
    const obj = this.toObject();
    
    return {
        _id: obj._id,
        sucursal: obj.sucursal,
        instructor: obj.instructor,
        nombre: obj.nombre,
        descripcion: obj.descripcion,
        dia: obj.dia,
        horaInicio: obj.horaInicio,
        horaFin: obj.horaFin,
        duracionMinutos: obj.duracionMinutos,
        duracionTexto: obj.duracionTexto,
        horarioTexto: obj.horarioTexto,
        nivel: obj.nivel,
        categoria: obj.categoria,
        capacidadMaxima: obj.capacidadMaxima,
        numeroInscritos: obj.numeroInscritos,
        lugaresDisponibles: obj.lugaresDisponibles,
        porcentajeOcupacion: obj.porcentajeOcupacion,
        estaLleno: obj.estaLleno,
        estado: obj.estado,
        fechaInicio: obj.fechaInicio,
        fechaFin: obj.fechaFin,
        precio: obj.precio,
        salon: obj.salon,
        configuracion: obj.configuracion,
        createdAt: obj.createdAt,
        updatedAt: obj.updatedAt
    };
};

// ===== MÉTODOS ESTÁTICOS =====

    // Buscar horarios activos
    horarioSchema.statics.findActive = function(filters = {}) {
        return this.find({ 
            isActive: true,
            estado: 'activo',
            ...filters 
        })
        .populate('sucursal', 'name address')
        .populate('instructor', 'name email instructorInfo.belt')
        .populate('alumnosInscritos.alumno', 'firstName lastName enrollment.studentId')
        .sort({ dia: 1, horaInicio: 1 });
    };

    // Buscar horarios por sucursal
    horarioSchema.statics.findBySucursal = function(sucursalId) {
        return this.find({ 
            sucursal: sucursalId,
            isActive: true,
            estado: 'activo'
        })
        .populate('instructor', 'name email')
        .populate('alumnosInscritos.alumno', 'firstName lastName')
        .sort({ dias: 1, horaInicio: 1 });
    };

    // Buscar horarios por instructor
    horarioSchema.statics.findByInstructor = function(instructorId) {
        return this.find({ 
            instructor: instructorId,
            isActive: true
        })
        .populate('sucursal', 'name address')
        .populate('alumnosInscritos.alumno', 'firstName lastName')
        .sort({ dias: 1, horaInicio: 1 });
    };

    // Buscar horarios por día
    horarioSchema.statics.findByDia = function(dia, filters = {}) {
        return this.find({ 
            dias: dia, // Busca en el array
            isActive: true,
            estado: 'activo',
            ...filters 
        })
        .populate('sucursal', 'name')
        .populate('instructor', 'name')
        .sort({ horaInicio: 1 });
    };

    // Buscar horarios disponibles (con lugares)
    horarioSchema.statics.findAvailable = function(filters = {}) {
        return this.aggregate([
            {
                $match: {
                    isActive: true,
                    estado: 'activo',
                    ...filters
                }
            },
            {
                $addFields: {
                    numeroInscritos: {
                    $size: {
                        $filter: {
                        input: '$alumnosInscritos',
                        as: 'inscrito',
                        cond: { $eq: ['$$inscrito.activo', true] }
                        }
                    }
                    }
                }
            },
            {
                $match: {
                    $expr: { $lt: ['$numeroInscritos', '$capacidadMaxima'] }
                }
            },
            {
                $sort: { dias: 1, horaInicio: 1 }
            }
        ]);
    };

    // Obtener estadísticas
    horarioSchema.statics.getStats = async function(filters = {}) {
        const stats = await this.aggregate([
            {
                $match: {
                    isActive: true,
                    ...filters
                }
            },
            {
                $group: {
                    _id: '$estado',
                    count: { $sum: 1 },
                    totalCapacidad: { $sum: '$capacidadMaxima' }
                }
            }
        ]);

        const horarios = await this.find({ isActive: true, ...filters });
        const totalInscritos = horarios.reduce((sum, h) => {
            return sum + h.alumnosInscritos.filter(a => a.activo).length;
        }, 0);

        return {
            total: stats.reduce((acc, item) => acc + item.count, 0),
            totalCapacidad: stats.reduce((acc, item) => acc + item.totalCapacidad, 0),
            totalInscritos,
            byEstado: stats.reduce((acc, item) => {
                acc[item._id] = {
                    count: item.count,
                    capacidad: item.totalCapacidad
                };
                return acc;
            }, {})
        };
    };

    // ===== MIDDLEWARE PRE-SAVE =====

// Validar que hora fin sea mayor que hora inicio
horarioSchema.pre('save', function(next) {
    if (this.horaInicio && this.horaFin) {
        const [horaIni, minIni] = this.horaInicio.split(':').map(Number);
        const [horaFin, minFin] = this.horaFin.split(':').map(Number);
        
        const minutosInicio = horaIni * 60 + minIni;
        const minutosFin = horaFin * 60 + minFin;
        
        if (minutosFin <= minutosInicio) {
            return next(new Error('La hora de fin debe ser posterior a la hora de inicio'));
        }
    }
    next();
});

// Validar que no haya conflictos de horario
horarioSchema.pre('save', async function(next) {
    // Solo validar en creación o si se modifican los horarios
    if (!this.isNew && !this.isModified('dia') && !this.isModified('horaInicio') && !this.isModified('horaFin')) {
        return next();
    }

    try {
        // Buscar conflictos con el mismo instructor
        const conflictos = await this.constructor.find({
            _id: { $ne: this._id },
            instructor: this.instructor,
            dias: { $in: this.dias },
            estado: { $in: ['activo', 'suspendido'] },
            isActive: true,
            $or: [
                // El nuevo horario empieza durante un horario existente
                {
                    horaInicio: { $lte: this.horaInicio },
                    horaFin: { $gt: this.horaInicio }
                },
                // El nuevo horario termina durante un horario existente
                {
                    horaInicio: { $lt: this.horaFin },
                    horaFin: { $gte: this.horaFin }
                },
                // El nuevo horario engloba un horario existente
                {
                    horaInicio: { $gte: this.horaInicio },
                    horaFin: { $lte: this.horaFin }
                }
            ]
        });

        if (conflictos.length > 0) {
            return next(new Error('El instructor ya tiene un horario asignado en este día y hora'));
        }

        next();
    } catch (error) {
        next(error);
    }
});

// ===== MIDDLEWARE POST-SAVE =====

horarioSchema.post('save', async function(doc) {
    try {
        console.log(`Horario guardado: ${doc.nombre} - ${doc.horarioTexto}`);
    } catch (error) {
        console.error('Error en post-save de Horario:', error);
    }
});

// ===== EXPORTAR MODELO =====
const Horario = mongoose.model('Horario', horarioSchema);

module.exports = Horario;