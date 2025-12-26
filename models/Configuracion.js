const mongoose = require('mongoose');

// ========================================
// ESQUEMA DE CONFIGURACIÓN
// ========================================
const configuracionSchema = new mongoose.Schema({
    // ===== CATEGORÍA =====
    categoria: {
        type: String,
        enum: [
            'general',
            'examenes',
            'pagos',
            'asistencias',
            'notificaciones',
            'cinturones'
        ],
        required: [true, 'La categoría es requerida'],
        index: true
    },

    // ===== CLAVE ÚNICA =====
    clave: {
        type: String,
        required: [true, 'La clave es requerida'],
        trim: true,
        unique: true,
        lowercase: true,
        maxlength: [100, 'La clave no puede exceder 100 caracteres']
    },

    // ===== VALOR =====
    valor: {
        type: mongoose.Schema.Types.Mixed,
        required: [true, 'El valor es requerido']
    },

    // ===== TIPO DE DATO =====
    tipo: {
        type: String,
        enum: ['string', 'number', 'boolean', 'json', 'array'],
        required: [true, 'El tipo es requerido']
    },

    // ===== DESCRIPCIÓN =====
    descripcion: {
        type: String,
        trim: true,
        maxlength: [500, 'La descripción no puede exceder 500 caracteres']
    },

    // ===== VALOR POR DEFECTO =====
    valorDefecto: {
        type: mongoose.Schema.Types.Mixed
    },

    // ===== VALIDACIONES =====
    validaciones: {
        min: {
            type: Number
        },
        max: {
            type: Number
        },
        opciones: [{
            type: String
        }],
        requerido: {
            type: Boolean,
            default: false
        }
    },

    // ===== VISIBILIDAD =====
    esPublica: {
        type: Boolean,
        default: false,
        comment: 'Si es true, padres/instructores pueden ver esta configuración'
    },

    // ===== EDITABLE =====
    esEditable: {
        type: Boolean,
        default: true,
        comment: 'Si es false, solo se puede cambiar desde código'
    },

    // ===== ORDEN DE VISUALIZACIÓN =====
    orden: {
        type: Number,
        default: 0
    },

    // ===== AUDITORÍA =====
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
configuracionSchema.index({ categoria: 1, orden: 1 });
configuracionSchema.index({ clave: 1 }, { unique: true });
configuracionSchema.index({ esPublica: 1 });

// ========================================
// VIRTUALS
// ========================================

// Nombre legible de la categoría
configuracionSchema.virtual('categoriaNombre').get(function() {
    const nombres = {
        'general': 'General del Sistema',
        'examenes': 'Exámenes y Graduaciones',
        'pagos': 'Pagos y Finanzas',
        'asistencias': 'Asistencias',
        'notificaciones': 'Notificaciones',
        'cinturones': 'Cinturones y Progresión'
    };
    return nombres[this.categoria] || this.categoria;
});

// ========================================
// MÉTODOS DE INSTANCIA
// ========================================

// Obtener valor parseado según tipo
configuracionSchema.methods.getValorParseado = function() {
    switch (this.tipo) {
        case 'number':
            return parseFloat(this.valor);
        case 'boolean':
            return this.valor === true || this.valor === 'true' || this.valor === 1;
        case 'json':
            return typeof this.valor === 'string' ? JSON.parse(this.valor) : this.valor;
        case 'array':
            return Array.isArray(this.valor) ? this.valor : JSON.parse(this.valor);
        default:
            return this.valor;
    }
};

// Validar valor según tipo y restricciones
configuracionSchema.methods.validarValor = function(nuevoValor) {
    // Validar tipo
    switch (this.tipo) {
        case 'number':
            if (isNaN(nuevoValor)) {
                return { valido: false, mensaje: 'El valor debe ser un número' };
            }
            const num = parseFloat(nuevoValor);
            if (this.validaciones.min !== undefined && num < this.validaciones.min) {
                return { valido: false, mensaje: `El valor mínimo es ${this.validaciones.min}` };
            }
            if (this.validaciones.max !== undefined && num > this.validaciones.max) {
                return { valido: false, mensaje: `El valor máximo es ${this.validaciones.max}` };
            }
            break;

        case 'boolean':
            if (typeof nuevoValor !== 'boolean' && nuevoValor !== 'true' && nuevoValor !== 'false') {
                return { valido: false, mensaje: 'El valor debe ser verdadero o falso' };
            }
            break;

        case 'string':
            if (this.validaciones.opciones && this.validaciones.opciones.length > 0) {
                if (!this.validaciones.opciones.includes(nuevoValor)) {
                    return { valido: false, mensaje: `El valor debe ser una de las opciones: ${this.validaciones.opciones.join(', ')}` };
                }
            }
            break;

        case 'json':
            try {
                if (typeof nuevoValor === 'string') {
                    JSON.parse(nuevoValor);
                }
            } catch (error) {
                return { valido: false, mensaje: 'El valor debe ser un JSON válido' };
            }
            break;
    }

    return { valido: true };
};

// Actualizar valor con validación
configuracionSchema.methods.actualizarValor = async function(nuevoValor, usuarioId) {
    if (!this.esEditable) {
        throw new Error('Esta configuración no es editable desde la interfaz');
    }

    const validacion = this.validarValor(nuevoValor);
    if (!validacion.valido) {
        throw new Error(validacion.mensaje);
    }

    this.valor = nuevoValor;
    this.modificadoPor = usuarioId;

    await this.save();
    return this;
};

// ========================================
// MÉTODOS ESTÁTICOS
// ========================================

// Obtener configuraciones por categoría
configuracionSchema.statics.getPorCategoria = async function(categoria, soloPublicas = false) {
    const filtro = { categoria, isActive: true };
    if (soloPublicas) {
        filtro.esPublica = true;
    }

    return this.find(filtro)
        .sort({ orden: 1 })
        .populate('modificadoPor', 'name')
        .lean();
};

// Obtener todas las configuraciones agrupadas por categoría
configuracionSchema.statics.getTodasAgrupadas = async function(soloPublicas = false) {
    const filtro = { isActive: true };
    if (soloPublicas) {
        filtro.esPublica = true;
    }

    const configuraciones = await this.find(filtro)
        .sort({ categoria: 1, orden: 1 })
        .populate('modificadoPor', 'name')
        .lean();

    // Agrupar por categoría
    const agrupadas = {};
    configuraciones.forEach(config => {
        if (!agrupadas[config.categoria]) {
            agrupadas[config.categoria] = [];
        }
        agrupadas[config.categoria].push(config);
    });

    return agrupadas;
};

// Obtener valor de una configuración por clave
configuracionSchema.statics.getValor = async function(clave, valorDefecto = null) {
    try {
        const config = await this.findOne({ clave, isActive: true });
        if (!config) {
            return valorDefecto;
        }
        return config.getValorParseado();
    } catch (error) {
        console.error(`Error obteniendo configuración ${clave}:`, error);
        return valorDefecto;
    }
};

// Establecer valor de una configuración
configuracionSchema.statics.setValor = async function(clave, valor, usuarioId) {
    const config = await this.findOne({ clave, isActive: true });
    if (!config) {
        throw new Error(`Configuración ${clave} no encontrada`);
    }

    return config.actualizarValor(valor, usuarioId);
};

// Inicializar configuraciones por defecto
configuracionSchema.statics.inicializarDefecto = async function() {
    const configuracionesDefecto = [
        // ===== GENERAL =====
        {
            categoria: 'general',
            clave: 'sistema_nombre',
            valor: 'TaekwondoSys',
            tipo: 'string',
            descripcion: 'Nombre del sistema',
            valorDefecto: 'TaekwondoSys',
            esPublica: true,
            orden: 1
        },
        {
            categoria: 'general',
            clave: 'sistema_email',
            valor: 'contacto@taekwondo.com',
            tipo: 'string',
            descripcion: 'Email de contacto principal',
            valorDefecto: 'contacto@taekwondo.com',
            esPublica: true,
            orden: 2
        },
        {
            categoria: 'general',
            clave: 'sistema_telefono',
            valor: '',
            tipo: 'string',
            descripcion: 'Teléfono de contacto principal',
            valorDefecto: '',
            esPublica: true,
            orden: 3
        },
        {
            categoria: 'general',
            clave: 'sistema_timezone',
            valor: 'America/Mexico_City',
            tipo: 'string',
            descripcion: 'Zona horaria del sistema',
            valorDefecto: 'America/Mexico_City',
            esPublica: false,
            esEditable: false,
            orden: 4
        },

        // ===== EXÁMENES =====
        {
            categoria: 'examenes',
            clave: 'examen_calificacion_minima',
            valor: 60,
            tipo: 'number',
            descripcion: 'Calificación mínima para aprobar un examen',
            valorDefecto: 60,
            validaciones: { min: 0, max: 100 },
            esPublica: true,
            orden: 1
        },
        {
            categoria: 'examenes',
            clave: 'examen_asistencia_minima',
            valor: 75,
            tipo: 'number',
            descripcion: 'Porcentaje mínimo de asistencias para presentar examen',
            valorDefecto: 75,
            validaciones: { min: 0, max: 100 },
            esPublica: true,
            orden: 2
        },
        {
            categoria: 'examenes',
            clave: 'examen_dias_minimos_cinturon',
            valor: 90,
            tipo: 'number',
            descripcion: 'Días mínimos con el cinturón actual antes de examen',
            valorDefecto: 90,
            validaciones: { min: 0 },
            esPublica: true,
            orden: 3
        },
        {
            categoria: 'examenes',
            clave: 'examen_costo_base',
            valor: 500,
            tipo: 'number',
            descripcion: 'Costo base de examen de graduación',
            valorDefecto: 500,
            validaciones: { min: 0 },
            esPublica: true,
            orden: 4
        },
        {
            categoria: 'examenes',
            clave: 'examen_categorias_evaluacion',
            valor: JSON.stringify([
                { nombre: 'Técnica', peso: 40 },
                { nombre: 'Poomsae', peso: 30 },
                { nombre: 'Combate', peso: 20 },
                { nombre: 'Actitud', peso: 10 }
            ]),
            tipo: 'json',
            descripcion: 'Categorías de evaluación predeterminadas para exámenes',
            valorDefecto: JSON.stringify([
                { nombre: 'Técnica', peso: 40 },
                { nombre: 'Poomsae', peso: 30 },
                { nombre: 'Combate', peso: 20 },
                { nombre: 'Actitud', peso: 10 }
            ]),
            esPublica: false,
            orden: 5
        },

        // ===== PAGOS =====
        {
            categoria: 'pagos',
            clave: 'pago_dias_gracia',
            valor: 5,
            tipo: 'number',
            descripcion: 'Días de gracia después del vencimiento',
            valorDefecto: 5,
            validaciones: { min: 0, max: 30 },
            esPublica: true,
            orden: 1
        },
        {
            categoria: 'pagos',
            clave: 'pago_recargo_tardio',
            valor: 10,
            tipo: 'number',
            descripcion: 'Porcentaje de recargo por pago tardío',
            valorDefecto: 10,
            validaciones: { min: 0, max: 100 },
            esPublica: true,
            orden: 2
        },
        {
            categoria: 'pagos',
            clave: 'pago_metodos_habilitados',
            valor: JSON.stringify(['efectivo', 'tarjeta', 'transferencia']),
            tipo: 'json',
            descripcion: 'Métodos de pago habilitados',
            valorDefecto: JSON.stringify(['efectivo', 'tarjeta', 'transferencia']),
            esPublica: true,
            orden: 3
        },
        {
            categoria: 'pagos',
            clave: 'pago_requiere_comprobante',
            valor: false,
            tipo: 'boolean',
            descripcion: 'Requiere comprobante para todos los pagos',
            valorDefecto: false,
            esPublica: false,
            orden: 4
        },

        // ===== ASISTENCIAS =====
        {
            categoria: 'asistencias',
            clave: 'asistencia_tolerancia_retardo',
            valor: 15,
            tipo: 'number',
            descripcion: 'Minutos de tolerancia antes de marcar retardo',
            valorDefecto: 15,
            validaciones: { min: 0, max: 60 },
            esPublica: false,
            orden: 1
        },
        {
            categoria: 'asistencias',
            clave: 'asistencia_dias_justificar',
            valor: 3,
            tipo: 'number',
            descripcion: 'Días para justificar una inasistencia',
            valorDefecto: 3,
            validaciones: { min: 0, max: 30 },
            esPublica: true,
            orden: 2
        },
        {
            categoria: 'asistencias',
            clave: 'asistencia_requiere_justificante',
            valor: false,
            tipo: 'boolean',
            descripcion: 'Requiere justificante médico para inasistencias',
            valorDefecto: false,
            esPublica: false,
            orden: 3
        },

        // ===== NOTIFICACIONES =====
        {
            categoria: 'notificaciones',
            clave: 'notif_email_habilitado',
            valor: false,
            tipo: 'boolean',
            descripcion: 'Habilitar notificaciones por email',
            valorDefecto: false,
            esPublica: false,
            orden: 1
        },
        {
            categoria: 'notificaciones',
            clave: 'notif_email_smtp_host',
            valor: '',
            tipo: 'string',
            descripcion: 'Servidor SMTP para envío de emails',
            valorDefecto: '',
            esPublica: false,
            orden: 2
        },
        {
            categoria: 'notificaciones',
            clave: 'notif_email_smtp_port',
            valor: 587,
            tipo: 'number',
            descripcion: 'Puerto SMTP',
            valorDefecto: 587,
            esPublica: false,
            orden: 3
        },
        {
            categoria: 'notificaciones',
            clave: 'notif_email_smtp_user',
            valor: '',
            tipo: 'string',
            descripcion: 'Usuario SMTP',
            valorDefecto: '',
            esPublica: false,
            orden: 4
        },
        {
            categoria: 'notificaciones',
            clave: 'notif_recordatorio_pagos',
            valor: true,
            tipo: 'boolean',
            descripcion: 'Enviar recordatorios de pagos vencidos',
            valorDefecto: true,
            esPublica: false,
            orden: 5
        },

        // ===== CINTURONES =====
        {
            categoria: 'cinturones',
            clave: 'cinturon_orden_progresion',
            valor: JSON.stringify([
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
                'negro-1'
            ]),
            tipo: 'json',
            descripcion: 'Orden de progresión de cinturones',
            valorDefecto: JSON.stringify([
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
                'negro-1'
            ]),
            esPublica: true,
            esEditable: false,
            orden: 1
        },
        {
            categoria: 'cinturones',
            clave: 'cinturon_tiempo_minimo_blanco',
            valor: 60,
            tipo: 'number',
            descripcion: 'Días mínimos con cinturón blanco',
            valorDefecto: 60,
            validaciones: { min: 0 },
            esPublica: true,
            orden: 2
        },
        {
            categoria: 'cinturones',
            clave: 'cinturon_tiempo_minimo_color',
            valor: 90,
            tipo: 'number',
            descripcion: 'Días mínimos con cinturones de color',
            valorDefecto: 90,
            validaciones: { min: 0 },
            esPublica: true,
            orden: 3
        }
    ];

    for (const configData of configuracionesDefecto) {
        const existe = await this.findOne({ clave: configData.clave });
        if (!existe) {
            await this.create(configData);
        }
    }

    console.log('✅ Configuraciones por defecto inicializadas');
};

// ========================================
// MIDDLEWARE
// ========================================

// Validar valor antes de guardar
configuracionSchema.pre('save', function(next) {
    if (this.isModified('valor')) {
        const validacion = this.validarValor(this.valor);
        if (!validacion.valido) {
            return next(new Error(validacion.mensaje));
        }
    }
    next();
});

// ========================================
// EXPORTAR MODELO
// ========================================
module.exports = mongoose.model('Configuracion', configuracionSchema);