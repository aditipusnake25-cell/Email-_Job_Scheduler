import { Router, Response } from "express";
import { SearchService } from "../services/search.service.js";
import { optionalAuth, AuthenticatedRequest } from "../middleware/authenticate.js";

const router = Router();

router.get("/", optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const queryText = (req.query.q as string) || (req.query.query as string) || "";
  const status = (req.query.status as string) || undefined;
  const senderEmail = (req.query.sender as string) || undefined;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;

  const result = await SearchService.searchEmails({
    query: queryText,
    status,
    senderEmail,
    page,
    limit,
    userId: req.user?.id,
  });

  res.json({
    success: true,
    ...result,
  });
});

router.post("/rebuild", optionalAuth, async (_req, res: Response) => {
  const result = await SearchService.rebuildIndex();
  res.json({
    success: true,
    message: "Search index rebuilt from PostgreSQL database",
    indexedCount: result.indexedCount,
  });
});

export default router;
