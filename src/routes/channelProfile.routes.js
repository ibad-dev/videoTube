import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { Router } from "express";
import { getChannelProfile } from "../controllers/channelProfile.controllers.js";
const router = Router();

router.use(verifyJWT);

router.route("/:userId").get(getChannelProfile);

export default router;
