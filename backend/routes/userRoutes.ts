import express, { type NextFunction, type Response } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import * as userController from "../controllers/userController";
import * as logInController from "../controllers/loginController";
import * as registerController from "../controllers/registerController";
import * as logoutController from "../controllers/logoutController";
import * as forgotPasswordController from "../controllers/forgotPasswordController";
import * as adminController from "../controllers/adminController";
import * as consumptionController from "../controllers/consumptionController";
import * as paymentController from "../controllers/paymentController";
import * as notificationController from "../controllers/notificationController";
import * as settingsController from "../controllers/settingsController";
import * as tokenController from "../controllers/tokenController";
import * as reportController from "../controllers/reportController";
import * as backupController from "../controllers/backupController";
import * as analyticsController from "../controllers/analyticsController";
import * as userDashboardController from "../controllers/userDashboardController";
import * as exportController from "../controllers/exportController";
import authenticate from "../middleware/authenticate";
import * as opsController from "../controllers/opsController";
import requireAdmin from "../middleware/requireAdmin";
import { requireOps } from "../middleware/requireOps";
import { wrapAsync } from "../middleware/wrapAsync";
import { auditAdmin } from "../middleware/auditAdmin";
import type { AuthRequest } from "../types/express";

const router = express.Router();

const requireAdminOrSelf = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const role = (req.user?.role || "").toUpperCase();
  if (role === "ADMIN" || role === "SUPER_ADMIN" || req.user?.uuid === req.params.uuid) {
    next();
    return;
  }
  res.status(403).json({ message: "Access denied." });
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
      cb(null, false);
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
    const safe = String(req.params.uuid || "row").replace(/[^a-zA-Z0-9-_]/g, "");
    cb(null, `meter-${safe}-${Date.now()}${ext}`);
  },
});
const uploadMeter = multer({
  storage: meterStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpeg|png|webp|gif)$/i.test(file.mimetype || "");
    if (!ok) {
      cb(null, false);
      return;
    }
    cb(null, true);
  },
});

// Public routes (no auth required)
router.post('/register', registerController.registerUser);
router.post('/login', logInController.loginUser);
router.post('/login/2fa', logInController.verifyLogin2fa);
router.post('/forgot-password', forgotPasswordController.forgotPassword);
router.post('/verify-otp', forgotPasswordController.verifyOTP);
router.post('/reset-password', forgotPasswordController.resetPassword);
router.post('/refresh-token', tokenController.refreshToken);

// Get rate per liter (public - for display purposes)
router.get('/settings/rate', settingsController.getRatePerLiter);
// Get branding settings (public - for app name, footer, bills)
router.get('/settings/branding', settingsController.getBrandingSettings);
router.post('/public/connection-applications', wrapAsync(opsController.createApplication));

// Middleware for protected routes
router.use(authenticate);

// Protected routes - User
router.post('/logout', logoutController.logoutUser);
router.get("/profile", userController.getProfile);
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
router.put('/notifications/:uuid/read', wrapAsync(opsController.markMyNotificationRead));
router.put('/notifications/mark-all-read', wrapAsync(opsController.markAllMyNotificationsRead));
router.post('/tickets', wrapAsync(opsController.createTicket));
router.get('/tickets', wrapAsync(opsController.listTickets));
router.get('/connections/mine', wrapAsync(opsController.myConnections));
router.post('/connection-applications', wrapAsync(opsController.createApplication));

router.post('/security/2fa/begin', wrapAsync(opsController.beginTotp));
router.post('/security/2fa/confirm', wrapAsync(opsController.confirmTotp));
router.post('/security/2fa/disable', wrapAsync(opsController.disableTotp));

// User profile by UUID: admin can see any user; regular user can only see self
router.get('/user/:uuid', requireAdminOrSelf, userController.getUserByUuid);

// User dashboard summary and bill
router.get('/user/summary', userDashboardController.getSummary);
router.get('/user/bill/:consumption_uuid', userDashboardController.getBillData);
router.get('/admin/bill/:consumption_uuid', requireAdmin, userDashboardController.getBillDataAdmin);

// Admin-only routes - User management
router.post('/admin/create-user', requireAdmin, auditAdmin('CREATE_USER', 'user', (_req, body) => (body as { uuid?: string })?.uuid ?? null), adminController.createAdminUser);
router.get('/admin/role-policy', requireAdmin, adminController.getRolePolicy);
router.post('/admin/bulk-import', requireAdmin, upload.single('file'), auditAdmin('BULK_IMPORT_USERS'), adminController.bulkImportUsers);
router.get('/users', requireAdmin, userController.getAllUsers);
router.get('/users/id/:id', requireAdmin, userController.getUserById);
router.put('/users/:uuid', requireAdmin, auditAdmin('UPDATE_USER', 'user', (req) => String(req.params.uuid)), userController.updateUser);
router.delete('/users/:uuid', requireAdmin, auditAdmin('DELETE_USER', 'user', (req) => String(req.params.uuid)), userController.deleteUser);
router.post('/admin/bulk-status', requireAdmin, auditAdmin('BULK_UPDATE_STATUS'), adminController.bulkUpdateStatus);

// Admin-only routes - Consumption management
router.post('/admin/consumption', requireAdmin, auditAdmin('ADD_CONSUMPTION', 'consumption', (_req, body) => (body as { consumption?: { uuid?: string } })?.consumption?.uuid ?? null), consumptionController.addConsumption);
router.post('/admin/bulk-consumption', requireAdmin, upload.single('file'), auditAdmin('BULK_IMPORT_CONSUMPTION'), adminController.bulkImportConsumption);
router.get('/admin/consumption/all', requireAdmin, consumptionController.getAllConsumption);
router.get('/admin/consumption/unpaid-all', requireAdmin, consumptionController.getAllUnpaidConsumptionAdmin);
router.get('/admin/consumption/:user_uuid', requireAdmin, consumptionController.getConsumptionHistoryByUser);
router.put('/admin/consumption/:uuid', requireAdmin, auditAdmin('UPDATE_CONSUMPTION', 'consumption', (req) => String(req.params.uuid)), consumptionController.updateConsumption);
router.post('/admin/meter-photo/:uuid', requireAdmin, uploadMeter.single('meter_photo'), consumptionController.uploadMeterPhoto);
router.delete('/admin/consumption/:uuid', requireAdmin, auditAdmin('DELETE_CONSUMPTION', 'consumption', (req) => String(req.params.uuid)), consumptionController.deleteConsumption);

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
router.post('/admin/notifications/:uuid/reject-payment', requireAdmin, notificationController.rejectPaymentNotificationAdmin);
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

// Ops suite
router.get('/admin/ops/settings', requireAdmin, wrapAsync(opsController.getOpsSettings));
router.put('/admin/ops/settings', requireAdmin, wrapAsync(opsController.updateOpsSettings));
router.post('/admin/ops/bill-run', requireAdmin, wrapAsync(opsController.runBillCycle));
router.post('/admin/ops/late-fees', requireAdmin, wrapAsync(opsController.applyLateFees));
router.post('/admin/ops/credit-note', requireAdmin, wrapAsync(opsController.creditNote));
router.post('/admin/ops/deposit', requireAdmin, wrapAsync(opsController.adjustDeposit));
router.post('/admin/ops/pay-from-deposit', requireAdmin, wrapAsync(opsController.payFromDeposit));
router.get('/admin/ops/print-pack', requireAdmin, wrapAsync(opsController.printPack));
router.get('/admin/ops/board-pack', requireAdmin, wrapAsync(opsController.boardPack));
router.post('/admin/ops/reminders', requireAdmin, wrapAsync(opsController.sendReminders));
router.post('/admin/ops/extra-connection', requireAdmin, wrapAsync(opsController.extraConnection));
router.get('/admin/ops/applications', requireAdmin, wrapAsync(opsController.listApplications));
router.post('/admin/ops/applications/:uuid/decide', requireAdmin, wrapAsync(opsController.decideApplication));
router.post('/admin/ops/connection-status', requireAdmin, wrapAsync(opsController.setConnectionStatus));
router.patch('/admin/ops/tickets/:uuid', requireAdmin, wrapAsync(opsController.updateTicket));

router.get('/ops/leaks', requireOps, wrapAsync(opsController.leakAlerts));
router.post('/ops/readings', requireOps, wrapAsync(opsController.submitReading));
router.get('/ops/readings/pending', requireAdmin, wrapAsync(opsController.pendingReadings));
router.post('/ops/readings/:uuid/decide', requireAdmin, wrapAsync(opsController.decideReading));
router.get('/ops/routes', requireOps, wrapAsync(opsController.listRoutes));
router.post('/ops/routes', requireAdmin, wrapAsync(opsController.saveRoute));
router.get('/ops/my-route', requireOps, wrapAsync(opsController.myRoute));
router.get('/ops/meters', requireOps, wrapAsync(opsController.meterMaster));
router.put('/ops/meters/:uuid', requireAdmin, wrapAsync(opsController.updateMeter));
router.get('/ops/map', requireOps, wrapAsync(opsController.mapPoints));

export default router;

