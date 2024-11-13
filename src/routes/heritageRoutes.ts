import { Router } from 'express';
import { heritageController } from '../controllers/heritageController';

const router = Router();

router.get('/heritages', heritageController.getAllHeritages);
router.get('/heritages/:id', heritageController.getHeritageById);

export default router;