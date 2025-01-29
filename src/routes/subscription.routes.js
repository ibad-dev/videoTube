import { Router } from "express";
import {
  getUserSubscriptions ,
  getUserChannelSubscribers,
  toggleSubscription,
} from "../controllers/subscription.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/c/:subscriberId").post(toggleSubscription);
router.route("/c/:channelId").get(getUserSubscriptions);
router.route("/u/:channelId").get(getUserChannelSubscribers);

export default router;
