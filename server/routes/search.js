const express = require('express');
const router = express.Router();
const { search, getProviders, getProvidersHealth, resolve } = require('../controllers/searchController');

// Provider health & discovery status
router.get('/providers/health', getProvidersHealth);
router.get('/providers', getProviders);

// On-demand playback resolution
router.get('/resolve', resolve);

// Unified multi-source music search
router.get('/', search);

module.exports = router;
