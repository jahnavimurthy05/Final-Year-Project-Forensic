import express from "express";

const router = express.Router();

function formatTimestamp(value) {
  if (!value) {
    return "Unknown";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

router.get("/stats", async (req, res) => {
  const db = req.app.locals.db;
  if (!db) {
    return res.status(500).json({ error: "Database not connected" });
  }

  try {
    const generations = db.collection("generations");
    const totalGenerations = await generations.countDocuments({});
    const savedProfiles = totalGenerations;

    const result = await generations
      .aggregate([{ $group: { _id: null, avg_confidence: { $avg: "$confidence_score" } } }])
      .toArray();
    const accuracyScore = result.length ? Number(result[0].avg_confidence.toFixed(1)) : 0.0;

    const recentDocs = await generations.find({}).sort({ timestamp: -1 }).limit(10).toArray();
    const recent = recentDocs.map((gen) => ({
      timestamp: formatTimestamp(gen.timestamp),
      hairColor: gen.traits?.hairColor || "",
      eyeColor: gen.traits?.eyeColor || "",
      cheekbone: gen.traits?.cheekbone || "",
      status: (gen.confidence_score || 0) > 85 ? "Success" : "Warning (Low Conf)",
    }));

    return res.status(200).json({
      totalGenerations,
      savedProfiles,
      accuracyScore,
      recent,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
