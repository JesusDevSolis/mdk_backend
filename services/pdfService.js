/**
 * pdfService.js  —  v1.5
 * Generación del PDF oficial "Solicitud de Ingreso"
 * Escuela de Artes Marciales Koreanas "Bedolla"
 * San Cristóbal de las Casas, Chiapas, México
 *
 * Usa pdfkit (Node.js puro, sin dependencias de sistema operativo)
 */

const PDFDocument = require('pdfkit');
const path        = require('path');
const fs          = require('fs');

// ── Colores institucionales ───────────────────────────────────────────────────
const COLORS = {
    primary : '#1e3a5f',  // Azul marino oscuro
    accent  : '#c8102e',  // Rojo marcial
    gold    : '#f0c040',  // Dorado para subtítulo
    light   : '#f0f4f8',  // Fondo secciones alternas
    border  : '#c5cdd6',  // Borde sutil
    text    : '#1a1a2e',  // Texto principal
    muted   : '#5a6a7a',  // Texto secundario / etiquetas
    white   : '#ffffff',
};

// ── Etiquetas de disciplinas ──────────────────────────────────────────────────
const PROGRAMA_LABELS = {
    'tae-kwon-do'      : 'Tae Kwon Do',
    'tang-soo-do'      : 'Tang Soo Do',
    'hapkido'          : 'Hapkido',
    'gumdo'            : 'Gumdo',
    'pequenos-dragones': 'Pequeños Dragones',
};

// ── Etiquetas de cinturones ───────────────────────────────────────────────────
const BELT_LABELS = {
    'blanco'  : 'Cinturón Blanco',
    'amarillo': 'Cinturón Amarillo',
    'naranja' : 'Cinturón Naranja',
    'verde'   : 'Cinturón Verde',
    'azul'    : 'Cinturón Azul',
    'marron'  : 'Cinturón Marrón',
    'negro-1' : 'Cinturón Negro 1° Dan',
    'negro-2' : 'Cinturón Negro 2° Dan',
    'negro-3' : 'Cinturón Negro 3° Dan',
};

// ── Utilidades ────────────────────────────────────────────────────────────────
const formatDate = (d) => {
    if (!d) return 'No especificada';
    try {
        return new Date(d).toLocaleDateString('es-MX', {
        year: 'numeric', month: 'long', day: 'numeric'
        });
    } catch { return 'No especificada'; }
};

const formatDateShort = (d) => {
    if (!d) return '___/___/______';
    try {
        return new Date(d).toLocaleDateString('es-MX', {
        day: '2-digit', month: '2-digit', year: 'numeric'
        });
    } catch { return '___/___/______'; }
};

const val = (v, fallback = 'No especificado') =>
    v && String(v).trim() ? String(v).trim() : fallback;

const calcularEdad = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    const hoy = new Date();
    const nac = new Date(dateOfBirth);
    let edad  = hoy.getFullYear() - nac.getFullYear();
    const m   = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad;
};

// ── Función principal ─────────────────────────────────────────────────────────
/**
 * Genera el PDF de Solicitud de Ingreso para un alumno
 * @param {Object} alumno  - Documento del alumno (con populate de sucursal y tutor)
 * @param {string} destDir - Ruta absoluta del directorio donde guardar el PDF
 * @returns {Promise<{ filePath, fileName, url }>}
 */
const generateSolicitudIngreso = (alumno, destDir) => {
    return new Promise((resolve, reject) => {
        try {
        // Asegurar que el directorio existe
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }

        const edad     = calcularEdad(alumno.dateOfBirth);
        const esMinor  = edad !== null && edad < 18;
        const esDragon = alumno.enrollment?.programa === 'pequenos-dragones';

        const nombre   = val(`${alumno.firstName || ''} ${alumno.lastName || ''}`.trim());
        const programa = PROGRAMA_LABELS[alumno.enrollment?.programa] || val(alumno.enrollment?.programa);
        const cinturon = BELT_LABELS[alumno.belt?.level] || val(alumno.belt?.level, 'Cinturón Blanco');
        const sucursal = typeof alumno.enrollment?.sucursal === 'object'
            ? alumno.enrollment.sucursal.name
            : val(alumno.enrollment?.sucursal);

        const studentId = val(alumno.enrollment?.studentId, String(alumno._id).slice(-8).toUpperCase());
        const fileName  = `solicitud_${studentId}.pdf`;
        const filePath  = path.join(destDir, fileName);

        // ── Crear documento PDF ──────────────────────────────────────────────────
        const doc = new PDFDocument({
            size   : 'LETTER',
            margins: { top: 40, bottom: 40, left: 50, right: 50 },
            info   : {
            Title      : `Solicitud de Ingreso — ${nombre}`,
            Author     : 'Escuela de Artes Marciales Koreanas "Bedolla"',
            Subject    : `Programa: ${programa}`,
            Keywords   : 'solicitud ingreso taekwondo bedolla',
            CreationDate: new Date(),
            },
        });

        const stream   = fs.createWriteStream(filePath);
        doc.pipe(stream);

        const PAGE_W   = doc.page.width;    // ~612 pt
        const MARGIN   = 50;
        const CONTENT_W = PAGE_W - MARGIN * 2; // 512 pt
        let y = 40;

        // ── ENCABEZADO ───────────────────────────────────────────────────────────
        // Banda azul superior
        doc.rect(0, 0, PAGE_W, 90).fill(COLORS.primary);

        doc.fontSize(17).fillColor(COLORS.white).font('Helvetica-Bold')
            .text('ESCUELA DE ARTES MARCIALES KOREANAS', MARGIN, 12, { align: 'center', width: CONTENT_W });

        doc.fontSize(14).fillColor(COLORS.gold).font('Helvetica-Bold')
            .text('"BEDOLLA"', MARGIN, 31, { align: 'center', width: CONTENT_W });

        doc.fontSize(8.5).fillColor(COLORS.white).font('Helvetica')
            .text('San Cristóbal de las Casas, Chiapas, México', MARGIN, 52, { align: 'center', width: CONTENT_W });

        doc.fontSize(7.5).fillColor('#aac8e8')
            .text('SBN. Filiberto Bedolla Figueroa  •  SBN. Héctor Bedolla Bermúdez', MARGIN, 66, { align: 'center', width: CONTENT_W });

        // Banda roja de separación
        doc.rect(0, 90, PAGE_W, 6).fill(COLORS.accent);

        // Franja título del formulario
        doc.rect(0, 96, PAGE_W, 26).fill(COLORS.light);
        doc.fontSize(12).fillColor(COLORS.primary).font('Helvetica-Bold')
            .text('SOLICITUD DE INGRESO', MARGIN, 102, { align: 'center', width: CONTENT_W });

        y = 132;

        // Folio y fecha
        doc.fontSize(8).fillColor(COLORS.muted).font('Helvetica')
            .text(`Folio: ${studentId}`, MARGIN, y)
            .text(`Fecha: ${formatDateShort(alumno.enrollment?.enrollmentDate || new Date())}`,
                0, y, { align: 'right', width: PAGE_W - MARGIN });
        y += 16;

        // ── Helpers de layout ────────────────────────────────────────────────────

        // Título de sección con banda azul
        const sectionTitle = (title, yPos) => {
            doc.rect(MARGIN, yPos, CONTENT_W, 16).fill(COLORS.primary);
            doc.fontSize(8).fillColor(COLORS.white).font('Helvetica-Bold')
            .text(title, MARGIN + 6, yPos + 4);
            return yPos + 22;
        };

        // Campo etiqueta + valor + línea base
        const field = (label, value, xPos, yPos, width) => {
            doc.fontSize(7).fillColor(COLORS.muted).font('Helvetica-Bold')
            .text(label, xPos, yPos);
            const vY = yPos + 10;
            doc.fontSize(8.5).fillColor(COLORS.text).font('Helvetica')
            .text(val(value), xPos, vY, { width: width - 4, lineBreak: false });
            doc.moveTo(xPos, vY + 12)
            .lineTo(xPos + width - 4, vY + 12)
            .strokeColor(COLORS.border).lineWidth(0.5).stroke();
            return vY + 18;
        };

        // Fila 2 columnas
        const row2 = (l1, v1, l2, v2, yPos, w1Pct = 0.5) => {
            const w1 = Math.floor(CONTENT_W * w1Pct) - 4;
            const w2 = CONTENT_W - w1 - 8;
            field(l1, v1, MARGIN,         yPos, w1);
            field(l2, v2, MARGIN + w1 + 8, yPos, w2);
            return yPos + 32;
        };

        // Fila 3 columnas iguales
        const row3 = (l1, v1, l2, v2, l3, v3, yPos) => {
            const w = Math.floor(CONTENT_W / 3) - 3;
            field(l1, v1, MARGIN,           yPos, w);
            field(l2, v2, MARGIN + w + 6,   yPos, w);
            field(l3, v3, MARGIN + w * 2 + 12, yPos, w);
            return yPos + 32;
        };

        // ── SECCIÓN 1: DATOS PERSONALES ──────────────────────────────────────────
        y = sectionTitle('1. DATOS PERSONALES', y);

        y = row2('Nombre(s)', alumno.firstName, 'Apellidos', alumno.lastName, y);

        y = row3(
            'Fecha de Nacimiento', formatDateShort(alumno.dateOfBirth),
            'Edad', edad !== null ? `${edad} años` : '',
            'Género',
            alumno.gender === 'masculino' ? 'Masculino'
            : alumno.gender === 'femenino' ? 'Femenino'
            : val(alumno.gender),
            y
        );

        y = row3(
            'Lugar de Nacimiento', alumno.birthPlace,
            'Estado Civil',
            alumno.maritalStatus === 'soltero' ? 'Soltero(a)'
            : alumno.maritalStatus === 'casado' ? 'Casado(a)'
            : val(alumno.maritalStatus, esMinor ? 'N/A' : ''),
            'Ocupación / Escuela',
            val(alumno.occupation || alumno.gradeLevel),
            y
        );

        y = row2(
            'Estatura (m)', alumno.height ? `${alumno.height} m` : '',
            'Tipo de Sangre', alumno.medicalInfo?.bloodType,
            y
        );
        y += 4;

        // ── SECCIÓN 2: DOMICILIO ─────────────────────────────────────────────────
        y = sectionTitle('2. DOMICILIO', y);

        const addr = alumno.address || {};
        y = row2('Calle y Número', addr.street, 'Colonia / Barrio', addr.neighborhood, y);
        y = row3('Ciudad', addr.city, 'Estado', addr.state, 'C.P.', addr.zipCode, y);
        y = row3('Teléfono', alumno.phone, 'Celular', alumno.phone, 'Email', alumno.email, y);
        y += 4;

        // ── SECCIÓN 3: DATOS DE INSCRIPCIÓN ──────────────────────────────────────
        y = sectionTitle('3. DATOS DE INSCRIPCIÓN', y);

        y = row3('Programa / Disciplina', programa, 'Cinturón Actual', cinturon, 'Sucursal', sucursal, y);

        y = row2(
            'Motivo de inscripción', alumno.enrollment?.enrollmentReason,
            'Recomendado por',       alumno.enrollment?.recommendedBy,
            y
        );

        y = row2(
            'Cuota Mensual',
            alumno.enrollment?.monthlyFee ? `$${alumno.enrollment.monthlyFee} MXN` : '',
            'Cuota de Inscripción',
            alumno.enrollment?.registrationFee ? `$${alumno.enrollment.registrationFee} MXN` : '',
            y
        );
        y += 4;

        // ── SECCIÓN 4: TUTOR / RESPONSABLE (menores y Pequeños Dragones) ─────────
        let seccionNum = 4;
        if (esMinor || esDragon || alumno.tutor) {
            y = sectionTitle(`${seccionNum}. DATOS DEL TUTOR / RESPONSABLE`, y);

            const tutor = typeof alumno.tutor === 'object' ? alumno.tutor : {};
            const tutorNombre = tutor.firstName
            ? `${tutor.firstName} ${tutor.lastName || ''}`.trim()
            : '';

            y = row3(
            'Nombre del Tutor', tutorNombre,
            'Relación con el alumno', val(alumno.relationshipToTutor),
            'Teléfono', val(tutor.phones?.primary || tutor.phones?.secondary),
            y
            );
            y = row2('Email del Tutor', tutor.email, 'Ocupación', val(tutor.occupation), y);
            y += 4;
            seccionNum++;
        }

        // ── SECCIÓN 5: CONTACTO DE EMERGENCIA ────────────────────────────────────
        y = sectionTitle(`${seccionNum}. CONTACTO DE EMERGENCIA`, y);

        const ec = alumno.emergencyContact || {};
        y = row3('Nombre', ec.name, 'Parentesco', ec.relationship, 'Teléfono', ec.phone, y);
        y += 4;
        seccionNum++;

        // ── SECCIÓN 6: INFORMACIÓN MÉDICA ────────────────────────────────────────
        y = sectionTitle(`${seccionNum}. INFORMACIÓN MÉDICA RELEVANTE`, y);

        y = row3(
            'Tipo de Sangre',    alumno.medicalInfo?.bloodType,
            'Alergias',          val(alumno.medicalInfo?.allergies, 'Ninguna'),
            'Condiciones',       val(alumno.medicalInfo?.medicalConditions, 'Ninguna'),
            y
        );
        y = row2(
            'Medicamentos actuales', val(alumno.medicalInfo?.medications, 'Ninguno'),
            'Doctor / Teléfono',
            alumno.medicalInfo?.doctorName
            ? `${alumno.medicalInfo.doctorName}${alumno.medicalInfo.doctorPhone ? '  ' + alumno.medicalInfo.doctorPhone : ''}`
            : '',
            y
        );
        y += 8;

        // ── DECLARACIÓN Y FIRMAS ──────────────────────────────────────────────────
        // Si queda poco espacio, nueva página
        if (y > doc.page.height - 150) {
            doc.addPage();
            y = 40;
        }

        // Recuadro declaración
        doc.rect(MARGIN, y, CONTENT_W, 42).fill(COLORS.light);
        doc.rect(MARGIN, y, CONTENT_W, 42).stroke(COLORS.border);

        doc.fontSize(7).fillColor(COLORS.text).font('Helvetica')
            .text(
            'Declaro que los datos proporcionados son verdaderos y me comprometo a cumplir con el reglamento ' +
            'interno de la escuela, respetar a instructores y compañeros, y asumir responsabilidad por mi ' +
            'conducta dentro y fuera de las instalaciones. Autorizo el uso de imágenes con fines educativos ' +
            'y de difusión de la escuela.',
            MARGIN + 6, y + 6, { width: CONTENT_W - 12, lineBreak: true }
            );

        y += 52;

        // Líneas de firma — 3 columnas
        const sigW   = 150;
        const sigGap = (CONTENT_W - sigW * 3) / 2;
        const sigY   = y + 28;

        [
            { label: 'Firma del Alumno / Tutor', x: MARGIN },
            { label: 'Firma del Instructor',     x: MARGIN + sigW + sigGap },
            { label: 'Sello de la Escuela',      x: MARGIN + (sigW + sigGap) * 2 },
        ].forEach(({ label, x }) => {
            doc.moveTo(x, sigY).lineTo(x + sigW, sigY)
            .strokeColor(COLORS.text).lineWidth(0.8).stroke();
            doc.fontSize(7).fillColor(COLORS.muted).font('Helvetica')
            .text(label, x, sigY + 4, { width: sigW, align: 'center' });
        });

        // ── PIE DE PÁGINA ─────────────────────────────────────────────────────────
        const PIE_Y = doc.page.height - 32;
        doc.rect(0, PIE_Y - 4, PAGE_W, 36).fill(COLORS.primary);

        doc.fontSize(7).fillColor(COLORS.white).font('Helvetica')
            .text(
            'Escuela de Artes Marciales Koreanas "Bedolla" — San Cristóbal de las Casas, Chiapas',
            MARGIN, PIE_Y + 2, { align: 'center', width: CONTENT_W }
            );

        doc.fontSize(6.5).fillColor('#aac8e8')
            .text(
            `Generado el ${new Date().toLocaleDateString('es-MX')} | Folio: ${studentId}`,
            MARGIN, PIE_Y + 13, { align: 'center', width: CONTENT_W }
            );

        // ── Finalizar ─────────────────────────────────────────────────────────────
        doc.end();

        stream.on('finish', () => resolve({
            filePath,
            fileName,
            url: `/uploads/solicitudes/${fileName}`,
        }));

        stream.on('error', reject);

        } catch (error) {
        reject(error);
        }
    });
};

module.exports = { generateSolicitudIngreso };