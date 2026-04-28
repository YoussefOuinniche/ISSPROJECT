const express = require('express');
const {
  getJobs,
  getJobById,
  getTrending,
  analyzeJobs,
  getMarketTrends,
  getDemandHistory,
  getJobInfo,
} = require('../controllers/jobs.controller');

const router = express.Router();

router.get('/jobs',                    getJobs);
router.get('/jobs/:id',                getJobById);
router.get('/trending',                getTrending);
router.post('/analyze',                analyzeJobs);
router.get('/market-trends',           getMarketTrends);
router.get('/demand-history/:slug',    getDemandHistory);
router.get('/job-info/:slug',          getJobInfo);

module.exports = router;
