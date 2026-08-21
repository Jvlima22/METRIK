import { Router } from "express";
import metricsRoutes from "./metrics.routes";
import authRoutes from "./auth.routes";
import adsIntelligenceRoutes from "./ads-intelligence.routes";
import adsDraftRoutes from "./ads-drafts.routes";
import integrationHubRoutes from "./integration-hub.routes";
import adsOAuthRoutes from './ads-oauth.routes';
import realAdsRoutes from './real-ads.routes';
import companiesRoutes from './companies.routes';
import companySignupRoutes from './company-signup.routes';
import companyOnboardingRoutes from './company-onboarding.routes';
import companyProfileRoutes from './company-profile.routes';
import billingRoutes from './billing.routes';

// As rotas de webhook/jobs carregam BullMQ e Redis no escopo do módulo.
// Na Vercel, o backend HTTP não deve inicializar uma conexão Redis local
// durante toda requisição, pois isso pode interromper rotas independentes,
// como convites e autenticação. Essas rotas continuam disponíveis no servidor
// persistente (Railway/local), onde o worker Redis é executado.
const webhookRoutes = require('./webhook.routes').default;
const jobsRoutes = process.env.VERCEL !== '1'
  ? require('./jobs.routes').default
  : null;

const router = Router();
router.use('/webhook', webhookRoutes);
if (jobsRoutes) router.use('/jobs', jobsRoutes);
router.use("/metrics", metricsRoutes);
router.use("/auth", authRoutes);
router.use("/ai", adsIntelligenceRoutes);
router.use("/ai", adsDraftRoutes);
router.use('/integrations/oauth', adsOAuthRoutes);
router.use("/integrations", integrationHubRoutes);
router.use('/integrations/ads', realAdsRoutes);
router.use('/companies', companiesRoutes);
router.use('/company-signup', companySignupRoutes);
router.use('/company-onboarding', companyOnboardingRoutes);
router.use('/company-profile', companyProfileRoutes);
router.use('/billing', billingRoutes);
export default router;
