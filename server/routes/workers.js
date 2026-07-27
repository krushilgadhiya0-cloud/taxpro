import express from 'express';
const router = express.Router();

const workers = [
  {
    id: 'EMP-101',
    name: 'Dr. Sarah Jenkins',
    role: 'Principal AI Architect',
    dept: 'Engineering',
    salary: '$14,500/mo',
    attendance: '99.2%',
    tasksCompleted: 42,
    status: 'Online',
    online: true,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
    rating: 5.0
  },
  {
    id: 'EMP-102',
    name: 'Marcus Vance',
    role: 'Senior Fintech Strategist',
    dept: 'Finance',
    salary: '$12,800/mo',
    attendance: '98.5%',
    tasksCompleted: 38,
    status: 'In Shift',
    online: true,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
    rating: 4.9
  },
  {
    id: 'EMP-103',
    name: 'Elena Rostova',
    role: 'Head of Risk & Compliance',
    dept: 'Security',
    salary: '$13,200/mo',
    attendance: '100%',
    tasksCompleted: 51,
    status: 'Online',
    online: true,
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=250&q=80',
    rating: 5.0
  },
  {
    id: 'EMP-104',
    name: 'David Chen',
    role: 'Lead UX Engineer',
    dept: 'Design',
    salary: '$11,500/mo',
    attendance: '96.8%',
    tasksCompleted: 29,
    status: 'On Leave',
    online: false,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80',
    rating: 4.8
  },
  {
    id: 'EMP-105',
    name: 'Amara Okafor',
    role: 'DevOps & Cloud Systems',
    dept: 'Engineering',
    salary: '$12,000/mo',
    attendance: '98.9%',
    tasksCompleted: 45,
    status: 'Online',
    online: true,
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=250&q=80',
    rating: 4.9
  },
  {
    id: 'EMP-106',
    name: 'Lucas Thorne',
    role: 'Financial Operations Lead',
    dept: 'Finance',
    salary: '$10,800/mo',
    attendance: '97.4%',
    tasksCompleted: 33,
    status: 'In Shift',
    online: true,
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=250&q=80',
    rating: 4.7
  },
];

router.get('/', (req, res) => {
  res.json({ success: true, count: workers.length, workers });
});

router.post('/pay', (req, res) => {
  const { workerId, name, salary } = req.body;
  res.json({
    success: true,
    message: `Salary payout of ${salary} dispatched to ${name} (${workerId})`,
    timestamp: new Date().toISOString()
  });
});

export default router;
