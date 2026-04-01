const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const multer = require('multer');
const userController = require('../controllers/userController');
const logInController = require('../controllers/loginController');
const registerController = require('../controllers/registerController');
const logoutController = require('../controllers/logoutController');
const forgotPasswordController = require('../controllers/forgotPasswordController');
const adminController = require('../controllers/adminController');
const consumptionController = require('../controllers/consumptionController');
const paymentController = require('../controllers/paymentController');
const notificationController = require('../controllers/notificationController');
const settingsController = require('../controllers/settingsController');
const tokenController = require('../controllers/tokenController');
const reportController = require('../controllers/reportController');
const backupController = require('../controllers/backupController');
const analyticsController = require('../controllers/analyticsController');
const userDashboardController = require('../controllers/userDashboardController');
const exportController = require('../controllers/exportController');
const authenticate = require('../middleware/authenticate');
const requireAdmin = require('../middleware/requireAdmin');
const { auditAdmin } = require('../middleware/auditAdmin');

// Allow access only if requester is admin or requesting own profile
const requireAdminOrSelf = (req, res, next) => {
  const role = (req.user?.role || '').toUpperCase();
  if (role === 'ADMIN' || req.user?.uuid === req.params.uuid) return next();
  return res.status(403).json({ message: 'Access denied.' });
};

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Accept only Excel and CSV files
    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls|csv)$/)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel (.xlsx, .xls) and CSV files are allowed'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

const meterUploadDir = path.join(__dirname, '..', 'uploads', 'meter');
try {
  fs.mkdirSync(meterUploadDir, { recursive: true });
} catch (_) {
  /* ignore */
}
const meterStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, meterUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '') || '.jpg';
    const safe = (req.params.uuid || 'row').replace(/[^a-zA-Z0-9-_]/g, '');
    cb(null, `meter-${safe}-${Date.now()}${ext}`);
  },
});
const uploadMeter = multer({
  storage: meterStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpeg|png|webp|gif)$/i.test(file.mimetype || '');
    cb(ok ? null : new Error('Only JPEG, PNG, WebP, or GIF images are allowed'), ok);
  },
});

// Public routes (no auth required)
router.post('/register', registerController.registerUser);
router.post('/login', logInController.loginUser);
router.post('/forgot-password', forgotPasswordController.forgotPassword);
router.post('/verify-otp', forgotPasswordController.verifyOTP);
router.post('/reset-password', forgotPasswordController.resetPassword);
router.post('/refresh-token', tokenController.refreshToken);

// Get rate per liter (public - for display purposes)
router.get('/settings/rate', settingsController.getRatePerLiter);
// Get branding settings (public - for app name, footer, bills)
router.get('/settings/branding', settingsController.getBrandingSettings);

// Middleware for protected routes
router.use(authenticate);

// Protected routes - User
router.post('/logout', logoutController.logoutUser);
router.get('/profile', (req, res) => {
  res.json(req.user);
});
router.put('/profile/update', userController.updateProfile);

// Consumption routes - User
router.get('/consumption/history', consumptionController.getConsumptionHistory);
router.get('/consumption/due', consumptionController.getDueAmount);
router.get('/consumption/due-summary', consumptionController.getDueSummary);
router.get('/consumption/unpaid', consumptionController.getUnpaidBills);

// Payment routes - User
router.get('/payment/history', paymentController.getPaymentHistory);
router.post('/payment/record', paymentController.recordPayment);
router.post('/payment/notify-completed', notificationController.createPaymentNotification);
router.get('/payment/qr/:consumption_uuid', paymentController.generatePaymentQR);
router.get('/payment/total', paymentController.getTotalPaid);
router.get('/notifications', notificationController.getMyNotifications);

// User profile by UUID: admin can see any user; regular user can only see self
router.get('/user/:uuid', requireAdminOrSelf, userController.getUserByUuid);

// User dashboard summary and bill
router.get('/user/summary', userDashboardController.getSummary);
router.get('/user/bill/:consumption_uuid', userDashboardController.getBillData);
router.get('/admin/bill/:consumption_uuid', requireAdmin, userDashboardController.getBillDataAdmin);

// Admin-only routes - User management
router.post('/admin/create-user', requireAdmin, auditAdmin('CREATE_USER', 'user', (req, body) => body?.uuid), adminController.createAdminUser);
router.post('/admin/bulk-import', requireAdmin, upload.single('file'), auditAdmin('BULK_IMPORT_USERS'), adminController.bulkImportUsers);
router.get('/users', requireAdmin, userController.getAllUsers);
router.get('/users/id/:id', requireAdmin, userController.getUserById);
router.put('/users/:uuid', requireAdmin, auditAdmin('UPDATE_USER', 'user', (req) => req.params.uuid), userController.updateUser);
router.delete('/users/:uuid', requireAdmin, auditAdmin('DELETE_USER', 'user', (req) => req.params.uuid), userController.deleteUser);
router.post('/admin/bulk-status', requireAdmin, auditAdmin('BULK_UPDATE_STATUS'), adminController.bulkUpdateStatus);

// Admin-only routes - Consumption management
router.post('/admin/consumption', requireAdmin, auditAdmin('ADD_CONSUMPTION', 'consumption', (req, body) => body?.consumption?.uuid), consumptionController.addConsumption);
router.post('/admin/bulk-consumption', requireAdmin, upload.single('file'), auditAdmin('BULK_IMPORT_CONSUMPTION'), adminController.bulkImportConsumption);
router.get('/admin/consumption/all', requireAdmin, consumptionController.getAllConsumption);
router.get('/admin/consumption/unpaid-all', requireAdmin, consumptionController.getAllUnpaidConsumptionAdmin);
router.get('/admin/consumption/:user_uuid', requireAdmin, consumptionController.getConsumptionHistoryByUser);
router.put('/admin/consumption/:uuid', requireAdmin, auditAdmin('UPDATE_CONSUMPTION', 'consumption', (req) => req.params.uuid), consumptionController.updateConsumption);
router.post('/admin/meter-photo/:uuid', requireAdmin, uploadMeter.single('meter_photo'), consumptionController.uploadMeterPhoto);
router.delete('/admin/consumption/:uuid', requireAdmin, auditAdmin('DELETE_CONSUMPTION', 'consumption', (req) => req.params.uuid), consumptionController.deleteConsumption);

// Admin-only routes - Payment management
router.get('/admin/payments', requireAdmin, paymentController.getAllPayments);
router.get('/admin/payments/this-month', requireAdmin, paymentController.getPaymentsThisMonthAdmin);
router.get('/admin/payments/:user_uuid', requireAdmin, paymentController.getPaymentHistoryByUser);
router.get('/admin/notifications', requireAdmin, notificationController.getAllNotificationsAdmin);
router.get('/admin/notifications/unread-count', requireAdmin, notificationController.getUnreadCountAdmin);
router.get('/admin/notifications/user/:user_uuid', requireAdmin, notificationController.getPaymentNotificationsByUserAdmin);
router.get('/admin/notifications/user/:user_uuid/unread-count', requireAdmin, notificationController.getUnreadPaymentNotificationCountByUserAdmin);
router.put('/admin/notifications/mark-all-read', requireAdmin, notificationController.markAllPaymentNotificationsReadAdmin);
router.put('/admin/notifications/user/:user_uuid/mark-all-read', requireAdmin, notificationController.markAllPaymentNotificationsReadByUserAdmin);
router.put('/admin/notifications/:uuid/read', requireAdmin, notificationController.markNotificationReadAdmin);
router.post('/admin/notifications/:uuid/approve-payment', requireAdmin, notificationController.approvePaymentNotificationAdmin);

// Admin-only routes - Settings
router.get('/admin/settings', requireAdmin, settingsController.getAllSettings);
router.put('/admin/settings', requireAdmin, settingsController.updateSetting);
router.put('/admin/settings/rate', requireAdmin, settingsController.updateRatePerLiter);
router.get('/admin/settings/upi', requireAdmin, settingsController.getUpiSettings);
router.put('/admin/settings/upi', requireAdmin, settingsController.updateUpiSettings);
router.get('/admin/settings/branding', requireAdmin, settingsController.getBrandingSettings);
router.put('/admin/settings/branding', requireAdmin, settingsController.updateBrandingSettings);

// Admin - Reports
router.get('/admin/reports/revenue', requireAdmin, reportController.getRevenueReport);
router.get('/admin/reports/consumption', requireAdmin, reportController.getConsumptionReport);
router.get('/admin/reports/outstanding', requireAdmin, reportController.getOutstandingReport);
router.get('/admin/reports/audit', requireAdmin, reportController.getAuditLog);

// Admin - Backup/Restore
router.get('/admin/backup/export', requireAdmin, backupController.exportData);
router.post('/admin/backup/restore', requireAdmin, auditAdmin('BACKUP_RESTORE'), backupController.restoreData);

// Admin - Analytics
router.get('/admin/analytics/kpis', requireAdmin, analyticsController.getKPIs);
router.get('/admin/analytics/consumption-trends', requireAdmin, analyticsController.getConsumptionTrends);
router.get('/admin/analytics/payment-methods', requireAdmin, analyticsController.getPaymentMethodStats);
router.get('/admin/analytics/collection-efficiency', requireAdmin, analyticsController.getCollectionEfficiency);

router.get('/admin/export/consumers', requireAdmin, exportController.exportConsumers);

module.exports = router;

