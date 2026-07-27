import express from 'express';
const router = express.Router();

router.post('/scan', (req, res) => {
  const { mode } = req.body; // 'fingerprint' | 'qr' | 'face'

  setTimeout(() => {
    res.json({
      success: true,
      mode: mode || 'fingerprint',
      user: {
        name: 'Dr. Sarah Jenkins',
        employeeId: 'EMP-101',
        shift: 'Morning Shift A',
        location: 'HQ Quantum Gate 4',
        loggedAt: new Date().toLocaleTimeString()
      },
      biometricScore: 99.8,
      antiSpoofPassed: true
    });
  }, 1200);
});

export default router;
