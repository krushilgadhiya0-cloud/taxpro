import express from 'express';
const router = express.Router();

router.get('/stats', (req, res) => {
  res.json({
    success: true,
    stats: {
      grossIncome: 128450,
      operatingExpenses: 42180,
      totalPayroll: 65200,
      attendancePercentage: 98.4,
      activeWorkforce: 142,
      activeProjects: 12,
      netProfitMargin: 67.1
    },
    cashFlowSeries: [
      { month: 'Jan', income: 70, expense: 30 },
      { month: 'Feb', income: 85, expense: 40 },
      { month: 'Mar', income: 60, expense: 25 },
      { month: 'Apr', income: 95, expense: 45 },
      { month: 'May', income: 110, expense: 50 },
      { month: 'Jun', income: 80, expense: 35 },
      { month: 'Jul', income: 125, expense: 42 }
    ],
    expenseBreakdown: {
      payroll: 45,
      servers: 25,
      travel: 20,
      software: 10
    }
  });
});

export default router;
