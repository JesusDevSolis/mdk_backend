const mongoose = require('mongoose');

// ─────────────────────────────────────────────────────────────────
// Sub-schema: Nivel de grado por disciplina
// Cada disciplina define su propio sistema de progresión
// ─────────────────────────────────────────────────────────────────
const nivelGradoSchema = new mongoose.Schema({
    orden: {
        type: Number,
        required: true
    },
    clave: {
        type: String,
        required: true,
        trim: true
        // Ejemplo: 'blanco', 'amarillo', 'punta-amarilla', '1-dan', 'nivel-1'
    },
    nombre: {
        type: String,
        required: true,
        trim: true
        // Ejemplo: 'Cinturón Blanco', 'Primer Dan', 'Nivel Dragón 1'
    },
    nombreCoreano: {
        type: String,
        trim: true
        // Ejemplo: '흰 띠' (cinta blanca en coreano)
    },
    color: {
        type: String,
        trim: true
        // Color HEX para UI: '#FFFFFF', '#FFD700', etc.
    },
    colorSecundario: {
        type: String,
        trim: true
        // Para cintas de dos colores (ej. blanco-amarillo)
    },
    tiempoMinimoMeses: {
        type: Number,
        default: 3,
        min: 0
        // Meses mínimos en el nivel anterior para poder examinarse
    },
    asistenciaMinima: {
        type: Number,
        default: 80,
        min: 0,
        max: 100
        // % de asistencia requerida para examen (regla del 80%)
    },
    descripcion: {
        type: String,
        trim: true,
        maxlength: [300, 'La descripción del nivel no puede exceder 300 caracteres']
    },
    icono: {
        type: String,
        trim: true
        // Emoji o nombre de icono: '🥋', 'belt-white', etc.
    }
}, { _id: false });

// ─────────────────────────────────────────────────────────────────
// Schema principal: Disciplina
// ─────────────────────────────────────────────────────────────────
const disciplinaSchema = new mongoose.Schema({

    // ──────────────────────────
    // Identificación
    // ──────────────────────────
    slug: {
        type: String,
        required: [true, 'El slug es requerido'],
        unique: true,
        trim: true,
        lowercase: true,
        enum: [
        'tae-kwon-do',
        'tang-soo-do',
        'hapkido',
        'gumdo',
        'pequenos-dragones'
        ]
        // El slug es el mismo valor que enrollment.programa en Alumno.js
        // Esto garantiza integridad sin FK formal en Mongo
    },
    nombre: {
        type: String,
        required: [true, 'El nombre de la disciplina es requerido'],
        trim: true,
        maxlength: [80, 'El nombre no puede exceder 80 caracteres']
        // Ejemplo: 'Tae Kwon Do'
    },
    nombreCoreano: {
        type: String,
        trim: true,
        maxlength: [50, 'El nombre coreano no puede exceder 50 caracteres']
        // Ejemplo: '태권도'
    },
    nombreChino: {
        type: String,
        trim: true,
        maxlength: [30, 'El nombre en caracteres chinos no puede exceder 30 caracteres']
        // Ejemplo: '武道院' (para TKD en la escuela Bedolla)
    },
    subtitulo: {
        type: String,
        trim: true,
        maxlength: [100, 'El subtítulo no puede exceder 100 caracteres']
        // Ejemplo: 'Arte Marcial Coreano', 'Preescolares (3-5 años)'
    },

    // ──────────────────────────
    // Descripción e Info Pública
    // ──────────────────────────
    descripcion: {
        type: String,
        trim: true,
        maxlength: [2000, 'La descripción no puede exceder 2000 caracteres']
    },
    filosofia: {
        type: String,
        trim: true,
        maxlength: [1000, 'La filosofía no puede exceder 1000 caracteres']
        // Texto filosófico que aparece en el sitio web de la escuela
    },
    beneficios: [{
        type: String,
        trim: true,
        maxlength: [150, 'Cada beneficio no puede exceder 150 caracteres']
        // Lista: ['Disciplina', 'Concentración', 'Autodefensa', ...]
    }],

    // ──────────────────────────
    // Restricciones de Edad
    // ──────────────────────────
    edadMinima: {
        type: Number,
        min: [2, 'La edad mínima no puede ser menor a 2 años'],
        default: 4
        // Pequeños Dragones: 3, TKD/resto: 6+
    },
    edadMaxima: {
        type: Number,
        default: null
        // null = sin límite de edad máxima
    },
    esProgramaInfantil: {
        type: Boolean,
        default: false
        // true solo para Pequeños Dragones → activa campos especiales en formularios
    },

    // ──────────────────────────
    // Logo e Imagen
    // ──────────────────────────
    logo: {
        filename: { type: String, default: null },
        originalName: { type: String, default: null },
        mimetype: { type: String, default: null },
        size: { type: Number, default: null },
        url: { type: String, default: null }
    },

    // ──────────────────────────
    // Sistema de Grados / Niveles
    // ──────────────────────────
    sistemaNiveles: [nivelGradoSchema],
    // Cada disciplina define su propia progresión:
    // - TKD: blanco → blanco-amarillo → ... → negro 9 dan
    // - Tang Soo Do: su propio sistema de cintas
    // - Hapkido: grados propios
    // - Gumdo: niveles del arte del sable
    // - Pequeños Dragones: niveles especiales para preescolar

    tipoSistemaNiveles: {
        type: String,
        enum: ['cinturones', 'grados', 'niveles', 'dans'],
        default: 'cinturones'
        // Afecta cómo se muestra en UI: "Cinturón Blanco" vs "Nivel 1" vs "1er Dan"
    },

    // ──────────────────────────
    // Disponibilidad por Sucursal
    // ──────────────────────────
    sucursales: [{
        sucursal: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sucursal',
        required: true
        },
        activa: {
        type: Boolean,
        default: true
        },
        cuotaMensual: {
        type: Number,
        min: [0, 'La cuota no puede ser negativa'],
        default: 0
        // Permite cuotas diferentes por sucursal para la misma disciplina
        },
        cuotaInscripcion: {
        type: Number,
        min: [0, 'La cuota de inscripción no puede ser negativa'],
        default: 0
        },
        cupoMaximo: {
        type: Number,
        min: [0, 'El cupo no puede ser negativo'],
        default: null
        // null = sin límite de cupo
        }
    }],

    // ──────────────────────────
    // Configuración General
    // ──────────────────────────
    requiereUniforme: {
        type: Boolean,
        default: true
    },
    nombreUniforme: {
        type: String,
        trim: true,
        default: 'Dobok'
        // TKD: 'Dobok', Gumdo: 'Dobok de Gumdo', Pequeños Dragones: 'Uniforme'
    },
    requiereEquipoProteccion: {
        type: Boolean,
        default: true
    },
    organizacionAfiliada: {
        type: String,
        trim: true,
        maxlength: [200, 'La organización afiliada no puede exceder 200 caracteres']
        // Ejemplo: 'International Moo Do Won', 'World Sonbae Gumdo Federation'
    },
    logoOrganizacion: {
        filename: { type: String, default: null },
        url: { type: String, default: null }
    },

    // ──────────────────────────
    // Auditoría
    // ──────────────────────────
    isActive: {
        type: Boolean,
        default: true
    },
    orden: {
        type: Number,
        default: 99
        // Para ordenar disciplinas en el menú/UI
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
    });

    // ─────────────────────────────────────────────────────────────────
    // Índices
    // ─────────────────────────────────────────────────────────────────
    disciplinaSchema.index({ slug: 1 });        // único, búsqueda principal
    disciplinaSchema.index({ isActive: 1 });
    disciplinaSchema.index({ orden: 1 });
    disciplinaSchema.index({ 'sucursales.sucursal': 1 });

    // ─────────────────────────────────────────────────────────────────
    // Virtuals
    // ─────────────────────────────────────────────────────────────────

    // URL del logo
    disciplinaSchema.virtual('logoUrl').get(function() {
    if (this.logo && this.logo.url) {
        if (this.logo.url.startsWith('http')) return this.logo.url;
        const baseUrl = process.env.BASE_URL || 'http://localhost:3005';
        return `${baseUrl}${this.logo.url}`;
    }
    return null;
    });

    // Total de niveles en el sistema de grados
    disciplinaSchema.virtual('totalNiveles').get(function() {
    return this.sistemaNiveles ? this.sistemaNiveles.length : 0;
    });

    // Total de alumnos activos (se calcula en controller cuando sea necesario)
    disciplinaSchema.virtual('totalAlumnos', {
    ref: 'Alumno',
    localField: 'slug',
    foreignField: 'enrollment.programa',
    count: true
    });

    // ─────────────────────────────────────────────────────────────────
    // Métodos de Instancia
    // ─────────────────────────────────────────────────────────────────

    // Obtener el nivel siguiente de un alumno
    disciplinaSchema.methods.getSiguienteNivel = function(claveActual) {
    const index = this.sistemaNiveles.findIndex(n => n.clave === claveActual);
    if (index === -1 || index === this.sistemaNiveles.length - 1) return null;
    return this.sistemaNiveles[index + 1];
    };

    // Verificar si una clave de nivel existe en esta disciplina
    disciplinaSchema.methods.nivelExiste = function(clave) {
    return this.sistemaNiveles.some(n => n.clave === clave);
    };

    // Obtener cuota de una sucursal específica
    disciplinaSchema.methods.getCuotaSucursal = function(sucursalId) {
    const entry = this.sucursales.find(
        s => s.sucursal.toString() === sucursalId.toString() && s.activa
    );
    return entry || null;
    };

    // Verificar si la disciplina está disponible en una sucursal
    disciplinaSchema.methods.disponibleEnSucursal = function(sucursalId) {
    return this.sucursales.some(
        s => s.sucursal.toString() === sucursalId.toString() && s.activa
    );
    };

    // ─────────────────────────────────────────────────────────────────
    // Métodos Estáticos
    // ─────────────────────────────────────────────────────────────────

    // Obtener todas las disciplinas activas con sus datos básicos
    disciplinaSchema.statics.findActivas = function() {
    return this.find({ isActive: true })
        .sort({ orden: 1, nombre: 1 })
        .populate('sucursales.sucursal', 'name address');
    };

    // Obtener disciplinas disponibles en una sucursal
    disciplinaSchema.statics.findBySucursal = function(sucursalId) {
    return this.find({
        isActive: true,
        'sucursales.sucursal': sucursalId,
        'sucursales.activa': true
    }).sort({ orden: 1 });
    };

    // Obtener disciplina por slug (búsqueda principal)
    disciplinaSchema.statics.findBySlug = function(slug) {
    return this.findOne({ slug, isActive: true })
        .populate('sucursales.sucursal', 'name address');
    };

    // ─────────────────────────────────────────────────────────────────
    // Datos Semilla — las 5 disciplinas de la Escuela Bedolla
    // Se usan en el seeder inicial para cargar las disciplinas reales
    // ─────────────────────────────────────────────────────────────────
    disciplinaSchema.statics.getDatosSemilla = function() {
    return [
        {
        slug: 'tae-kwon-do',
        nombre: 'Tae Kwon Do',
        nombreCoreano: '태권도',
        nombreChino: '武道院',
        subtitulo: 'Arte Marcial Coreano',
        descripcion: 'Arte marcial coreano enfocado en patadas y golpes. La Lealtad es el principio fundamental para todo practicante.',
        filosofia: 'Lo importante para todo hombre que practica Tae Kwon Do es la Lealtad, ya que sin esta importante cualidad, no se puede ser un digno Artista Marcial, ni un auténtico Taekwondoín.',
        beneficios: ['Disciplina', 'Concentración', 'Autodefensa', 'Condición física', 'Valores morales'],
        edadMinima: 6,
        edadMaxima: null,
        esProgramaInfantil: false,
        tipoSistemaNiveles: 'cinturones',
        requiereUniforme: true,
        nombreUniforme: 'Dobok',
        requiereEquipoProteccion: true,
        organizacionAfiliada: 'International Moo Do Won - México',
        orden: 1,
        sistemaNiveles: [
            { orden: 1,  clave: 'blanco',           nombre: 'Cinturón Blanco',           color: '#FFFFFF', tiempoMinimoMeses: 0,  asistenciaMinima: 80 },
            { orden: 2,  clave: 'blanco-amarillo',   nombre: 'Cinturón Blanco-Amarillo',  color: '#FFFFFF', colorSecundario: '#FFD700', tiempoMinimoMeses: 3, asistenciaMinima: 80 },
            { orden: 3,  clave: 'amarillo',          nombre: 'Cinturón Amarillo',         color: '#FFD700', tiempoMinimoMeses: 3,  asistenciaMinima: 80 },
            { orden: 4,  clave: 'amarillo-naranja',  nombre: 'Cinturón Amarillo-Naranja', color: '#FFD700', colorSecundario: '#FF8C00', tiempoMinimoMeses: 3, asistenciaMinima: 80 },
            { orden: 5,  clave: 'naranja',           nombre: 'Cinturón Naranja',          color: '#FF8C00', tiempoMinimoMeses: 3,  asistenciaMinima: 80 },
            { orden: 6,  clave: 'naranja-verde',     nombre: 'Cinturón Naranja-Verde',    color: '#FF8C00', colorSecundario: '#228B22', tiempoMinimoMeses: 3, asistenciaMinima: 80 },
            { orden: 7,  clave: 'verde',             nombre: 'Cinturón Verde',            color: '#228B22', tiempoMinimoMeses: 3,  asistenciaMinima: 80 },
            { orden: 8,  clave: 'verde-azul',        nombre: 'Cinturón Verde-Azul',       color: '#228B22', colorSecundario: '#1E3A8A', tiempoMinimoMeses: 3, asistenciaMinima: 80 },
            { orden: 9,  clave: 'azul',              nombre: 'Cinturón Azul',             color: '#1E3A8A', tiempoMinimoMeses: 3,  asistenciaMinima: 80 },
            { orden: 10, clave: 'azul-marron',       nombre: 'Cinturón Azul-Marrón',      color: '#1E3A8A', colorSecundario: '#8B4513', tiempoMinimoMeses: 3, asistenciaMinima: 80 },
            { orden: 11, clave: 'marron',            nombre: 'Cinturón Marrón',           color: '#8B4513', tiempoMinimoMeses: 6,  asistenciaMinima: 85 },
            { orden: 12, clave: 'marron-negro',      nombre: 'Cinturón Marrón-Negro',     color: '#8B4513', colorSecundario: '#000000', tiempoMinimoMeses: 6, asistenciaMinima: 85 },
            { orden: 13, clave: 'negro-1',           nombre: '1er Dan',                   color: '#000000', tiempoMinimoMeses: 12, asistenciaMinima: 90 },
            { orden: 14, clave: 'negro-2',           nombre: '2do Dan',                   color: '#000000', tiempoMinimoMeses: 24, asistenciaMinima: 90 },
            { orden: 15, clave: 'negro-3',           nombre: '3er Dan',                   color: '#000000', tiempoMinimoMeses: 36, asistenciaMinima: 90 },
            { orden: 16, clave: 'negro-4',           nombre: '4to Dan',                   color: '#000000', tiempoMinimoMeses: 48, asistenciaMinima: 90 },
            { orden: 17, clave: 'negro-5',           nombre: '5to Dan (Maestro)',         color: '#000000', tiempoMinimoMeses: 60, asistenciaMinima: 90 },
            { orden: 18, clave: 'negro-6',           nombre: '6to Dan (Maestro)',         color: '#000000', tiempoMinimoMeses: 72, asistenciaMinima: 90 },
            { orden: 19, clave: 'negro-7',           nombre: '7mo Dan (Gran Maestro)',    color: '#000000', tiempoMinimoMeses: 84, asistenciaMinima: 90 },
            { orden: 20, clave: 'negro-8',           nombre: '8vo Dan (Gran Maestro)',    color: '#000000', tiempoMinimoMeses: 96, asistenciaMinima: 90 },
            { orden: 21, clave: 'negro-9',           nombre: '9no Dan (Gran Maestro)',    color: '#000000', tiempoMinimoMeses: 120, asistenciaMinima: 90 }
        ]
        },
        {
        slug: 'tang-soo-do',
        nombre: 'Tang Soo Do',
        nombreCoreano: '당수도',
        nombreChino: '唐手道',
        subtitulo: 'El Camino de la Mano China',
        descripcion: 'Arte marcial tradicional coreano que fusiona técnicas físicas con principios filosóficos y espirituales, combinando golpes, bloqueos y desplazamientos.',
        filosofia: 'El Tang Soo Do se distingue por su enfoque integral, combinando golpes, bloqueos y desplazamientos, todo guiado por una profunda disciplina ética.',
        beneficios: ['Técnica integral', 'Disciplina ética', 'Fortaleza física', 'Equilibrio mental', 'Autodefensa'],
        edadMinima: 6,
        edadMaxima: null,
        esProgramaInfantil: false,
        tipoSistemaNiveles: 'cinturones',
        requiereUniforme: true,
        nombreUniforme: 'Dobok',
        requiereEquipoProteccion: true,
        organizacionAfiliada: 'Pan American Bi Sang Kwan Tang Soo Do Association',
        orden: 2,
        sistemaNiveles: [
            { orden: 1,  clave: 'blanco',   nombre: 'Gup 10 - Cinturón Blanco',   color: '#FFFFFF', tiempoMinimoMeses: 0,  asistenciaMinima: 80 },
            { orden: 2,  clave: 'naranja',  nombre: 'Gup 9 - Cinturón Naranja',   color: '#FF8C00', tiempoMinimoMeses: 3,  asistenciaMinima: 80 },
            { orden: 3,  clave: 'naranja2', nombre: 'Gup 8 - Cinturón Naranja',   color: '#FF8C00', tiempoMinimoMeses: 3,  asistenciaMinima: 80 },
            { orden: 4,  clave: 'verde',    nombre: 'Gup 7 - Cinturón Verde',     color: '#228B22', tiempoMinimoMeses: 3,  asistenciaMinima: 80 },
            { orden: 5,  clave: 'verde2',   nombre: 'Gup 6 - Cinturón Verde',     color: '#228B22', tiempoMinimoMeses: 3,  asistenciaMinima: 80 },
            { orden: 6,  clave: 'rojo',     nombre: 'Gup 5 - Cinturón Rojo',      color: '#DC2626', tiempoMinimoMeses: 3,  asistenciaMinima: 80 },
            { orden: 7,  clave: 'rojo2',    nombre: 'Gup 4 - Cinturón Rojo',      color: '#DC2626', tiempoMinimoMeses: 3,  asistenciaMinima: 80 },
            { orden: 8,  clave: 'rojo3',    nombre: 'Gup 3 - Cinturón Rojo',      color: '#DC2626', tiempoMinimoMeses: 3,  asistenciaMinima: 85 },
            { orden: 9,  clave: 'negro-1',  nombre: 'Cho Dan - 1er Dan',           color: '#000000', tiempoMinimoMeses: 12, asistenciaMinima: 90 },
            { orden: 10, clave: 'negro-2',  nombre: 'Ee Dan - 2do Dan',            color: '#000000', tiempoMinimoMeses: 24, asistenciaMinima: 90 },
            { orden: 11, clave: 'negro-3',  nombre: 'Sam Dan - 3er Dan',           color: '#000000', tiempoMinimoMeses: 36, asistenciaMinima: 90 },
            { orden: 12, clave: 'negro-4',  nombre: 'Sa Dan - 4to Dan',            color: '#000000', tiempoMinimoMeses: 48, asistenciaMinima: 90 },
            { orden: 13, clave: 'negro-5',  nombre: 'Oh Dan - 5to Dan',            color: '#000000', tiempoMinimoMeses: 60, asistenciaMinima: 90 }
        ]
        },
        {
        slug: 'hapkido',
        nombre: 'Hapkido',
        nombreCoreano: '합기도',
        subtitulo: 'Defensa Personal',
        descripcion: 'Arte marcial coreano con principios filosóficos que atienden un desarrollo armonioso de cuerpo, mente y espíritu. Sin importar edad, sexo o condición física.',
        filosofia: 'El Hapkido desarrolla fuerza, equilibrio, rapidez, potencia, concentración, control de inteligencia de la distancia, flexibilidad y relajación.',
        beneficios: ['Autodefensa efectiva', 'Coordinación', 'Equilibrio', 'Concentración', 'Flexibilidad', 'Para todas las edades'],
        edadMinima: 6,
        edadMaxima: null,
        esProgramaInfantil: false,
        tipoSistemaNiveles: 'cinturones',
        requiereUniforme: true,
        nombreUniforme: 'Dobok',
        requiereEquipoProteccion: true,
        organizacionAfiliada: 'International Sonbae Hapkido Association',
        orden: 3,
        sistemaNiveles: [
            { orden: 1,  clave: 'blanco',   nombre: 'Cinturón Blanco',   color: '#FFFFFF', tiempoMinimoMeses: 0,  asistenciaMinima: 80 },
            { orden: 2,  clave: 'amarillo', nombre: 'Cinturón Amarillo', color: '#FFD700', tiempoMinimoMeses: 3,  asistenciaMinima: 80 },
            { orden: 3,  clave: 'verde',    nombre: 'Cinturón Verde',    color: '#228B22', tiempoMinimoMeses: 3,  asistenciaMinima: 80 },
            { orden: 4,  clave: 'azul',     nombre: 'Cinturón Azul',     color: '#1E3A8A', tiempoMinimoMeses: 6,  asistenciaMinima: 80 },
            { orden: 5,  clave: 'rojo',     nombre: 'Cinturón Rojo',     color: '#DC2626', tiempoMinimoMeses: 6,  asistenciaMinima: 85 },
            { orden: 6,  clave: 'negro-1',  nombre: '1er Dan',           color: '#000000', tiempoMinimoMeses: 12, asistenciaMinima: 90 },
            { orden: 7,  clave: 'negro-2',  nombre: '2do Dan',           color: '#000000', tiempoMinimoMeses: 24, asistenciaMinima: 90 },
            { orden: 8,  clave: 'negro-3',  nombre: '3er Dan',           color: '#000000', tiempoMinimoMeses: 36, asistenciaMinima: 90 },
            { orden: 9,  clave: 'negro-4',  nombre: '4to Dan',           color: '#000000', tiempoMinimoMeses: 48, asistenciaMinima: 90 },
            { orden: 10, clave: 'negro-5',  nombre: '5to Dan (Maestro)', color: '#000000', tiempoMinimoMeses: 60, asistenciaMinima: 90 }
        ]
        },
        {
        slug: 'gumdo',
        nombre: 'Gumdo',
        nombreCoreano: '검도',
        subtitulo: 'Arte del Sable Coreano',
        descripcion: 'Arte marcial basado en coordinación, agilidad y toma de decisiones. Se aprende a moverse con control mediante el manejo seguro de la espada de práctica.',
        filosofia: 'En el Gumdo se cultiva la armonía, la fluidez y la disciplina mediante el manejo seguro y formativo de la espada de práctica, desarrollando concentración, equilibrio y confianza personal.',
        beneficios: ['Coordinación', 'Concentración', 'Equilibrio', 'Confianza personal', 'Precisión', 'Para niños y adultos'],
        edadMinima: 6,
        edadMaxima: null,
        esProgramaInfantil: false,
        tipoSistemaNiveles: 'grados',
        requiereUniforme: true,
        nombreUniforme: 'Dobok de Gumdo',
        requiereEquipoProteccion: false,
        organizacionAfiliada: 'World Sonbae Gumdo Federation',
        orden: 4,
        sistemaNiveles: [
            { orden: 1,  clave: 'gup-8',   nombre: 'Gup 8 - Principiante',     tiempoMinimoMeses: 0,  asistenciaMinima: 80 },
            { orden: 2,  clave: 'gup-7',   nombre: 'Gup 7',                    tiempoMinimoMeses: 3,  asistenciaMinima: 80 },
            { orden: 3,  clave: 'gup-6',   nombre: 'Gup 6',                    tiempoMinimoMeses: 3,  asistenciaMinima: 80 },
            { orden: 4,  clave: 'gup-5',   nombre: 'Gup 5',                    tiempoMinimoMeses: 3,  asistenciaMinima: 80 },
            { orden: 5,  clave: 'gup-4',   nombre: 'Gup 4',                    tiempoMinimoMeses: 3,  asistenciaMinima: 80 },
            { orden: 6,  clave: 'gup-3',   nombre: 'Gup 3',                    tiempoMinimoMeses: 6,  asistenciaMinima: 80 },
            { orden: 7,  clave: 'gup-2',   nombre: 'Gup 2',                    tiempoMinimoMeses: 6,  asistenciaMinima: 85 },
            { orden: 8,  clave: 'gup-1',   nombre: 'Gup 1 - Pre Dan',          tiempoMinimoMeses: 6,  asistenciaMinima: 85 },
            { orden: 9,  clave: 'dan-1',   nombre: '1er Dan',                  tiempoMinimoMeses: 12, asistenciaMinima: 90 },
            { orden: 10, clave: 'dan-2',   nombre: '2do Dan',                  tiempoMinimoMeses: 24, asistenciaMinima: 90 },
            { orden: 11, clave: 'dan-3',   nombre: '3er Dan (Maestro)',        tiempoMinimoMeses: 36, asistenciaMinima: 90 }
        ]
        },
        {
        slug: 'pequenos-dragones',
        nombre: 'Pequeños Dragones',
        nombreChino: '武道院',
        subtitulo: 'Artes Marciales Preescolares (3-5 años)',
        descripcion: 'Programa diseñado especialmente para niños en edad preescolar. Fundamentado en principios pedagógicos que estimulan el desarrollo afectivo-social, intelectual y psicomotor.',
        filosofia: 'Ayudamos a los pequeños a desarrollar hábitos positivos, mejorar su coordinación, concentración y autoestima, mientras se divierten aprendiendo los fundamentos de las artes marciales coreanas.',
        beneficios: ['Coordinación motora', 'Atención y concentración', 'Valores y respeto', 'Disciplina', 'Autoestima', 'Socialización'],
        edadMinima: 3,
        edadMaxima: 5,
        esProgramaInfantil: true,
        tipoSistemaNiveles: 'niveles',
        requiereUniforme: true,
        nombreUniforme: 'Uniforme Pequeños Dragones',
        requiereEquipoProteccion: false,
        organizacionAfiliada: 'Escuela de Artes Marciales Koreanas Bedolla',
        orden: 5,
        sistemaNiveles: [
            { orden: 1, clave: 'dragon-1', nombre: 'Dragón Nivel 1 - Explorador', color: '#F59E0B', icono: '🐉', tiempoMinimoMeses: 3, asistenciaMinima: 70 },
            { orden: 2, clave: 'dragon-2', nombre: 'Dragón Nivel 2 - Aprendiz',   color: '#10B981', icono: '🐉', tiempoMinimoMeses: 3, asistenciaMinima: 70 },
            { orden: 3, clave: 'dragon-3', nombre: 'Dragón Nivel 3 - Valiente',   color: '#3B82F6', icono: '🐉', tiempoMinimoMeses: 3, asistenciaMinima: 70 },
            { orden: 4, clave: 'dragon-4', nombre: 'Dragón Nivel 4 - Guardián',   color: '#8B5CF6', icono: '🐉', tiempoMinimoMeses: 3, asistenciaMinima: 70 },
            { orden: 5, clave: 'dragon-5', nombre: 'Dragón Nivel 5 - Campeón',    color: '#EF4444', icono: '🔥', tiempoMinimoMeses: 4, asistenciaMinima: 75 }
        ]
        }
    ];
};

// ─────────────────────────────────────────────────────────────────
const Disciplina = mongoose.model('Disciplina', disciplinaSchema);
module.exports = Disciplina;