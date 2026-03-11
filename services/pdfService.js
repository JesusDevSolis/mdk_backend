/**
 * pdfService.js  —  v1.5 (rediseño completo)
 *
 * Genera la Solicitud de Ingreso oficial de la Escuela Bedolla
 *   Página 1 → Formulario pre-llenado con datos del alumno
 *   Página 2 → Reglamento Interno + Código de Conducta
 *
 * Logos en:  backend/uploads/logos/
 *   logo-mdk.jpg               ← International Moo Do Won (todas las disciplinas)
 *   logo-pequenos-dragones.png ← Solo Pequeños Dragones
 *   logo-bedolla.png           ← Pie de página página 2
 */

const PDFDocument = require('pdfkit');
const path        = require('path');
const fs          = require('fs');

// ─── Rutas ────────────────────────────────────────────────────────────────────
const LOGOS_DIR = path.join(__dirname, '../uploads/logos');

// ─── Paleta institucional ────────────────────────────────────────────────────
const C = {
    navy  : '#1e3a5f',
    red   : '#c8102e',
    gold  : '#c8971e',
    light : '#f2f5f8',
    border: '#b0bcc8',
    text  : '#111827',
    muted : '#4b5563',
    white : '#ffffff',
};

// ─── Constantes de página (LETTER) ──────────────────────────────────────────
const PAGE_W    = 612;
const MARGIN    = 44;
const CONTENT_W = PAGE_W - MARGIN * 2;

// ─── Configuración por programa ──────────────────────────────────────────────
const PROG = {
    'tae-kwon-do'      : { label: 'TAE KWON DO',      logo: 'logo-mdk.jpg',               esDragon: false },
    'tang-soo-do'      : { label: 'TANG SOO DO',       logo: 'logo-mdk.jpg',               esDragon: false },
    'hapkido'          : { label: 'HAPKIDO',           logo: 'logo-mdk.jpg',               esDragon: false },
    'gumdo'            : { label: 'GUMDO',             logo: 'logo-mdk.jpg',               esDragon: false },
    'pequenos-dragones': { label: 'PEQUEÑOS DRAGONES', logo: 'logo-pequenos-dragones.png', esDragon: true  },
};

const BELT = {
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

// ─── Textos oficiales ────────────────────────────────────────────────────────
const AVISO =
    'AVISO DE PRIVACIDAD: En términos de la Ley Federal de Protección de Datos Personales en posesión de ' +
    'los particulares, la Escuela de Artes Marciales Koreanas "Bedolla" está apegado a la normatividad que rige el aviso ' +
    'de privacidad. La información personal que nos proporcione es Confidencial y NO será transferida a terceros. ' +
    'Solicítelo en: artesmarcialesbedolla@gmail.com  |  www.ambedolla.com';

const NOTA_TKD =
    'NOTA: El Tae Kwon Do es un arte marcial de contacto, por lo cual me hago responsable de cualquier accidente durante ' +
    'su práctica y eximo de toda responsabilidad a la Asociación Mexicana MDK, A.C., a la Escuela de Artes Marciales Koreanas ' +
    '"Bedolla" y al Maestro Héctor Bedolla Bermúdez e instructores de todo accidente o lesiones que se susciten durante la ' +
    'práctica dentro y/o fuera de la escuela.';

const NOTA_DRAGON =
    'NOTA: El Programa "Pequeños Dragones" es un arte marcial de contacto, por lo cual me hago responsable de cualquier ' +
    'accidente durante su práctica y eximo de toda responsabilidad a la Asociación Mexicana MDK, A.C., a la Escuela de Artes ' +
    'Marciales Koreanas "Bedolla" y al Maestro Héctor Bedolla Bermúdez e instructores de todo accidente o lesiones que se ' +
    'susciten durante la práctica dentro y/o fuera de la escuela.';

const COMPROMISO =
    'EL SOLICITANTE DE SER ACEPTADO SE COMPROMETE A LA OBSERVACIÓN DE LOS ESTATUTOS QUE RIGE LA ESCUELA DE ARTES ' +
    'MARCIALES KOREANAS "BEDOLLA" CON LAS OBLIGACIONES Y DERECHOS QUE ELLOS IMPONEN.';

const REGLAMENTO = [
    'GUARDAR ABSOLUTA DISCIPLINA DENTRO Y FUERA DEL DOYANG (ESCUELA).',
    'EL ALUMNO TENDRÁ EL PLAZO DE UN MES A PARTIR DE SU INSCRIPCIÓN PARA ADQUIRIR EL DOBOK (UNIFORME) OFICIAL DE LA DISCIPLINA MARCIAL ELEGIDA, Y SERÁ ADQUIRIDO SOLAMENTE EN LA ESCUELA.',
    'TRATAR CON RESPETO A MAESTROS, COMPAÑEROS Y DEMAS PERSONAS DENTRO COMO FUERA DEL DOYANG.',
    'DEBERAN SER PUNTUALES A LOS HORARIOS ESTABLECIDOS, TENIENDO COMO TOLERANCIA 10 MINUTOS DE RETRASO.',
    'PARA TENER DERECHO A EXAMEN DE PROMOCION DE GRADO DEBERÁ ESTAR AL CORRIENTE DE LA COLEGIATURA Y COMO MINIMO EL 80% DE ASISTENCIAS.',
    'LA AUSENCIA TEMPORAL A CLASES DEBERA SER NOTIFICADA POR ESCRITO O POR TELEFONO A LA ADMINISTRACIÓN DE LA ESCUELA O AL MAESTRO.',
    'LOS HORARIOS ESTAN SUJETOS A CAMBIO, EN RELACION AL GRADO DE AVANCE EN EL APRENDIZAJE.',
    'LAS COLEGIATURAS SON MENSUALES Y DEBERÁN SER PAGADAS EN LA FECHA ASIGNADA POR LA ESCUELA "BEDOLLA" CON UNA TOLERANCIA DE 3 DIAS HÁBILES.',
    'EL PAGO QUE SE EFECTÚE DESPUÉS DEL TERCER DIA DE TOLERANCIA TENDRÁ CARGO ADICIONAL DE $100 PESOS POR PAGO TARDÍO.',
    'LAS COLEGIATURAS DEBERAN SER PAGADAS ÍNTEGRAMENTE AÚN CUANDO NO SE ASISTA A CLASES.',
    'LAS COLEGIATURAS NO SON TRANSFERIBLES NI REEMBOLSADAS Y NO ESTÁN SUJETAS A BONIFICACION DE NINGUNA ESPECIE.',
    'EN TEMPORADA DE VACACIONES DECEMBRINAS SE DEBERA CUBRIR LA COLEGIATURA EN LA PRIMERA QUINCENA DE DICIEMBRE SIN EXCEPCIÓN ALGUNA.',
    'TODO ALUMNO QUE HAYA SIDO DADO DE BAJA DEBERÁ PAGAR CUOTA DE INSCRIPCION AL REINGRESAR A CLASES.',
    'TODO ALUMNO QUE NO CUMPLA CON ESTAS NORMAS PODRA SER DADO DE BAJA TEMPORAL O DEFINITIVA SEGUN LA INDICIPLINA COMETIDA.',
    'EL ALUMNO AL INGRESAR A LA ESCUELA "BEDOLLA" SE COMPROMETE A CUMPLIR Y RESPETAR LAS NORMAS SEÑALADAS ANTERIORMENTE, PARTICIPAR ACTIVAMENTE EN TODA ACTIVIDAD DEPORTIVA RELACIONADA CON LA ORGANIZACIÓN. (COMPETENCIAS, EXÁMENES, EXHIBICIONES, SEMINARIOS, ETC.)',
];

const CODIGO = [
    'EL ALUMNO DEBERA PORTAR EN CLASES EL DOBOK (UNIFORME) REGLAMENTARIO.',
    'EL DOBOK DEBERA ESTAR LIMPIO Y EN BUEN ESTADO.',
    'MANTENER SU CUERPO LIMPIO Y LAS UÑAS DE PIES Y MANOS RECORTADAS.',
    'NO LLEVAR DURANTE LA PRACTICA OBJETOS METALICOS (ANILLOS, ARETES, RELOJES, CADENAS, ETC.)',
    'NO MASCAR CHICLE, NI MANTENER NADA EN LA BOCA DURANTE EL ENTRENAMIENTO.',
    'CUANDO HAYA COMENZADO LA CLASE EL ALUMNO PEDIRA PERMISO AL MAESTRO O QUIEN ESTÉ A CARGO DE LA CLASE PARA ENTRAR LEVANTANDO LA MANO, SI ES ACEPTADO HARÁ EL SALUDO PARA INCORPORARSE AL GRUPO.',
    'EL ALUMNO DEBERA PEDIR PERMISO TANTO PARA ENTRAR COMO PARA SALIR DEL AREA DEL ENTRENAMIENTO SIN IMPORTAR EL GRADO.',
    'EL ARTE MARCIAL SE PRACTICA CON EL CUERPO Y CON LA MENTE, POR LO TANTO, SE DEBERA GUARDAR SILENCIO Y PERMANECER ATENTO A LAS INSTRUCCIONES DEL MAESTRO, DE LO CONTRARIO ES UNA FALTA DE RESPETO PARA EL Y PARA LOS COMPAÑEROS QUE DESEAN APRENDER REALMENTE.',
    'LOS ALUMNOS DE GRADO SUPERIOR TIENEN LA OBLIGACION DE CORREGIR Y DE ORIENTAR A LOS DE MENOR GRADO.',
    'LOS ALUMNOS TIENEN LA OBLIGACION DE AYUDAR A MANTENER LIMPIO EL DOYANG.',
    'EN AUSENCIA DEL MAESTRO, LOS ALUMNOS DE MAYOR GRADO IMPONDRAN ORDEN, RESPETO Y EJEMPLO DE DISCIPLINA.',
    'LOS ALUMNOS CINTA NEGRA ESTAN OBLIGADOS A PRESTAR SUS SERVICIOS A LA ESCUELA INCONDICIONALMENTE SEGÚN INDIQUE EL MAESTRO.',
    'ES OBLIGATORIO CONTAR CON EL UNIFORME Y EQUIPO OFICIAL DE PROTECCION PARA SEGURIDAD DEL PRACTICANTE Y SOLAMENTE SERA ADQUIRIDO EN LA ESCUELA.',
];

const FRASE_FINAL =
    '"EL DOYANG NO ES SOLO UNA SALA PARA EL EJERCICIO FISICO, SINO PARA LA BUSQUEDA DE UNO MISMO QUE SERA EL REFLEJO EN NUESTRA VIDA"';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const sv = (v, fb = '') => (v && String(v).trim()) ? String(v).trim() : fb;

const fmtDate = (d) => {
    if (!d) return '';
    try { return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
    catch (_) { return ''; }
};

const calcEdad = (dob) => {
    if (!dob) return '';
    const hoy = new Date(), n = new Date(dob);
    let e = hoy.getFullYear() - n.getFullYear();
    if (hoy.getMonth() < n.getMonth() ||
        (hoy.getMonth() === n.getMonth() && hoy.getDate() < n.getDate())) e--;
    return `${e} años`;
};

const drawLogoSafe = (doc, filename, x, y, w, h) => {
    try {
        const p = path.join(LOGOS_DIR, filename);
        if (fs.existsSync(p)) doc.image(p, x, y, { fit: [w, h], align: 'center', valign: 'center' });
    } catch (_) {}
};

// ─── Componente campo individual ─────────────────────────────────────────────
const FIELD_H = 28;

const field = (doc, label, value, x, y, w) => {
    doc.fontSize(6.5).fillColor(C.muted).font('Helvetica-Bold')
        .text(label, x, y, { width: w, lineBreak: false });
    doc.fontSize(8.5).fillColor(C.text).font('Helvetica')
        .text(sv(value), x, y + 10, { width: w - 1, lineBreak: false, ellipsis: true });
    doc.moveTo(x, y + 22).lineTo(x + w - 1, y + 22)
        .strokeColor(C.border).lineWidth(0.4).stroke();
};

const r2 = (doc, l1, v1, l2, v2, y, pct1 = 0.5) => {
    const w1 = Math.floor(CONTENT_W * pct1) - 3;
    field(doc, l1, v1, MARGIN,          y, w1);
    field(doc, l2, v2, MARGIN + w1 + 6, y, CONTENT_W - w1 - 6);
    return y + FIELD_H;
};

const r3 = (doc, l1, v1, l2, v2, l3, v3, y) => {
    const w = Math.floor((CONTENT_W - 12) / 3);
    field(doc, l1, v1, MARGIN,              y, w);
    field(doc, l2, v2, MARGIN + w + 6,      y, w);
    field(doc, l3, v3, MARGIN + w * 2 + 12, y, w);
    return y + FIELD_H;
};

const seccion = (doc, titulo, y) => {
    doc.rect(MARGIN, y, CONTENT_W, 14).fill(C.navy);
    doc.fontSize(7.5).fillColor(C.white).font('Helvetica-Bold')
        .text(titulo, MARGIN + 6, y + 3, { lineBreak: false });
    return y + 18;
};

const tituloConLineas = (doc, texto, y) => {
    const tW = doc.widthOfString(texto, { fontSize: 9 }) + 20;
    const tX = (PAGE_W - tW) / 2;
    doc.moveTo(MARGIN, y + 5).lineTo(tX - 6, y + 5).strokeColor(C.red).lineWidth(0.8).stroke();
    doc.moveTo(tX + tW + 6, y + 5).lineTo(PAGE_W - MARGIN, y + 5).strokeColor(C.red).lineWidth(0.8).stroke();
    doc.fontSize(9).fillColor(C.navy).font('Helvetica-Bold')
        .text(texto, tX, y, { width: tW, align: 'center', lineBreak: false });
    return y + 16;
};

// ─── PÁGINA 1: FORMULARIO ────────────────────────────────────────────────────
const buildPage1 = (doc, alumno, config, studentId) => {
    const esDragon = config.esDragon;
    const addr = alumno.address    || {};
    const med  = alumno.medicalInfo || {};
    const enr  = alumno.enrollment || {};
    const tutor = (typeof alumno.tutor === 'object' && alumno.tutor) ? alumno.tutor : {};

    const edad = calcEdad(alumno.dateOfBirth);
    const esMinor = (() => {
        const e = parseInt(edad);
        return !isNaN(e) && e < 18;
    })();

    // ── ENCABEZADO ───────────────────────────────────────────────────────────────
    doc.rect(0, 0, PAGE_W, 90).fill(C.navy);

    // Logo
    drawLogoSafe(doc, config.logo, MARGIN - 4, 6, 76, 76);

    // Títulos centrados
    const logoW = 78;
    const fotoW = 60;
    const titX  = MARGIN + logoW;
    const titW  = CONTENT_W - logoW - fotoW;

    doc.fontSize(14).fillColor(C.white).font('Helvetica-Bold')
        .text('SOLICITUD DE INGRESO', titX, 14, { width: titW, align: 'center', lineBreak: false });

    // Banda roja con nombre del programa
    doc.rect(titX, 36, titW, 17).fill(C.red);
    doc.fontSize(9).fillColor(C.white).font('Helvetica-Bold')
        .text(config.label, titX, 40, { width: titW, align: 'center', lineBreak: false });

    doc.fontSize(7.5).fillColor('#b0cce0')
        .text('Escuela de Artes Marciales Koreanas "Bedolla"', titX, 58, { width: titW, align: 'center', lineBreak: false });
    doc.fontSize(7).fillColor('#8ab0cc')
        .text('San Cristóbal de las Casas, Chiapas, México', titX, 69, { width: titW, align: 'center', lineBreak: false });

    // Recuadro de foto
    const fotoX = PAGE_W - MARGIN - fotoW + 2;
    doc.rect(fotoX, 6, fotoW - 4, 72).fill(C.white).strokeColor(C.border).lineWidth(0.5).stroke();

    // Intentar insertar foto del alumno
    try {
        const fn = alumno.profilePhoto?.filename;
        if (fn) {
        const pp = path.join(__dirname, '../uploads/profiles', fn);
        if (fs.existsSync(pp)) {
            doc.image(pp, fotoX + 2, 8, { fit: [fotoW - 8, 68], align: 'center', valign: 'center' });
        } else {
            doc.fontSize(7).fillColor(C.muted).font('Helvetica')
            .text('FOTO', fotoX, 38, { width: fotoW - 4, align: 'center', lineBreak: false });
        }
        } else {
        doc.fontSize(7).fillColor(C.muted).font('Helvetica')
            .text('FOTO', fotoX, 38, { width: fotoW - 4, align: 'center', lineBreak: false });
        }
    } catch (_) {
        doc.fontSize(7).fillColor(C.muted).font('Helvetica')
        .text('FOTO', fotoX, 38, { width: fotoW - 4, align: 'center', lineBreak: false });
    }

    // Línea roja separadora
    doc.rect(0, 90, PAGE_W, 3).fill(C.red);

    // ── FOLIO / MATRÍCULA ───────────────────────────────────────────────────────
    doc.fontSize(7.5).fillColor(C.navy).font('Helvetica-Bold')
        .text(`Fecha de Ingreso: ${fmtDate(enr.enrollmentDate || new Date())}`, MARGIN, 96, { lineBreak: false });
    doc.text(`Número de Matrícula: ${studentId}`,
            0, 96, { align: 'right', width: PAGE_W - MARGIN, lineBreak: false });

    let y = 110;

    // ── (1) NOMBRE COMPLETO ─────────────────────────────────────────────────────
    y = seccion(doc, '(1) NOMBRE COMPLETO', y);

    y = r3(doc,
        'Nombre(s)',        alumno.firstName,
        'Apellido Paterno', alumno.lastName,
        'Apellido Materno', alumno.secondLastName,
        y
    );

    y = r3(doc,
        'Tipo de Sangre',      med.bloodType,
        'Fecha de Nacimiento', fmtDate(alumno.dateOfBirth),
        'Lugar de Nacimiento', alumno.birthPlace,
        y
    );

    // Fila con 4 campos: Sexo | Estado Civil/Grado Escolar | Edad | Estatura
    const gLabel = alumno.gender === 'masculino' ? 'Masculino'
                : alumno.gender === 'femenino'  ? 'Femenino'
                : sv(alumno.gender);
    const ecLabel = esDragon ? sv(alumno.gradeLevel)
                    : alumno.maritalStatus === 'soltero'    ? 'Soltero(a)'
                    : alumno.maritalStatus === 'casado'     ? 'Casado(a)'
                    : alumno.maritalStatus === 'divorciado' ? 'Divorciado(a)'
                    : alumno.maritalStatus === 'viudo'      ? 'Viudo(a)'
                    : sv(alumno.maritalStatus);

    const cols4 = [
        { label: 'Sexo',                               value: gLabel,   w: Math.floor(CONTENT_W * 0.18) },
        { label: esDragon ? 'Grado Escolar' : 'Estado Civil', value: ecLabel, w: Math.floor(CONTENT_W * 0.30) },
        { label: 'Edad',                               value: edad,     w: Math.floor(CONTENT_W * 0.22) },
        { label: 'Estatura (m)',                       value: alumno.height ? `${alumno.height} m` : '',
                                                            w: 0 },
    ];
    // Calcular el último ancho automáticamente
    const usedW = cols4.slice(0,3).reduce((s, c) => s + c.w, 0) + 18;
    cols4[3].w = CONTENT_W - usedW;

    let xc = MARGIN;
    cols4.forEach(({ label, value, w }) => {
        field(doc, label, value, xc, y, w);
        xc += w + 6;
    });
    y += FIELD_H;

    // ── (2) DOMICILIO ───────────────────────────────────────────────────────────
    y = seccion(doc, '(2) DOMICILIO', y);

    y = r2(doc, 'Calle y Número', addr.street,       'Colonia o Barrio', addr.neighborhood, y);
    y = r2(doc, 'Ciudad o Municipio', addr.city,     'Estado',           addr.state,        y, 0.55);
    y = r2(doc, 'Teléfono Fijo y/o Celular', alumno.phone, 'Correo Electrónico', alumno.email, y);

    // Ocupación (campo completo)
    field(doc, esDragon ? 'Grado Escolar' : 'Ocupación',
            esDragon ? alumno.gradeLevel : alumno.occupation,
            MARGIN, y, CONTENT_W);
    y += FIELD_H;

    // ── TUTOR ───────────────────────────────────────────────────────────────────
    const nombreTutor   = tutor.firstName ? `${tutor.firstName} ${sv(tutor.lastName)}`.trim() : '';
    const telefonoTutor = sv(tutor.phones?.primary || tutor.phone || '');
    const emailTutor    = sv(tutor.email || '');

    if (esDragon || esMinor || nombreTutor) {
        const tlabel = esDragon
        ? 'NOMBRE DE LA MAMÁ, PAPÁ O TUTOR'
        : 'EN CASO DE SER MENOR DE EDAD — PADRE, MADRE O TUTOR';
        y = seccion(doc, tlabel, y);
        y = r3(doc,
        'Nombre Completo',    nombreTutor,
        'Teléfono',           telefonoTutor,
        'Correo Electrónico', emailTutor,
        y
        );
    }

    // ── INSCRIPCIÓN / MOTIVOS ───────────────────────────────────────────────────
    y = seccion(doc, 'DATOS DE INSCRIPCIÓN', y);

    y = r2(doc,
        '¿Cuáles son los motivos por los que desea ingresar?', enr.enrollmentReason,
        '¿Recomendado por?',                                   enr.recommendedBy,
        y, 0.62
    );

    y = r2(doc,
        'Cinturón Actual',
        BELT[alumno.belt?.level] || sv(alumno.belt?.level, 'Cinturón Blanco'),
        'Sucursal',
        typeof enr.sucursal === 'object' ? sv(enr.sucursal?.name) : '',
        y
    );

    field(doc, 'Observaciones', enr.observaciones, MARGIN, y, CONTENT_W);
    y += FIELD_H + 6;

    // ── AVISO / NOTA ────────────────────────────────────────────────────────────
    doc.rect(MARGIN, y, CONTENT_W, 0.5).fill(C.border);
    y += 4;

    doc.fontSize(6.2).fillColor(C.muted).font('Helvetica')
        .text(AVISO, MARGIN, y, { width: CONTENT_W, lineBreak: true, lineGap: 0.3 });
    y += 28;

    doc.fontSize(6.2).fillColor(C.text).font('Helvetica')
        .text(esDragon ? NOTA_DRAGON : NOTA_TKD, MARGIN, y, { width: CONTENT_W, lineBreak: true, lineGap: 0.3 });
    y += 28;

    // ── ACEPTO DE CONFORMIDAD ───────────────────────────────────────────────────
    doc.rect(MARGIN, y, CONTENT_W, 0.5).fill(C.navy);
    y += 7;

    doc.fontSize(8).fillColor(C.navy).font('Helvetica-Bold')
        .text('ACEPTO DE CONFORMIDAD', MARGIN, y, { width: CONTENT_W, align: 'center', lineBreak: false });
    y += 18;

    const sigW = 210;
    const sigX = (PAGE_W - sigW) / 2;
    doc.moveTo(sigX, y + 18).lineTo(sigX + sigW, y + 18)
        .strokeColor(C.text).lineWidth(0.6).stroke();
    doc.fontSize(7).fillColor(C.muted).font('Helvetica')
        .text(esDragon ? 'Nombre y Firma del Padre o Tutor'
                        : 'Nombre y Firma del Solicitante / Padre o Tutor',
            sigX, y + 21, { width: sigW, align: 'center', lineBreak: false });
    y += 36;

    doc.fontSize(6.2).fillColor(C.muted).font('Helvetica')
        .text(COMPROMISO, MARGIN, y, { width: CONTENT_W, align: 'center', lineBreak: false });
    y += 12;

    doc.fontSize(7).fillColor(C.navy).font('Helvetica-Bold')
        .text('www.ambedolla.com', MARGIN, y, { width: CONTENT_W, align: 'center', lineBreak: false });
};

// ─── PÁGINA 2: REGLAMENTO ────────────────────────────────────────────────────
const buildPage2 = (doc, config) => {
    const esDragon = config.esDragon;

    // ── ENCABEZADO ──────────────────────────────────────────────────────────────
    drawLogoSafe(doc, 'logo-mdk.jpg', MARGIN - 4, 10, 60, 60);

    const cx2 = MARGIN + 64;
    const cw2 = CONTENT_W - 64;

    doc.fontSize(12.5).fillColor(C.navy).font('Helvetica-Bold')
        .text('Escuela de Artes Marciales Koreanas "Bedolla"', cx2, 12, { width: cw2, lineBreak: false });
    doc.fontSize(7.5).fillColor(C.muted).font('Helvetica')
        .text('Los Pioneros de las Artes Marciales en San Cristóbal de las Casas, Chiapas y del Sureste', cx2, 27, { width: cw2, lineBreak: false });
    doc.fontSize(7).fillColor(C.muted)
        .text('DISCIPLINA · FORMACION · EDUCACION & DEFENSA PERSONAL', cx2, 38, { width: cw2, lineBreak: false });
    doc.fontSize(7.5).fillColor(C.text)
        .text('Con base en el Reglamento General de la escuela "BEDOLLA" se deberá cumplir lo siguiente:', cx2, 50, { width: cw2, lineBreak: false });

    // Línea roja separadora
    doc.rect(0, 74, PAGE_W, 3).fill(C.red);

    let y2 = 82;

    // ── REGLAMENTO INTERNO ──────────────────────────────────────────────────────
    y2 = tituloConLineas(doc, 'REGLAMENTO INTERNO', y2);

    REGLAMENTO.forEach((regla, i) => {
        const txt  = `${i + 1}.- ${regla}`;
        doc.fontSize(6.8).font('Helvetica').fillColor(C.text);
        const h = doc.heightOfString(txt, { width: CONTENT_W - 4 });
        doc.text(txt, MARGIN, y2, { width: CONTENT_W - 4, lineBreak: true, lineGap: 0.3 });
        y2 += h + 1.5;
    });

    y2 += 6;

    // ── CÓDIGO DE CONDUCTA ──────────────────────────────────────────────────────
    y2 = tituloConLineas(doc, 'CÓDIGO DE CONDUCTA', y2);

    CODIGO.forEach((regla, i) => {
        const txt  = `${i + 1}.- ${regla}`;
        doc.fontSize(6.8).font('Helvetica').fillColor(C.text);
        const h = doc.heightOfString(txt, { width: CONTENT_W - 4 });
        doc.text(txt, MARGIN, y2, { width: CONTENT_W - 4, lineBreak: true, lineGap: 0.3 });
        y2 += h + 1.5;
    });

    y2 += 8;

    // ── ACEPTO DE CONFORMIDAD ───────────────────────────────────────────────────
    doc.rect(MARGIN, y2, CONTENT_W, 0.5).fill(C.navy);
    y2 += 6;
    doc.fontSize(8).fillColor(C.navy).font('Helvetica-Bold')
        .text('ACEPTO DE CONFORMIDAD', MARGIN, y2, { width: CONTENT_W, align: 'center', lineBreak: false });
    y2 += 18;

    const s2W = 230;
    const s2X = (PAGE_W - s2W) / 2;
    doc.moveTo(s2X, y2 + 14).lineTo(s2X + s2W, y2 + 14)
        .strokeColor(C.text).lineWidth(0.6).stroke();
    doc.fontSize(7).fillColor(C.muted).font('Helvetica')
        .text(esDragon ? 'Nombre y Firma del Padre o Tutor'
                        : 'Nombre y Firma del Solicitante / Padre o Tutor',
            s2X, y2 + 17, { width: s2W, align: 'center', lineBreak: false });
    y2 += 32;

    // ── FRASE ────────────────────────────────────────────────────────────────────
    doc.rect(MARGIN, y2, CONTENT_W, 0.5).fill(C.border);
    y2 += 6;
    doc.fontSize(7.5).fillColor(C.navy).font('Helvetica-Bold')
        .text(FRASE_FINAL, MARGIN, y2, { width: CONTENT_W, align: 'center', lineBreak: false });
    y2 += 16;

    // ── Logo Bedolla ─────────────────────────────────────────────────────────────
    drawLogoSafe(doc, 'logo-bedolla.png', (PAGE_W - 130) / 2, y2, 130, 32);
};

// ─── FUNCIÓN PRINCIPAL ────────────────────────────────────────────────────────
/**
 * Genera el PDF oficial de Solicitud de Ingreso
 * @param {Object} alumno  - Documento del alumno con populate de sucursal y tutor
 * @param {string} destDir - Ruta absoluta del directorio destino
 * @returns {Promise<{ filePath, fileName, url }>}
 */
const generateSolicitudIngreso = (alumno, destDir) => {
    return new Promise((resolve, reject) => {
        try {
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

        const programa  = alumno.enrollment?.programa || 'tae-kwon-do';
        const config    = PROG[programa] || PROG['tae-kwon-do'];
        const studentId = sv(alumno.enrollment?.studentId, String(alumno._id).slice(-8).toUpperCase());
        const fileName  = `solicitud_${studentId}.pdf`;
        const filePath  = path.join(destDir, fileName);

        // CRÍTICO: autoFirstPage:true + margins 0 = control total de Y
        const doc = new PDFDocument({
            size         : 'LETTER',
            margins      : { top: 0, bottom: 0, left: 0, right: 0 },
            autoFirstPage: true,
            info: {
            Title  : `Solicitud de Ingreso — ${alumno.firstName} ${alumno.lastName}`,
            Author : 'Escuela de Artes Marciales Koreanas "Bedolla"',
            Subject: `Programa: ${config.label}`,
            },
        });

        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Página 1 — Formulario
        buildPage1(doc, alumno, config, studentId);

        // Página 2 — Reglamento (adición explícita, nunca automática)
        doc.addPage({ size: 'LETTER', margins: { top: 0, bottom: 0, left: 0, right: 0 } });
        buildPage2(doc, config);

        doc.end();

        stream.on('finish', () => resolve({ filePath, fileName, url: `/uploads/solicitudes/${fileName}` }));
        stream.on('error',  reject);

        } catch (err) {
        reject(err);
        }
    });
};

module.exports = { generateSolicitudIngreso };