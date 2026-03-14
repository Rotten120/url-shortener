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


/*
 * GET url/:shortCode/clicks/all
 * Description: Fetches all clicks on the shortened link
 * Middleare: identityMiddleware, requireAuth, shortCodeExist, requireCodeOwner
 *
 * Path Params:
 *   shortCode (string) - code of the corresponding url
 *
 * Success Response:
 *   200 OK
 *   {
 *     dates: { createdAt: date-string }
 *     clickCount: number
 *   }
 * 
 * Error:
 *   500 server error
 */
router.get("/:shortCode/clicks/all", async (req, res) => {
  try {
    const dates = await prisma.click.findMany({
      where: { urlId: req.urlId },
      select: { createdAt: true }
    });

    const count = await prisma.clicks.count({
      where: { urlId: req.urlId }
    });

    return res.send({ dates, clickClount: count });
  
  } catch(error) {
    console.log(error);
    res.status(500).json({ message: "Error has been found" });
  }
});

/*
 * GET url/:shortCode/clicks
 * Description: Fetches clicks and are sorted by time interval
 * Middleware: identityMiddleware, requireAuth, shortCodeExist, requireCodeOwner 
 *
 * Path Params: 
 *   shortCode (string) - code of corresponding url
 *
 * Query Params:
 *   interval (string) - group urls by n minutes (max is 60 minutes)
 *
 * Success Response:
 *   200
 *   {
 *     dates: [{
 *       bucket: string
 *       clicks: int
 *     }, ...]
 *     clickCount: int
 *   }
 *
 * Error:
 *   500 server error
 */
router.get("/:shortCode/clicks", async (req, res) => {
  const mins = Number(req.query ?. interval ?? 10);

  try {
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

  } catch(error) {
    console.log(error);
    res.status(500).json({ message: "Error has been found" });
  }
});

export default router;
