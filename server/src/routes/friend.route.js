import express from "express";
import friendController from "../controllers/friend.controller.js";
import protectRoute from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protectRoute);
router.get("/contacts", friendController.getContacts);
router.get("/search", friendController.searchUsers);
router.get("/requests", friendController.getIncomingRequests);
router.post("/requests/:userId", friendController.sendRequest);
router.patch("/requests/:requestId", friendController.respondToRequest);

export default router;
