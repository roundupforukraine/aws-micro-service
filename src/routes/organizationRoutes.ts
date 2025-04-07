import { Router } from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest';
import { apiKeyAuth } from '../middleware/apiKeyAuth';
import {
  registerOrganization,
  getOrganization,
  updateOrganization,
} from '../controllers/organizationController';

const router = Router();

/**
 * Organization Routes
 * 
 * This router defines the following endpoints:
 * 
 * POST /api/organizations/register
 * - Register a new organization
 * - Requires: name (non-empty string)
 * - Returns: organization details with API key
 * 
 * GET /api/organizations/:id
 * - Get organization details by ID
 * - Requires: valid API key, organization ID (UUID)
 * - Returns: organization details
 * 
 * PUT /api/organizations/:id
 * - Update organization details
 * - Requires: valid API key, organization ID (UUID), name (optional)
 * - Returns: updated organization details
 */

// Register a new organization
router.post(
  '/register',
  [
    body('name').notEmpty().withMessage('Organization name is required'),
    validateRequest,
  ],
  registerOrganization
);

// Get organization details
router.get(
  '/:id',
  [
    body('id').isUUID().withMessage('Invalid organization ID'),
    validateRequest,
    apiKeyAuth,
  ],
  getOrganization
);

// Update organization details
router.put(
  '/:id',
  [
    body('id').isUUID().withMessage('Invalid organization ID'),
    body('name').optional().notEmpty().withMessage('Organization name cannot be empty'),
    validateRequest,
    apiKeyAuth,
  ],
  updateOrganization
);

export default router; 