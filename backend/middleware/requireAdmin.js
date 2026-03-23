/**
 * Restricts access to ADMIN role only. Use after authenticate middleware.
 * Returns 403 Forbidden if the authenticated user is not an admin.
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required.' });
  }
  const role = (req.user.role || '').toUpperCase();
  if (role !== 'ADMIN') {
    return res.status(403).json({ message: 'Admin access required.' });
  }
  next();
};

module.exports = requireAdmin;
