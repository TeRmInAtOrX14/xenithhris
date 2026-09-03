const express = require('express');
const router = express.Router();
const vaultController = require('../controllers/credentialVault');
const { requireAuth } = require('../middlewares/auth');

// All vault routes require auth; controller handles RBAC internally
router.get('/', requireAuth, vaultController.getVaultEntries);
router.post('/', requireAuth, vaultController.createVaultEntry);
router.put('/:id', requireAuth, vaultController.updateVaultEntry);
router.delete('/:id', requireAuth, vaultController.deleteVaultEntry);

module.exports = router;
