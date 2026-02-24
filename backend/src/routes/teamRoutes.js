import express from "express";
import { createTeam, joinTeam, getMyTeams } from "../controllers/teamController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(authorize("Participant"));

router.post("/create", createTeam);
router.post("/join", joinTeam);
router.get("/my-teams", getMyTeams);

export default router;
