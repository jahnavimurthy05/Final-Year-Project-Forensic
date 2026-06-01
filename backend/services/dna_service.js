const SNP_MARKERS = [
  { marker: "rs12913832", alleles: ["AA", "AG", "GG"] },
  { marker: "rs1800407", alleles: ["CC", "CG", "GG"] },
  { marker: "rs16891982", alleles: ["CC", "CG", "GG"] },
  { marker: "rs12896399", alleles: ["TT", "TC", "CC"] },
];

const TRAIT_OPTIONS = {
  hairColor: ["Black", "Brown", "Blonde", "Red"],
  eyeColor: ["Brown", "Blue", "Green", "Hazel"],
  faceShape: ["Oval", "Round", "Square", "Heart"],
  cheekbone: ["Low", "Medium", "High"],
  skinTone: ["Fair", "Medium", "Olive", "Brown", "Dark"],
};

export async function generateSyntheticProfile() {
  try {
    const profile = await generateWithGemini();
    if (profile?.snpMarkers && profile?.traits) {
      return profile;
    }

    throw new Error("Gemini returned an incomplete profile.");
  } catch (error) {
    console.error(`Gemini API failed or was rate limited, falling back to random: ${error.message}`);
    return generateFallbackProfile();
  }
}

async function generateWithGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const prompt = `
Generate a JSON object representing a synthetic forensic DNA profile.
It should include:
1. "snpMarkers": An array of 4 objects with "marker" (e.g. rs12913832) and "allele" (e.g. AG).
2. "traits": An object containing predicted "hairColor" (Black, Brown, Blonde, Red), "eyeColor" (Brown, Blue, Green, Hazel), "faceShape" (Oval, Round, Square, Heart), "cheekbone" (Low, Medium, High), and "skinTone" (Fair, Medium, Olive, Brown, Dark).
Return ONLY valid JSON.
`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        response_mime_type: "application/json",
      },
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Gemini request failed with status ${response.status}`);
  }

  const payload = await response.json();
  let text = payload.candidates?.[0]?.content?.parts?.[0]?.text || "";
  text = text.trim();

  if (text.startsWith("```json")) {
    text = text.slice(7);
  }
  if (text.endsWith("```")) {
    text = text.slice(0, -3);
  }

  return JSON.parse(text);
}

function generateFallbackProfile() {
  return {
    snpMarkers: SNP_MARKERS.map(({ marker, alleles }) => ({
      marker,
      allele: choice(alleles),
    })),
    traits: {
      hairColor: choice(TRAIT_OPTIONS.hairColor),
      eyeColor: choice(TRAIT_OPTIONS.eyeColor),
      faceShape: choice(TRAIT_OPTIONS.faceShape),
      cheekbone: choice(TRAIT_OPTIONS.cheekbone),
      skinTone: choice(TRAIT_OPTIONS.skinTone),
    },
  };
}

function choice(values) {
  return values[Math.floor(Math.random() * values.length)];
}
