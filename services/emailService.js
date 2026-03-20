/**
 * emailService.js
 * Servicio centralizado de envío de emails con nodemailer.
 * Usa Gmail con App Password (no requiere OAuth).
 *
 * Variables de entorno requeridas:
 *   EMAIL_USER     = mdk.notificaciones@gmail.com (o la cuenta que configures)
 *   EMAIL_PASSWORD = xxxx xxxx xxxx xxxx  (App Password de Google)
 *   EMAIL_FROM     = "Escuela Bedolla <mdk.notificaciones@gmail.com>"
 */

const nodemailer = require('nodemailer');

// ── Crear transporter ────────────────────────────────────────────────────────
const crearTransporter = () => {
  const user = (process.env.EMAIL_USER || '').trim();
  const pass = (process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD || '').trim();
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });
};

// ── Template HTML base ───────────────────────────────────────────────────────

// ── Template HTML base ───────────────────────────────────────────────────────
const templateBase = ({ titulo, mensaje, nombreAlumno = '', footer = '' }) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titulo}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1);">
          <!-- Header -->
          <tr>
            <td style="background:#C0102A;padding:30px 40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:bold;letter-spacing:1px;">
                BEDOLLA MARTIAL ARTS
              </h1>
              <p style="color:rgba(255,255,255,.85);margin:6px 0 0;font-size:13px;">
                Escuela de Artes Marciales Koreanas
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              ${nombreAlumno ? `<p style="color:#555;font-size:15px;margin:0 0 16px;">Hola, <strong>${nombreAlumno}</strong></p>` : ''}
              <h2 style="color:#1a202c;font-size:20px;margin:0 0 16px;">${titulo}</h2>
              <div style="color:#444;font-size:15px;line-height:1.7;white-space:pre-line;">${mensaje}</div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8f8f8;padding:20px 40px;border-top:1px solid #eee;text-align:center;">
              <p style="color:#999;font-size:12px;margin:0;">
                ${footer || 'Escuela de Artes Marciales Koreanas "Bedolla" · San Cristóbal de las Casas, Chiapas'}
              </p>
              <p style="color:#bbb;font-size:11px;margin:6px 0 0;">
                Este mensaje fue enviado automáticamente, por favor no respondas a este correo.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// ── Enviar un solo email ─────────────────────────────────────────────────────
const enviarEmail = async ({ to, subject, titulo, mensaje, nombreAlumno, footer }) => {
  const emailUser = (process.env.EMAIL_USER || '').trim();
  const emailPass = (process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD || '').trim();
  if (!emailUser || !emailPass) {
    throw new Error('EMAIL_USER y EMAIL_PASS no están configurados en las variables de entorno del backend');
  }

  const transporter = crearTransporter();
  const html = templateBase({ titulo, mensaje, nombreAlumno, footer });

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || `"Escuela Bedolla" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html
  });

  return info;
};

// ── Enviar email masivo (con manejo de errores por destinatario) ──────────────
const enviarEmailMasivo = async ({ destinatarios, subject, titulo, mensaje, footer }) => {
  const resultados = {
    enviados: 0,
    fallidos: 0,
    errores: []
  };

  for (const dest of destinatarios) {
    try {
      await enviarEmail({
        to: dest.email,
        subject,
        titulo,
        mensaje,
        nombreAlumno: dest.nombre || '',
        footer
      });
      resultados.enviados++;
      // Pequeña pausa para no saturar Gmail (límite ~500/día en cuentas normales)
      await new Promise(r => setTimeout(r, 100));
    } catch (error) {
      resultados.fallidos++;
      resultados.errores.push({ email: dest.email, error: error.message });
    }
  }

  return resultados;
};

// ── Verificar conexión SMTP ──────────────────────────────────────────────────
const verificarConexion = async () => {
  const emailUser = (process.env.EMAIL_USER || '').trim();
  const emailPass = (process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD || '').trim();
  
  if (!emailUser || !emailPass) {
    return { 
      ok: false, 
      error: 'Credenciales no configuradas. Verifica EMAIL_USER y EMAIL_PASS en el .env del backend.'
    };
  }
  try {
    const transporter = crearTransporter();
    await transporter.verify();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
};

module.exports = { enviarEmail, enviarEmailMasivo, verificarConexion };