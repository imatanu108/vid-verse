import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { reportContent } from "../controllers/report.controller.js";

const router = Router();
router.use(verifyJWT);

router.route("/:contentId").post(reportContent)


export default router