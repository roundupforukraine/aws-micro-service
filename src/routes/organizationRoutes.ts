import { Router } from 'express';
import { body, param } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest';
import { apiKeyAuth } from '../middleware/apiKeyAuth';
import { registerOrganization, getOrganization, updateOrganization } from '../controllers/organizationController';

const router = Router();

// All routes require authentication
router.use(apiKeyAuth);

// Register new organization (admin only)
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Organization name is required'),
  ],
  validateRequest,
  registerOrganization
);

// Get organization details
router.get(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid organization ID'),
  ],
  validateRequest,
  getOrganization
);

// Update organization
router.put(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid organization ID'),
    body('name').optional().trim().notEmpty().withMessage('Organization name cannot be empty'),
  ],
  validateRequest,
  updateOrganization
);

export default router; 