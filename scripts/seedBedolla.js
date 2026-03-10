/**
 * ══════════════════════════════════════════════════════════════════════════
 *  SEEDER — Escuela de Artes Marciales Koreanas "Bedolla"
 *  Ruta: BackEnd-MDK/src/scripts/seedBedolla.js
 * 
 *  Crea/actualiza en MongoDB Atlas (idempotente):
 *    1. Sucursal Bedolla — San Cristóbal de las Casas, Chiapas
 *    2. 5 Disciplinas    — con niveles y cinturones completos
 *    3. Admin Bedolla    — usuario administrador real
 * 
 *  Uso:
 *    cd BackEnd-MDK
 *    node src/scripts/seedBedolla.js
 * ══════════════════════════════════════════════════════════════════════════
 */

const mongoose = require('mongoose')
const bcrypt   = require('bcryptjs')
require('dotenv').config()

// ── Colores para logs en consola ──────────────────────────────────────────────
const C = {
    reset:  '\x1b[0m',
    green:  '\x1b[32m',
    yellow: '\x1b[33m',
    blue:   '\x1b[34m',
    red:    '\x1b[31m',
    bold:   '\x1b[1m',
    cyan:   '\x1b[36m',
}
const log   = (msg)  => console.log(`${C.blue}ℹ${C.reset}  ${msg}`)
const ok    = (msg)  => console.log(`${C.green}✅${C.reset} ${msg}`)
const warn  = (msg)  => console.log(`${C.yellow}⚠️${C.reset}  ${msg}`)
const error = (msg)  => console.log(`${C.red}❌${C.reset} ${msg}`)
const title = (msg)  => console.log(`\n${C.bold}${C.cyan}${'═'.repeat(60)}${C.reset}\n${C.bold}  ${msg}${C.reset}\n${'─'.repeat(60)}`)

// ── Conexión a MongoDB ────────────────────────────────────────────────────────
const connectDB = async () => {
    const uri = process.env.MONGODB_URI
    if (!uri) {
        error('MONGODB_URI no está definida en .env')
        process.exit(1)
    }
    await mongoose.connect(uri)
    ok(`Conectado a MongoDB: ${mongoose.connection.host}`)
}

// ════════════════════════════════════════════════════════════════════════════
//  ESQUEMAS INLINE (para no depender de imports con rutas relativas)
// ════════════════════════════════════════════════════════════════════════════

// ── User ─────────────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
    name:      { type: String, required: true },
    email:     { type: String, required: true, unique: true, lowercase: true },
    password:  { type: String, required: true },
    role:      { type: String, enum: ['admin', 'instructor', 'recepcionista'], default: 'admin' },
    sucursal:  { type: mongoose.Schema.Types.ObjectId, ref: 'Sucursal' },
    isActive:  { type: Boolean, default: true },
}, { timestamps: true })

// ── Sucursal ──────────────────────────────────────────────────────────────────
const sucursalSchema = new mongoose.Schema({
    name:        { type: String, required: true },
    address: {
        street:       String,
        neighborhood: String,
        city:         String,
        state:        String,
        zipCode:      String,
        country:      { type: String, default: 'México' },
    },
    contact: {
        phone:    String,
        email:    String,
        whatsapp: String,
        website:  String,
    },
    schedule: {
        openTime:  String,
        closeTime: String,
        workDays:  [String],
    },
    capacity:   { type: Number, default: 50 },
    isActive:   { type: Boolean, default: true },
    description: String,
    notes:       String,
}, { timestamps: true })

// ── Disciplina ────────────────────────────────────────────────────────────────
const nivelSchema = new mongoose.Schema({
    orden:              { type: Number, required: true },
    clave:              { type: String, required: true },
    nombre:             { type: String, required: true },
    color:              String,
    colorSecundario:    String,
    tiempoMinimoMeses:  { type: Number, default: 3 },
    asistenciaMinima:   { type: Number, default: 24 },
}, { _id: false })

const disciplinaSchema = new mongoose.Schema({
    slug:              { type: String, required: true, unique: true },
    nombre:            { type: String, required: true },
    nombreCoreano:     String,
    subtitulo:         String,
    descripcion:       String,
    filosofia:         String,
    edadMinima:        { type: Number, default: 4 },
    edadMaxima:        Number,
    esProgramaInfantil:{ type: Boolean, default: false },
    tipoSistemaNiveles:{ type: String, enum: ['cinturones','grados','niveles','dans'], default: 'cinturones' },
    sistemaNiveles:    [nivelSchema],
    requiereUniforme:  { type: Boolean, default: true },
    nombreUniforme:    String,
    organizacionAfiliada: String,
    isActive:          { type: Boolean, default: true },
}, { timestamps: true })

// ── Modelos (con guard para evitar re-registro en ejecuciones sucesivas) ──────
const User       = mongoose.models.User       || mongoose.model('User',       userSchema)
const Sucursal   = mongoose.models.Sucursal   || mongoose.model('Sucursal',   sucursalSchema)
const Disciplina = mongoose.models.Disciplina || mongoose.model('Disciplina', disciplinaSchema)

// ════════════════════════════════════════════════════════════════════════════
//  DATOS REALES — ESCUELA BEDOLLA
// ════════════════════════════════════════════════════════════════════════════

// ── 1. SUCURSAL ───────────────────────────────────────────────────────────────
const SUCURSAL_BEDOLLA = {
    name: 'Escuela de Artes Marciales Koreanas "Bedolla"',
    address: {
        street:       'Av. Insurgentes s/n',
        neighborhood: 'Centro',
        city:         'San Cristóbal de las Casas',
        state:        'Chiapas',
        zipCode:      '29200',
        country:      'México',
    },
    contact: {
        phone:    '9673762824',
        email:    'artesmarcialesbedolla@gmail.com',
        whatsapp: '9673762824',
        website:  'https://www.ambedolla.com',
    },
    schedule: {
        openTime:  '07:00',
        closeTime: '21:00',
        workDays:  ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
    },
    capacity:    80,
    isActive:    true,
    description: 'Fundada por SBN. Filiberto Bedolla Figueroa. Escuela afiliada a International Moo Do Won, Pan American Bi Sang Kwan Tang Soo Do Assn., International Sonbae Hapkido Association y World Sonbae Gumdo Federation.',
    notes:       'Director actual: SBN. Héctor Bedolla Bermúdez',
}

// ── 2. ADMIN BEDOLLA ──────────────────────────────────────────────────────────
const ADMIN_BEDOLLA = {
    name:  'Héctor Bedolla Bermúdez',
    email: 'admin@ambedolla.com',
    // Contraseña inicial — CAMBIAR en primer login
    passwordPlain: 'Bedolla2026!',
    role: 'admin',
}

// ── 3. DISCIPLINAS ────────────────────────────────────────────────────────────
const DISCIPLINAS = [

    // ── TAE KWON DO ─────────────────────────────────────────────────────────────
    {
        slug:              'tae-kwon-do',
        nombre:            'Tae Kwon Do',
        nombreCoreano:     '태권도',
        subtitulo:         'El arte del pie y el puño',
        descripcion:       'Arte marcial coreano reconocido mundialmente como deporte olímpico. Enfatiza el uso de patadas de alta velocidad y técnicas de puño.',
        filosofia:         'Cortesía, integridad, perseverancia, autocontrol y espíritu indomable.',
        edadMinima:        6,
        tipoSistemaNiveles:'cinturones',
        requiereUniforme:  true,
        nombreUniforme:    'Dobok',
        organizacionAfiliada: 'International Moo Do Won',
        sistemaNiveles: [
            { orden:  1, clave: 'blanco',          nombre: 'Blanco',           color: '#FFFFFF', colorSecundario: '#E5E7EB', tiempoMinimoMeses: 2,  asistenciaMinima: 16 },
            { orden:  2, clave: 'blanco-amarillo', nombre: 'Blanco-Amarillo',  color: '#FFFDE7', colorSecundario: '#FEF08A', tiempoMinimoMeses: 2,  asistenciaMinima: 16 },
            { orden:  3, clave: 'amarillo',        nombre: 'Amarillo',         color: '#EAB308', colorSecundario: '#CA8A04', tiempoMinimoMeses: 3,  asistenciaMinima: 24 },
            { orden:  4, clave: 'amarillo-naranja',nombre: 'Amarillo-Naranja', color: '#F59E0B', colorSecundario: '#D97706', tiempoMinimoMeses: 3,  asistenciaMinima: 24 },
            { orden:  5, clave: 'naranja',         nombre: 'Naranja',          color: '#F97316', colorSecundario: '#EA580C', tiempoMinimoMeses: 3,  asistenciaMinima: 24 },
            { orden:  6, clave: 'naranja-verde',   nombre: 'Naranja-Verde',    color: '#FB923C', colorSecundario: '#16A34A', tiempoMinimoMeses: 3,  asistenciaMinima: 24 },
            { orden:  7, clave: 'verde',           nombre: 'Verde',            color: '#22C55E', colorSecundario: '#15803D', tiempoMinimoMeses: 3,  asistenciaMinima: 24 },
            { orden:  8, clave: 'verde-azul',      nombre: 'Verde-Azul',       color: '#10B981', colorSecundario: '#2563EB', tiempoMinimoMeses: 3,  asistenciaMinima: 24 },
            { orden:  9, clave: 'azul',            nombre: 'Azul',             color: '#3B82F6', colorSecundario: '#1D4ED8', tiempoMinimoMeses: 4,  asistenciaMinima: 32 },
            { orden: 10, clave: 'azul-marron',     nombre: 'Azul-Marrón',      color: '#60A5FA', colorSecundario: '#92400E', tiempoMinimoMeses: 4,  asistenciaMinima: 32 },
            { orden: 11, clave: 'marron',          nombre: 'Marrón',           color: '#92400E', colorSecundario: '#78350F', tiempoMinimoMeses: 4,  asistenciaMinima: 32 },
            { orden: 12, clave: 'marron-negro',    nombre: 'Marrón-Negro',     color: '#78350F', colorSecundario: '#111827', tiempoMinimoMeses: 6,  asistenciaMinima: 48 },
            { orden: 13, clave: 'negro-1',         nombre: 'Negro 1° Dan',     color: '#111827', colorSecundario: '#D97706', tiempoMinimoMeses: 12, asistenciaMinima: 96 },
            { orden: 14, clave: 'negro-2',         nombre: 'Negro 2° Dan',     color: '#111827', colorSecundario: '#D97706', tiempoMinimoMeses: 24, asistenciaMinima: 192 },
            { orden: 15, clave: 'negro-3',         nombre: 'Negro 3° Dan',     color: '#111827', colorSecundario: '#D97706', tiempoMinimoMeses: 36, asistenciaMinima: 288 },
            { orden: 16, clave: 'negro-4',         nombre: 'Negro 4° Dan',     color: '#111827', colorSecundario: '#D97706', tiempoMinimoMeses: 48, asistenciaMinima: 384 },
            { orden: 17, clave: 'negro-5',         nombre: 'Negro 5° Dan',     color: '#111827', colorSecundario: '#D97706', tiempoMinimoMeses: 60, asistenciaMinima: 480 },
            { orden: 18, clave: 'negro-6',         nombre: 'Negro 6° Dan',     color: '#111827', colorSecundario: '#D97706', tiempoMinimoMeses: 72, asistenciaMinima: 576 },
            { orden: 19, clave: 'negro-7',         nombre: 'Negro 7° Dan',     color: '#111827', colorSecundario: '#D97706', tiempoMinimoMeses: 84, asistenciaMinima: 672 },
            { orden: 20, clave: 'negro-8',         nombre: 'Negro 8° Dan',     color: '#111827', colorSecundario: '#D97706', tiempoMinimoMeses: 96, asistenciaMinima: 768 },
            { orden: 21, clave: 'negro-9',         nombre: 'Negro 9° Dan',     color: '#111827', colorSecundario: '#D97706', tiempoMinimoMeses: 120, asistenciaMinima: 960 },
        ],
    },

    // ── TANG SOO DO ──────────────────────────────────────────────────────────────
    {
        slug:              'tang-soo-do',
        nombre:            'Tang Soo Do',
        nombreCoreano:     '당수도',
        subtitulo:         'El camino de la mano china',
        descripcion:       'Arte marcial coreano tradicional que combina técnicas de patadas, puños, bloqueos y defensas. Influenciado por el kung-fu chino y el karate japonés.',
        filosofia:         'Lealtad, concentración, perseverancia, integridad, control, humildad.',
        edadMinima:        7,
        tipoSistemaNiveles:'grados',
        requiereUniforme:  true,
        nombreUniforme:    'Dobok Tang Soo Do',
        organizacionAfiliada: 'Pan American Bi Sang Kwan Tang Soo Do Assn.',
        sistemaNiveles: [
            { orden:  1, clave: 'gup-10', nombre: 'Gup 10 — Blanco',         color: '#FFFFFF', colorSecundario: '#E5E7EB', tiempoMinimoMeses: 3,  asistenciaMinima: 24 },
            { orden:  2, clave: 'gup-9',  nombre: 'Gup 9 — Naranja',         color: '#F97316', colorSecundario: '#EA580C', tiempoMinimoMeses: 3,  asistenciaMinima: 24 },
            { orden:  3, clave: 'gup-8',  nombre: 'Gup 8 — Naranja II',      color: '#FB923C', colorSecundario: '#EA580C', tiempoMinimoMeses: 3,  asistenciaMinima: 24 },
            { orden:  4, clave: 'gup-7',  nombre: 'Gup 7 — Verde',           color: '#22C55E', colorSecundario: '#15803D', tiempoMinimoMeses: 3,  asistenciaMinima: 24 },
            { orden:  5, clave: 'gup-6',  nombre: 'Gup 6 — Verde II',        color: '#16A34A', colorSecundario: '#15803D', tiempoMinimoMeses: 3,  asistenciaMinima: 24 },
            { orden:  6, clave: 'gup-5',  nombre: 'Gup 5 — Rojo',            color: '#EF4444', colorSecundario: '#B91C1C', tiempoMinimoMeses: 4,  asistenciaMinima: 32 },
            { orden:  7, clave: 'gup-4',  nombre: 'Gup 4 — Rojo II',         color: '#DC2626', colorSecundario: '#B91C1C', tiempoMinimoMeses: 4,  asistenciaMinima: 32 },
            { orden:  8, clave: 'gup-3',  nombre: 'Gup 3 — Rojo III',        color: '#B91C1C', colorSecundario: '#991B1B', tiempoMinimoMeses: 6,  asistenciaMinima: 48 },
            { orden:  9, clave: 'gup-2',  nombre: 'Gup 2 — Rojo-Negro',      color: '#991B1B', colorSecundario: '#111827', tiempoMinimoMeses: 6,  asistenciaMinima: 48 },
            { orden: 10, clave: 'gup-1',  nombre: 'Gup 1 — Candidato Negro', color: '#374151', colorSecundario: '#111827', tiempoMinimoMeses: 9,  asistenciaMinima: 72 },
            { orden: 11, clave: 'cho-dan', nombre: 'Cho Dan — 1° Dan',       color: '#111827', colorSecundario: '#D97706', tiempoMinimoMeses: 12, asistenciaMinima: 96 },
            { orden: 12, clave: 'ee-dan',  nombre: 'Ee Dan — 2° Dan',        color: '#111827', colorSecundario: '#D97706', tiempoMinimoMeses: 24, asistenciaMinima: 192 },
            { orden: 13, clave: 'sam-dan', nombre: 'Sam Dan — 3° Dan',       color: '#111827', colorSecundario: '#D97706', tiempoMinimoMeses: 36, asistenciaMinima: 288 },
            { orden: 14, clave: 'sa-dan',  nombre: 'Sa Dan — 4° Dan',        color: '#111827', colorSecundario: '#D97706', tiempoMinimoMeses: 48, asistenciaMinima: 384 },
            { orden: 15, clave: 'oh-dan',  nombre: 'Oh Dan — 5° Dan',        color: '#111827', colorSecundario: '#D97706', tiempoMinimoMeses: 60, asistenciaMinima: 480 },
        ],
    },

    // ── HAPKIDO ──────────────────────────────────────────────────────────────────
    {
        slug:              'hapkido',
        nombre:            'Hapkido',
        nombreCoreano:     '합기도',
        subtitulo:         'El camino de la energía coordinada',
        descripcion:       'Arte marcial coreano que enfatiza el uso de la energía del oponente. Incluye técnicas de lanzamientos, luxaciones articulares, patadas y golpes.',
        filosofia:         'Armonía, flujo de energía, redirección de la fuerza del oponente.',
        edadMinima:        8,
        tipoSistemaNiveles:'cinturones',
        requiereUniforme:  true,
        nombreUniforme:    'Dobok Hapkido',
        organizacionAfiliada: 'International Sonbae Hapkido Association',
        sistemaNiveles: [
            { orden:  1, clave: 'blanco',    nombre: 'Blanco',          color: '#FFFFFF', colorSecundario: '#E5E7EB', tiempoMinimoMeses: 3,  asistenciaMinima: 24 },
            { orden:  2, clave: 'amarillo',  nombre: 'Amarillo',        color: '#EAB308', colorSecundario: '#CA8A04', tiempoMinimoMeses: 3,  asistenciaMinima: 24 },
            { orden:  3, clave: 'naranja',   nombre: 'Naranja',         color: '#F97316', colorSecundario: '#EA580C', tiempoMinimoMeses: 3,  asistenciaMinima: 24 },
            { orden:  4, clave: 'verde',     nombre: 'Verde',           color: '#22C55E', colorSecundario: '#15803D', tiempoMinimoMeses: 4,  asistenciaMinima: 32 },
            { orden:  5, clave: 'azul',      nombre: 'Azul',            color: '#3B82F6', colorSecundario: '#1D4ED8', tiempoMinimoMeses: 4,  asistenciaMinima: 32 },
            { orden:  6, clave: 'rojo',      nombre: 'Rojo',            color: '#EF4444', colorSecundario: '#B91C1C', tiempoMinimoMeses: 6,  asistenciaMinima: 48 },
            { orden:  7, clave: 'marron',    nombre: 'Marrón',          color: '#92400E', colorSecundario: '#78350F', tiempoMinimoMeses: 6,  asistenciaMinima: 48 },
            { orden:  8, clave: 'negro-1',   nombre: 'Negro 1° Dan',    color: '#111827', colorSecundario: '#D97706', tiempoMinimoMeses: 12, asistenciaMinima: 96 },
            { orden:  9, clave: 'negro-2',   nombre: 'Negro 2° Dan',    color: '#111827', colorSecundario: '#D97706', tiempoMinimoMeses: 24, asistenciaMinima: 192 },
            { orden: 10, clave: 'negro-3',   nombre: 'Negro 3° Dan',    color: '#111827', colorSecundario: '#D97706', tiempoMinimoMeses: 36, asistenciaMinima: 288 },
        ],
    },

    // ── GUMDO ────────────────────────────────────────────────────────────────────
    {
        slug:              'gumdo',
        nombre:            'Gumdo',
        nombreCoreano:     '검도',
        subtitulo:         'El camino de la espada',
        descripcion:       'Arte marcial coreano de la espada. Desarrolla concentración, disciplina mental y técnica de combate con espada. Utiliza el Gum (espada de madera) para práctica.',
        filosofia:         'Mente, espada y cuerpo como uno. Rectitud y valentía.',
        edadMinima:        10,
        tipoSistemaNiveles:'grados',
        requiereUniforme:  true,
        nombreUniforme:    'Dobok Gumdo',
        organizacionAfiliada: 'World Sonbae Gumdo Federation',
        sistemaNiveles: [
            { orden:  1, clave: 'gup-8',    nombre: 'Gup 8 — Blanco',        color: '#FFFFFF', colorSecundario: '#E5E7EB', tiempoMinimoMeses: 3,  asistenciaMinima: 24 },
            { orden:  2, clave: 'gup-7',    nombre: 'Gup 7 — Amarillo',      color: '#EAB308', colorSecundario: '#CA8A04', tiempoMinimoMeses: 3,  asistenciaMinima: 24 },
            { orden:  3, clave: 'gup-6',    nombre: 'Gup 6 — Naranja',       color: '#F97316', colorSecundario: '#EA580C', tiempoMinimoMeses: 3,  asistenciaMinima: 24 },
            { orden:  4, clave: 'gup-5',    nombre: 'Gup 5 — Verde',         color: '#22C55E', colorSecundario: '#15803D', tiempoMinimoMeses: 3,  asistenciaMinima: 24 },
            { orden:  5, clave: 'gup-4',    nombre: 'Gup 4 — Azul',          color: '#3B82F6', colorSecundario: '#1D4ED8', tiempoMinimoMeses: 4,  asistenciaMinima: 32 },
            { orden:  6, clave: 'gup-3',    nombre: 'Gup 3 — Rojo',          color: '#EF4444', colorSecundario: '#B91C1C', tiempoMinimoMeses: 4,  asistenciaMinima: 32 },
            { orden:  7, clave: 'gup-2',    nombre: 'Gup 2 — Marrón',        color: '#92400E', colorSecundario: '#78350F', tiempoMinimoMeses: 6,  asistenciaMinima: 48 },
            { orden:  8, clave: 'gup-1',    nombre: 'Gup 1 — Candidato',     color: '#374151', colorSecundario: '#111827', tiempoMinimoMeses: 6,  asistenciaMinima: 48 },
            { orden:  9, clave: 'il-dan',   nombre: 'Il Dan — 1° Dan',       color: '#111827', colorSecundario: '#D97706', tiempoMinimoMeses: 12, asistenciaMinima: 96 },
            { orden: 10, clave: 'ee-dan',   nombre: 'Ee Dan — 2° Dan',       color: '#111827', colorSecundario: '#D97706', tiempoMinimoMeses: 24, asistenciaMinima: 192 },
            { orden: 11, clave: 'sam-dan',  nombre: 'Sam Dan — 3° Dan',      color: '#111827', colorSecundario: '#D97706', tiempoMinimoMeses: 36, asistenciaMinima: 288 },
        ],
    },

    // ── PEQUEÑOS DRAGONES ────────────────────────────────────────────────────────
    {
        slug:               'pequenos-dragones',
        nombre:             'Pequeños Dragones',
        nombreCoreano:      '작은 용',
        subtitulo:          'Artes marciales para los más pequeños',
        descripcion:        'Programa especial diseñado para niños de 3 a 5 años. Desarrolla coordinación motriz, disciplina, respeto y habilidades sociales a través del juego y las artes marciales.',
        filosofia:          'Aprender a través del juego. Disciplina, respeto y diversión.',
        edadMinima:         3,
        edadMaxima:         5,
        esProgramaInfantil: true,
        tipoSistemaNiveles: 'niveles',
        requiereUniforme:   true,
        nombreUniforme:     'Dobok Pequeños Dragones',
        sistemaNiveles: [
            { orden: 1, clave: 'dragon-1', nombre: 'Dragón 1 — Iniciante',    color: '#FDE68A', colorSecundario: '#F59E0B', tiempoMinimoMeses: 3, asistenciaMinima: 12 },
            { orden: 2, clave: 'dragon-2', nombre: 'Dragón 2 — Explorador',   color: '#86EFAC', colorSecundario: '#22C55E', tiempoMinimoMeses: 3, asistenciaMinima: 12 },
            { orden: 3, clave: 'dragon-3', nombre: 'Dragón 3 — Aprendiz',     color: '#93C5FD', colorSecundario: '#3B82F6', tiempoMinimoMeses: 3, asistenciaMinima: 12 },
            { orden: 4, clave: 'dragon-4', nombre: 'Dragón 4 — Avanzado',     color: '#C4B5FD', colorSecundario: '#8B5CF6', tiempoMinimoMeses: 3, asistenciaMinima: 12 },
            { orden: 5, clave: 'dragon-5', nombre: 'Dragón 5 — Maestro',      color: '#FCA5A5', colorSecundario: '#EF4444', tiempoMinimoMeses: 3, asistenciaMinima: 12 },
        ],
    },
]

// ════════════════════════════════════════════════════════════════════════════
//  FUNCIONES DE SEED
// ════════════════════════════════════════════════════════════════════════════

/**
 * Crea o actualiza la sucursal Bedolla
 * Retorna el documento de la sucursal
 */
const seedSucursal = async () => {
    title('PASO 1 — SUCURSAL BEDOLLA')

    const existing = await Sucursal.findOne({ 'contact.email': SUCURSAL_BEDOLLA.contact.email })

    if (existing) {
        warn(`Sucursal ya existe (ID: ${existing._id}) — actualizando datos...`)
        const updated = await Sucursal.findByIdAndUpdate(
        existing._id,
        { $set: SUCURSAL_BEDOLLA },
        { new: true }
        )
        ok(`Sucursal actualizada: "${updated.name}"`)
        ok(`  ID:       ${updated._id}`)
        ok(`  Ciudad:   ${updated.address.city}, ${updated.address.state}`)
        ok(`  Teléfono: ${updated.contact.phone}`)
        return updated
    }

    const sucursal = await Sucursal.create(SUCURSAL_BEDOLLA)
    ok(`Sucursal creada: "${sucursal.name}"`)
    ok(`  ID:       ${sucursal._id}`)
    ok(`  Ciudad:   ${sucursal.address.city}, ${sucursal.address.state}`)
    ok(`  Teléfono: ${sucursal.contact.phone}`)
    return sucursal
}

/**
 * Crea o actualiza el admin Bedolla
 */
const seedAdmin = async (sucursalId) => {
    title('PASO 2 — ADMIN BEDOLLA')

    const existing = await User.findOne({ email: ADMIN_BEDOLLA.email })

    if (existing) {
        warn(`Admin ya existe (${ADMIN_BEDOLLA.email}) — actualizando nombre y sucursal...`)
        const updated = await User.findByIdAndUpdate(
        existing._id,
        { $set: { name: ADMIN_BEDOLLA.name, role: ADMIN_BEDOLLA.role, sucursal: sucursalId } },
        { new: true }
        )
        ok(`Admin actualizado: "${updated.name}"`)
        ok(`  Email: ${updated.email}`)
        ok(`  ID:    ${updated._id}`)
        warn(`  ⚠️  Contraseña NO modificada (ya existe). Usa el sistema si necesitas cambiarla.`)
        return updated
    }

    const hashedPassword = await bcrypt.hash(ADMIN_BEDOLLA.passwordPlain, 10)
    const admin = await User.create({
        name:     ADMIN_BEDOLLA.name,
        email:    ADMIN_BEDOLLA.email,
        password: hashedPassword,
        role:     ADMIN_BEDOLLA.role,
        sucursal: sucursalId,
        isActive: true,
    })

    ok(`Admin creado: "${admin.name}"`)
    ok(`  Email:      ${admin.email}`)
    ok(`  ID:         ${admin._id}`)
    ok(`  Contraseña: ${ADMIN_BEDOLLA.passwordPlain}  ← CAMBIA ESTO EN EL PRIMER LOGIN`)
    return admin
}

/**
 * Crea o actualiza las 5 disciplinas
 */
const seedDisciplinas = async () => {
    title('PASO 3 — DISCIPLINAS (5)')

    const resultados = []

    for (const datos of DISCIPLINAS) {
        const existing = await Disciplina.findOne({ slug: datos.slug })

        if (existing) {
        warn(`"${datos.nombre}" ya existe — actualizando...`)
        const updated = await Disciplina.findByIdAndUpdate(
            existing._id,
            { $set: datos },
            { new: true }
        )
        ok(`  Actualizado: ${updated.nombre} (${updated.sistemaNiveles.length} niveles)`)
        resultados.push(updated)
        } else {
        const disciplina = await Disciplina.create(datos)
        ok(`  Creado: ${disciplina.nombre} (${disciplina.sistemaNiveles.length} niveles)`)
        resultados.push(disciplina)
        }
    }

    return resultados
}

// ════════════════════════════════════════════════════════════════════════════
//  MAIN
// ════════════════════════════════════════════════════════════════════════════
const main = async () => {
    console.log(`\n${C.bold}${C.cyan}`)
    console.log('  ╔══════════════════════════════════════════════════════════╗')
    console.log('  ║   🥋  MDK — SEEDER ESCUELA BEDOLLA v1.5                ║')
    console.log('  ║   San Cristóbal de las Casas, Chiapas                  ║')
    console.log('  ╚══════════════════════════════════════════════════════════╝')
    console.log(C.reset)

    try {
        // Conectar a MongoDB
        title('CONEXIÓN A MONGODB ATLAS')
        await connectDB()

        // Ejecutar seeds
        const sucursal    = await seedSucursal()
        const admin       = await seedAdmin(sucursal._id)
        const disciplinas = await seedDisciplinas()

        // Resumen final
        title('RESUMEN FINAL')
        ok(`Sucursal:    "${sucursal.name}"  (${sucursal._id})`)
        ok(`Admin:       "${admin.name}"     (${admin.email})`)
        ok(`Disciplinas: ${disciplinas.length} creadas/actualizadas`)
        disciplinas.forEach(d => {
        log(`  • ${d.nombre.padEnd(22)} → ${d.sistemaNiveles.length} niveles  [${d.slug}]`)
        })

        console.log(`\n${C.bold}${C.green}`)
        console.log('  ╔══════════════════════════════════════════════════════════╗')
        console.log('  ║   ✅  SEEDER COMPLETADO EXITOSAMENTE                   ║')
        console.log('  ╚══════════════════════════════════════════════════════════╝')
        console.log(C.reset)

        console.log(`${C.yellow}  PRÓXIMOS PASOS:${C.reset}`)
        console.log(`  1. Copia el ID de la sucursal: ${C.bold}${sucursal._id}${C.reset}`)
        console.log(`  2. Úsalo al registrar alumnos y horarios`)
        console.log(`  3. Ingresa con: ${C.bold}${ADMIN_BEDOLLA.email}${C.reset} / ${C.bold}${ADMIN_BEDOLLA.passwordPlain}${C.reset}`)
        console.log(`  4. ${C.red}${C.bold}Cambia la contraseña en el primer login${C.reset}\n`)

    } catch (err) {
        error(`Error durante el seed: ${err.message}`)
        console.error(err)
        process.exit(1)
    } finally {
        await mongoose.disconnect()
        log('Desconectado de MongoDB')
    }
}

main()