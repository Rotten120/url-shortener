import express from "express"
import { prisma } from "../lib/prismaClient.js"
import {
  identityMiddleware,
  requireAuth,
  shortCodeExist,
  requireCodeOwner
} from "../middleware/identityMiddleware.js"

const router = express.Router();

router.use(
  identityMiddleware,
  requireAuth,
  shortCodeExist,
  requireCodeOwner
);

router.get("/:shortCode/clicks/all", async (req, res) => {
  const dates = await prisma.click.findMany({
    where: { urlId: req.urlId },
    select: { createdAt: true }
  });

  const count = await prisma.clicks.count({
    where: { urlId: req.urlId }
  });

  return res.send({ dates, clickClount: count });
});

router.get("/:shortCode/clicks", async (req, res) => {
const mins = Number(req.query ?. interval ?? 10);

  const dates = await prisma.$queryRaw`
    SELECT
      DATE_TRUNC('hour', "createdAt") +
      INTERVAL '${mins} min' * FLOOR(EXTRACT(MINUTE FROM "createdAt") / ${mins}) AS bucket,
      COUNT(*) as clicks
    FROM "clicks"
    WHERE "urlId" = ${req.urlId}
    GROUP BY bucket
    ORDER BY bucket ASC
  `;

  const count = await prisma.clicks.count({
    where: { urlId: req.urlId }
  });

  return res.send({ dates, clickCount: count });
});

export default router;
