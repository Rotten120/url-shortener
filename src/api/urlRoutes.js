import express from "express"
import validator from "validator"
import { prisma } from "../lib/prismaClient.js"
import { nanoid } from "nanoid"
import {
  identityMiddleware,
  requireOwner
} from "../middleware/identityMiddleware.js"

const router = express.Router();

router.use(
  identityMiddleware,
  requireOwner
);

/*
 * GET /urls
 * Description: Fetches the user's url list
 * Middleware: identityMiddleware, requireOwner
 *
 * Success Response:
 *   200 OK
 *   {
 *     urls: [{
 *       shortCode: string
 *       origUrl: string
 *     }, ...]
 *     urlCount: Number
 *   }
 *    
 * Error:
 *   500 server error
 *
 */
router.get("/urls", async (req, res) => {
  try {
    const urls = await prisma.url.findMany({
      where: { ownerId: req.ownerId },
      select: {
        shortCode: true,
        origUrl: true
      }
    });

    const urlCount = urls.length;

    res.json({ urls, urlCount });
  } catch(error) {

    console.log("Error: ", error);
    res.status(500).json({ message: "An error occurred, process was terminated" });
  }
});

/*
 * POST /shorten
 * Description: Shortens the url
 * Middleware: identityMiddleware, requireOwner
 *
 * Body Params:
 *   url (string-url) - the url to shorten
 *
 * Success Response:
 *   201 successful link shortened
 *
 * Error:
 *   400 invalid url format
 *   409 maximum owned urls reached
 *   500 server error
 *
 * Note:
 *   Consider race condition by using 'for update' and $transaction
 */
router.post("/shorten", async (req, res) => {
  const origUrl = req.body.url;
  let shortCode = "";

  try {
    if(!validator.isURL(origUrl)) {
      return res.status(400).json({ message: "The input is not an URL. Try another" })
    }

    let urlCount = await prisma.url.count({
      where: { ownerId: req.ownerId }
    });

    if(urlCount >= 5) {
      return res.status(409).json({
        message: "Maximum number of URLs reached",
        limit: 5,
        urlCount
      });
    }

    shortCode = nanoid(10);
    await prisma.url.create({
      data: { origUrl, shortCode, ownerId: req.ownerId }
    });
    urlCount += 1;
    
    res.status(201).json({ message: "Link was successfully shortened", shortCode, urlCount });
  } catch(error) {
    console.log("Error: ", error);
    res.status(500).json({ message: "An error occurred, process was terminated" });
  }
});

/*
 * DELETE /:shortCode
 * Description: Deletes shortCode and analytics if there is one
 * Middleware: identityMiddleware, requireOwner
 *
 * Body Params:
 *   shortCode (string) - code corresponding to url
 *
 * Success Response:
 *   204 deleted successfully
 *
 * Error:
 *   404 link does not exist
 *   500 server error
 *
 * Note:
 *   Consider cascading with clicks if auth-based
 */
router.delete("/:shortCode", async (req, res) => {
  const shortCode = req.params.shortCode;

  try {
    const result = await prisma.url.deleteMany({
      where: { shortCode, ownerId: req.ownerId }
    });

    if(result.count === 0) {
      return res.status(404).json({ message: "Link does not exist" });
    }
    
    return res.sendStatus(204);

  } catch(error) {
    console.log("Error: ", error);
    res.status(500).json({ message: "An error occurred, process was terminated" });
  }
});

export default router;
