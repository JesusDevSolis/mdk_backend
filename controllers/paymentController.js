const Payment = require('../models/Payments');
const Alumno = require('../models/Alumno');
const Tutor = require('../models/Tutor');
const Sucursal = require('../models/Sucursal');
const Configuracion = require('../models/Configuracion'); // ✅ NUEVO
const mongoose = require('mongoose');

// ✅ NUEVO: Función helper para obtener valores de configuración
const getConfigValue = async (clave, valorDefecto) => {
  try {
    return await Configuracion.getValor(clave, valorDefecto);
  } catch (error) {
    console.warn(`No se pudo obtener configuración ${clave}, usando valor por defecto:`, valorDefecto);
    return valorDefecto;
  }
};

// ✅ NUEVO: Función para calcular recargo automáticamente
const calcularRecargoAutomatico = async (payment) => {
  try {
    // Obtener configuración
    const diasGracia = await getConfigValue('pago_dias_gracia', 5);
    const porcentajeRecargo = await getConfigValue('pago_recargo_tardio', 10);

    // Calcular días de retraso
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaVencimiento = new Date(payment.dueDate);
    fechaVencimiento.setHours(0, 0, 0, 0);
    
    const diasRetraso = Math.floor((hoy - fechaVencimiento) / (1000 * 60 * 60 * 24));

    // Si no ha pasado el periodo de gracia, no hay recargo
    if (diasRetraso <= diasGracia) {
      return {
        aplicaRecargo: false,
        diasRetraso,
        diasGracia,
        porcentajeRecargo: 0,
        montoRecargo: 0
      };
    }

    // Calcular recargo
    const montoRecargo = (payment.amount * porcentajeRecargo) / 100;

    return {
      aplicaRecargo: true,
      diasRetraso,
      diasGracia,
      porcentajeRecargo,
      montoRecargo: Math.round(montoRecargo * 100) / 100 // Redondear a 2 decimales
    };

  } catch (error) {
    console.error('Error al calcular recargo:', error);
    return {
      aplicaRecargo: false,
      diasRetraso: 0,
      diasGracia: 5,
      porcentajeRecargo: 0,
      montoRecargo: 0
    };
  }
};

// ========================================
// ✅ NUEVO: OBTENER CONFIGURACIONES DE PAGOS
// ========================================
exports.getConfiguracionesPagos = async (req, res) => {
  try {
    const diasGracia = await getConfigValue('pago_dias_gracia', 5);
    const recargoTardio = await getConfigValue('pago_recargo_tardio', 10);
    const requiereComprobante = await getConfigValue('pago_requiere_comprobante', false);

    res.status(200).json({
      success: true,
      data: {
        diasGracia,
        recargoTardio,
        requiereComprobante
      }
    });
  } catch (error) {
    console.error('Error al obtener configuraciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener configuraciones',
      error: error.message
    });
  }
};

// ========================================
// ✅ NUEVO: CALCULAR RECARGO PARA UN PAGO
// ========================================
exports.calcularRecargo = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de pago inválido'
      });
    }

    const payment = await Payment.findById(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Pago no encontrado'
      });
    }

    if (payment.status === 'pagado') {
      return res.status(400).json({
        success: false,
        message: 'El pago ya está marcado como pagado'
      });
    }

    const recargoInfo = await calcularRecargoAutomatico(payment);

    res.status(200).json({
      success: true,
      data: {
        pagoId: payment._id,
        montoOriginal: payment.amount,
        ...recargoInfo,
        totalConRecargo: payment.amount + recargoInfo.montoRecargo
      }
    });

  } catch (error) {
    console.error('Error al calcular recargo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al calcular recargo',
      error: error.message
    });
  }
};

// ===== OBTENER TODOS LOS PAGOS =====
exports.getAllPayments = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      type, 
      alumno, 
      tutor, 
      sucursal,
      startDate,
      endDate,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filters = { isActive: true };

    if (status) filters.status = status;
    if (type) filters.type = type;
    if (alumno) filters.alumno = alumno;
    if (tutor) filters.tutor = tutor;
    if (sucursal) filters.sucursal = sucursal;

    if (startDate || endDate) {
      filters.dueDate = {};
      if (startDate) filters.dueDate.$gte = new Date(startDate);
      if (endDate) filters.dueDate.$lte = new Date(endDate);
    }

    if (search) {
      filters.$or = [
        { receiptNumber: { $regex: search, $options: 'i' } },
        { paymentReference: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const payments = await Payment.find(filters)
      .populate('alumno', 'firstName lastName enrollment.studentId email phone')
      .populate('tutor', 'firstName lastName email phones.primary')
      .populate('sucursal', 'name address.city')
      .populate('createdBy', 'name email')
      .populate('paidBy', 'name')
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Payment.countDocuments(filters);
    const totalPages = Math.ceil(total / parseInt(limit));
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.status(200).json({
      success: true,
      data: payments.map(p => p.getPublicInfo()),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    });
  } catch (error) {
    console.error('Error al obtener pagos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los pagos',
      error: error.message
    });
  }
};

// ===== OBTENER PAGO POR ID =====
exports.getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de pago inválido'
      });
    }

    const payment = await Payment.findById(id)
      .populate('alumno', 'firstName lastName enrollment.studentId email phone dateOfBirth gender')
      .populate('tutor', 'firstName lastName email phones identification')
      .populate('sucursal', 'name address contact')
      .populate('createdBy', 'name email')
      .populate('lastModifiedBy', 'name')
      .populate('paidBy', 'name')
      .populate('receiptFile.uploadedBy', 'name');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Pago no encontrado'
      });
    }

    // ✅ INTEGRACIÓN: Calcular recargo si está pendiente o vencido
    let recargoInfo = null;
    if (payment.status === 'pendiente' || payment.status === 'vencido') {
      recargoInfo = await calcularRecargoAutomatico(payment);
    }

    res.status(200).json({
      success: true,
      data: {
        ...payment.getPublicInfo(),
        recargoCalculado: recargoInfo
      }
    });
  } catch (error) {
    console.error('Error al obtener pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el pago',
      error: error.message
    });
  }
};

// ===== CREAR NUEVO PAGO =====
exports.createPayment = async (req, res) => {
  try {
    const paymentData = {
      ...req.body,
      createdBy: req.user._id
    };

    const payment = new Payment(paymentData);
    await payment.save();

    const paymentPopulated = await Payment.findById(payment._id)
      .populate('alumno', 'firstName lastName enrollment.studentId')
      .populate('tutor', 'firstName lastName email phones.primary')
      .populate('sucursal', 'name')
      .populate('createdBy', 'name');

    res.status(201).json({
      success: true,
      message: 'Pago creado exitosamente',
      data: paymentPopulated.getPublicInfo()
    });
  } catch (error) {
    console.error('Error al crear pago:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al crear el pago',
      error: error.message
    });
  }
};

// ===== ACTUALIZAR PAGO =====
exports.updatePayment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de pago inválido'
      });
    }

    const payment = await Payment.findById(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Pago no encontrado'
      });
    }

    if (payment.status === 'pagado' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No se pueden modificar pagos ya realizados'
      });
    }

    Object.keys(req.body).forEach(key => {
      if (key !== '_id' && key !== 'createdBy' && key !== 'createdAt') {
        payment[key] = req.body[key];
      }
    });

    payment.lastModifiedBy = req.user._id;
    await payment.save();

    const paymentPopulated = await Payment.findById(payment._id)
      .populate('alumno', 'firstName lastName enrollment.studentId')
      .populate('tutor', 'firstName lastName')
      .populate('sucursal', 'name')
      .populate('lastModifiedBy', 'name');

    res.status(200).json({
      success: true,
      message: 'Pago actualizado exitosamente',
      data: paymentPopulated.getPublicInfo()
    });
  } catch (error) {
    console.error('Error al actualizar pago:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al actualizar el pago',
      error: error.message
    });
  }
};

// ===== ELIMINAR PAGO =====
exports.deletePayment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de pago inválido'
      });
    }

    const payment = await Payment.findById(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Pago no encontrado'
      });
    }

    if (payment.status === 'pagado' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No se pueden eliminar pagos ya realizados. Considere cancelarlo.'
      });
    }

    payment.isActive = false;
    payment.lastModifiedBy = req.user._id;
    await payment.save();

    res.status(200).json({
      success: true,
      message: 'Pago eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar el pago',
      error: error.message
    });
  }
};

// ===== MARCAR PAGO COMO PAGADO (✅ INTEGRADO CON RECARGO) =====
exports.markAsPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const { paidDate, paymentMethod, paymentReference, notes, aplicarRecargo } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de pago inválido'
      });
    }

    const payment = await Payment.findById(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Pago no encontrado'
      });
    }

    if (payment.status === 'pagado') {
      return res.status(400).json({
        success: false,
        message: 'El pago ya está marcado como pagado'
      });
    }

    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'El método de pago es requerido'
      });
    }

    // ✅ INTEGRACIÓN: Calcular y aplicar recargo si corresponde
    let montoFinal = payment.amount;
    let recargoAplicado = null;

    if (aplicarRecargo !== false) { // Por defecto aplica recargo
      const recargoInfo = await calcularRecargoAutomatico(payment);
      
      if (recargoInfo.aplicaRecargo) {
        montoFinal = payment.amount + recargoInfo.montoRecargo;
        recargoAplicado = {
          diasRetraso: recargoInfo.diasRetraso,
          diasGracia: recargoInfo.diasGracia,
          porcentaje: recargoInfo.porcentajeRecargo,
          monto: recargoInfo.montoRecargo
        };

        // Actualizar el total del pago
        payment.total = montoFinal;
        payment.lateFee = recargoInfo.montoRecargo;
      }
    }

    // Marcar como pagado
    await payment.markAsPaid({
      paidDate: paidDate || new Date(),
      paymentMethod,
      paymentReference
    }, req.user._id);

    if (notes) {
      payment.notes = notes;
      await payment.save();
    }

    const paymentUpdated = await Payment.findById(payment._id)
      .populate('alumno', 'firstName lastName enrollment.studentId')
      .populate('tutor', 'firstName lastName email phones.primary')
      .populate('sucursal', 'name')
      .populate('paidBy', 'name');

    res.status(200).json({
      success: true,
      message: 'Pago marcado como pagado exitosamente',
      data: {
        ...paymentUpdated.getPublicInfo(),
        recargoAplicado
      }
    });
  } catch (error) {
    console.error('Error al marcar pago como pagado:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar el pago como pagado',
      error: error.message
    });
  }
};

// ===== CANCELAR PAGO =====
exports.cancelPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de pago inválido'
      });
    }

    const payment = await Payment.findById(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Pago no encontrado'
      });
    }

    if (payment.status === 'cancelado') {
      return res.status(400).json({
        success: false,
        message: 'El pago ya está cancelado'
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar una razón para cancelar el pago'
      });
    }

    await payment.cancel(req.user._id, reason);

    const paymentUpdated = await Payment.findById(payment._id)
      .populate('alumno', 'firstName lastName enrollment.studentId')
      .populate('sucursal', 'name')
      .populate('lastModifiedBy', 'name');

    res.status(200).json({
      success: true,
      message: 'Pago cancelado exitosamente',
      data: paymentUpdated.getPublicInfo()
    });
  } catch (error) {
    console.error('Error al cancelar pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cancelar el pago',
      error: error.message
    });
  }
};

// ===== OBTENER PAGOS PENDIENTES =====
exports.getPendingPayments = async (req, res) => {
  try {
    const { sucursal, alumno } = req.query;

    const filters = {};
    if (sucursal) filters.sucursal = sucursal;
    if (alumno) filters.alumno = alumno;

    const payments = await Payment.findPending(filters);

    res.status(200).json({
      success: true,
      data: payments.map(p => p.getPublicInfo()),
      count: payments.length
    });
  } catch (error) {
    console.error('Error al obtener pagos pendientes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener pagos pendientes',
      error: error.message
    });
  }
};

// ===== OBTENER PAGOS VENCIDOS (✅ INTEGRADO CON RECARGO) =====
exports.getOverduePayments = async (req, res) => {
  try {
    const { sucursal, alumno } = req.query;

    const filters = {};
    if (sucursal) filters.sucursal = sucursal;
    if (alumno) filters.alumno = alumno;

    const payments = await Payment.findOverdue(filters);

    // ✅ INTEGRACIÓN: Calcular recargo para cada pago vencido
    const paymentsConRecargo = await Promise.all(
      payments.map(async (payment) => {
        const recargoInfo = await calcularRecargoAutomatico(payment);
        return {
          ...payment.getPublicInfo(),
          recargoCalculado: recargoInfo
        };
      })
    );

    res.status(200).json({
      success: true,
      data: paymentsConRecargo,
      count: paymentsConRecargo.length
    });
  } catch (error) {
    console.error('Error al obtener pagos vencidos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener pagos vencidos',
      error: error.message
    });
  }
};

// ===== OBTENER PAGOS POR ALUMNO =====
exports.getPaymentsByAlumno = async (req, res) => {
  try {
    const { alumnoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(alumnoId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de alumno inválido'
      });
    }

    const payments = await Payment.findByAlumno(alumnoId);

    res.status(200).json({
      success: true,
      data: payments.map(p => p.getPublicInfo()),
      count: payments.length
    });
  } catch (error) {
    console.error('Error al obtener pagos por alumno:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener pagos del alumno',
      error: error.message
    });
  }
};

// ===== OBTENER PAGOS POR TUTOR =====
exports.getPaymentsByTutor = async (req, res) => {
  try {
    const { tutorId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(tutorId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de tutor inválido'
      });
    }

    const payments = await Payment.findByTutor(tutorId);

    res.status(200).json({
      success: true,
      data: payments.map(p => p.getPublicInfo()),
      count: payments.length
    });
  } catch (error) {
    console.error('Error al obtener pagos por tutor:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener pagos del tutor',
      error: error.message
    });
  }
};

// ===== OBTENER ESTADÍSTICAS DE PAGOS =====
exports.getPaymentStats = async (req, res) => {
  try {
    const { sucursal, startDate, endDate } = req.query;

    const filters = {};
    if (sucursal) filters.sucursal = mongoose.Types.ObjectId(sucursal);
    
    if (startDate || endDate) {
      filters.createdAt = {};
      if (startDate) filters.createdAt.$gte = new Date(startDate);
      if (endDate) filters.createdAt.$lte = new Date(endDate);
    }

    const stats = await Payment.getStats(filters);

    const statsByType = await Payment.aggregate([
      { $match: { isActive: true, ...filters } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          total: { $sum: '$total' }
        }
      }
    ]);

    const statsByMonth = await Payment.aggregate([
      { $match: { isActive: true, status: 'pagado', ...filters } },
      {
        $group: {
          _id: {
            year: { $year: '$paidDate' },
            month: { $month: '$paidDate' }
          },
          count: { $sum: 1 },
          total: { $sum: '$total' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    res.status(200).json({
      success: true,
      data: {
        general: stats,
        byType: statsByType,
        byMonth: statsByMonth
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas de pagos',
      error: error.message
    });
  }
};

// ===== SUBIR COMPROBANTE DE PAGO =====
exports.uploadReceipt = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de pago inválido'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se ha proporcionado ningún archivo'
      });
    }

    const payment = await Payment.findById(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Pago no encontrado'
      });
    }

    payment.receiptFile = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: `/uploads/documents/${req.file.filename}`,
      uploadedAt: new Date(),
      uploadedBy: req.user._id
    };

    await payment.save();

    const paymentUpdated = await Payment.findById(payment._id)
      .populate('alumno', 'firstName lastName')
      .populate('receiptFile.uploadedBy', 'name');

    res.status(200).json({
      success: true,
      message: 'Comprobante subido exitosamente',
      data: paymentUpdated.getPublicInfo()
    });
  } catch (error) {
    console.error('Error al subir comprobante:', error);
    res.status(500).json({
      success: false,
      message: 'Error al subir el comprobante',
      error: error.message
    });
  }
};

module.exports = exports;