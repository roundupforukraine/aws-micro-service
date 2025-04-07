import express from 'express';
import { registerOrganization, getOrganization, updateOrganization, listOrganizations } from '../controllers/organizationController';
import { adminAuth, combinedAuth } from '../middleware/authMiddleware';

const router = express.Router();

/**
 * Organization Routes
 * 
 * This router defines the following endpoints:
 * 
 * POST /api/organizations/register
 * - Register a new organization
 * - Requires: admin API key, name (non-empty string)
 * - Returns: organization details with API key
 * 
 * GET /api/organizations/:id
 * - Get organization details by ID
 * - Requires: valid API key (admin or organization), organization ID (UUID)
 * - Returns: organization details
 * 
 * PUT /api/organizations/:id
 * - Update organization details
 * - Requires: valid API key (admin or organization), organization ID (UUID), name (optional)
 * - Returns: updated organization details
 * 
 * GET /api/organizations
 * - List all organizations (admin only)
 * - Requires: admin API key
 * - Returns: paginated list of organizations
 */

// Admin routes (require admin authentication)
router.post('/register', adminAuth, registerOrganization);
router.get('/', adminAuth, listOrganizations);

// Organization routes (require either admin or organization API key)
router.get('/:id', combinedAuth, getOrganization);
router.put('/:id', combinedAuth, updateOrganization);

export default router; 