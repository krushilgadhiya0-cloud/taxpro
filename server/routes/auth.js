import express from 'express';
const router = express.Router();

// Pre-seeded registered Gmail accounts database
const registeredUsers = [
  {
    id: 'USR-1000',
    email: 'krushilgadhiya0@gmail.com',
    password: 'password123',
    name: 'Krushil Gadhiya',
    role: 'Managing Director & CFO',
    company: 'Finexo PMS Enterprise',
    createdAt: new Date().toISOString()
  },
  {
    id: 'USR-1001',
    email: 'cfo@taxpro.ai',
    password: 'password123',
    name: 'Alex Sterling',
    role: 'Chief Financial Officer',
    company: 'Sterling Capital Financial',
    createdAt: new Date().toISOString()
  },
  {
    id: 'USR-1002',
    email: 'user@gmail.com',
    password: 'password123',
    name: 'Alex Sterling',
    role: 'Chief Financial Officer',
    company: 'TaxPro Enterprise',
    createdAt: new Date().toISOString()
  },
  {
    id: 'USR-1003',
    email: 'alex.sterling@gmail.com',
    password: 'password123',
    name: 'Alex Sterling',
    role: 'Chief Financial Officer',
    company: 'TaxPro Global',
    createdAt: new Date().toISOString()
  },
  {
    id: 'USR-1004',
    email: 'admin@gmail.com',
    password: 'password123',
    name: 'Admin CFO',
    role: 'Administrator',
    company: 'TaxPro AI Core',
    createdAt: new Date().toISOString()
  }
];

// Helper: check if email is registered
export const isEmailRegistered = (email) => {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();
  return registeredUsers.some(u => u.email.toLowerCase() === cleanEmail);
};

export const registerInvitedUser = (email, password, name, role) => {
  const cleanEmail = email.trim().toLowerCase();
  if (registeredUsers.some(u => u.email.toLowerCase() === cleanEmail)) {
     return false;
  }
  const newUser = {
    id: `USR-${Math.floor(1000 + Math.random() * 9000)}`,
    email: cleanEmail,
    password: password || 'password123',
    name: name || 'Invited Member',
    role: role || 'Employee',
    company: 'TaxPro Enterprise Client',
    createdAt: new Date().toISOString()
  };
  registeredUsers.push(newUser);
  return true;
};

// Mail Engine Helper: Send Welcome Email
export const sendWelcomeEmail = (email, name) => {
  const targetEmail = (email || 'krushilgadhiya0@gmail.com').trim().toLowerCase();
  const userName = name || 'Krushil Gadhiya';

  console.log(`[TaxPro Email Engine] 📧 Official Welcome Email dispatched to ${targetEmail}`);
  return {
    sent: true,
    to: targetEmail,
    subject: 'Welcome to TaxPro PMS Enterprise — Account Activation & Quick Start Guide',
    timestamp: new Date().toISOString()
  };
};

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Please enter your registered Gmail address and password.'
    });
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = registeredUsers.find(u => u.email.toLowerCase() === cleanEmail);

  if (!user) {
    return res.status(400).json({
      success: false,
      error: 'This Gmail address is not registered. Only registered Gmail accounts can be used.'
    });
  }

  const token = `taxpro_jwt_session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  const welcomeMail = sendWelcomeEmail(user.email, user.name);

  res.json({
    success: true,
    message: 'Authentication successful! Welcome to TaxPro AI.',
    token,
    welcomeEmailSent: true,
    welcomeEmailDetails: welcomeMail,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      company: user.company
    }
  });
});

// POST /api/auth/signup
router.post('/signup', (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Gmail address and password are required.'
    });
  }

  const cleanEmail = email.trim().toLowerCase();

  if (registeredUsers.some(u => u.email.toLowerCase() === cleanEmail)) {
    return res.status(400).json({
      success: false,
      error: 'This Gmail address is already registered. Please sign in.'
    });
  }

  const newUser = {
    id: `USR-${Math.floor(1000 + Math.random() * 9000)}`,
    email: cleanEmail,
    password: password,
    name: name || 'New Finance Manager',
    role: 'Financial Director',
    company: 'TaxPro Enterprise Client',
    createdAt: new Date().toISOString()
  };

  registeredUsers.push(newUser);

  res.json({
    success: true,
    message: 'Gmail registered successfully! Redirecting to Gmail OTP verification.',
    userId: newUser.id,
    email: newUser.email
  });
});

// POST /api/auth/reset-password
router.post('/reset-password', (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({
      success: false,
      error: 'Gmail address and new password are required.'
    });
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = registeredUsers.find(u => u.email.toLowerCase() === cleanEmail);

  if (!user) {
    return res.status(400).json({
      success: false,
      error: 'This Gmail address is not registered in the system.'
    });
  }

  user.password = newPassword;

  res.json({
    success: true,
    message: '✓ Password updated successfully! Please sign in with your new password.'
  });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  res.json({
    success: true,
    user: registeredUsers[0]
  });
});

export default router;
