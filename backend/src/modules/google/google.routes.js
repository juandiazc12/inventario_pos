const express = require('express');
const router = express.Router();
const ctrl = require('./google.controller');
const authMiddleware = require('../../middleware/auth.middleware');

// Rutas públicas (el callback recibe el código de Google y no tiene token JWT)
router.get('/callback', ctrl.handleCallback);

// Rutas protegidas
router.use(authMiddleware);

router.get('/auth-url', ctrl.getAuthUrl);
router.get('/check', ctrl.checkConnection);
router.post('/disconnect', ctrl.disconnect);
router.get('/drive/files', ctrl.listDriveFiles);
router.get('/drive/files/:fileId', ctrl.getDriveFileInfo);
router.get('/sheets', ctrl.listSheets);
router.get('/sheets/:spreadsheetId/data', ctrl.getSheetData);
router.get('/emails', ctrl.listEmails);
router.get('/emails/:messageId', ctrl.getEmailDetail);
router.get('/credentials', ctrl.getCredentials);
router.post('/credentials', ctrl.saveCredentials);

module.exports = router;
