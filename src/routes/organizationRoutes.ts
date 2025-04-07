import { Router } from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest';
import { apiKeyAuth } from '../middleware/apiKeyAuth';
import {
  registerOrganization,
  getOrganization,
  updateOrganization,
} from '../controllers/organizationController';

// Create separate routers for registration and protected routes
const registrationRouter = Router();
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

// Register a new organization (no API key required)
registrationRouter.post(
  '/',
  [
    body('name').notEmpty().withMessage('Organization name is required'),
    validateRequest,
  ],
  registerOrganization
);

// Get organization details (requires API key)
router.get(
  '/:id',
  [
    body('id').isUUID().withMessage('Invalid organization ID'),
    validateRequest,
  ],
  getOrganization
);

// Update organization details (requires API key)
router.put(
  '/:id',
  [
    body('id').isUUID().withMessage('Invalid organization ID'),
    body('name').optional().notEmpty().withMessage('Organization name cannot be empty'),
    validateRequest,
  ],
  updateOrganization
);

export { registrationRouter, router as default }; 