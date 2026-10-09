import { NextResponse } from "next/server";

const TAVILY_URL =
  "https://api.tavily.com/search";

const OLLAMA_URL =
  "http://127.0.0.1:11434/api/generate";

const OLLAMA_MODEL = "qwen3:4b";

const MONTHS = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

function extractDates(text = "") {
  let cleaned = String(text);

  // Normalize common broken dash/encoding characters.
  cleaned = cleaned
    .replace(/[–—−]/g, "-")
    .replace(/â€“|â€”|â|â/g, "-");

  const dates = [];

  // YYYY-MM-DD
  const isoRegex =
    /\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/g;

  for (const match of cleaned.matchAll(isoRegex)) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);

    dates.push(
      new Date(year, month, day)
    );
  }

  // November 15, 2026
  // November 15-18, 2026
  const monthDayYearRegex =
    /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:\s*-\s*(\d{1,2}))?,?\s+(20\d{2})\b/gi;

  for (const match of cleaned.matchAll(
    monthDayYearRegex
  )) {
    const month =
      MONTHS[match[1].toLowerCase()];

    const startDay = Number(match[2]);
    const endDay = match[3]
      ? Number(match[3])
      : startDay;

    const year = Number(match[4]);

    if (month !== undefined) {
      dates.push(
        new Date(year, month, startDay)
      );

      if (endDay !== startDay) {
        dates.push(
          new Date(year, month, endDay)
        );
      }
    }
  }

  // 15 November 2026
  // 15-18 November 2026
  const dayMonthYearRegex =
    /\b(\d{1,2})(?:\s*-\s*(\d{1,2}))?\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(20\d{2})\b/gi;

  for (const match of cleaned.matchAll(
    dayMonthYearRegex
  )) {
    const startDay = Number(match[1]);

    const endDay = match[2]
      ? Number(match[2])
      : startDay;

    const month =
      MONTHS[match[3].toLowerCase()];

    const year = Number(match[4]);

    if (month !== undefined) {
      dates.push(
        new Date(year, month, startDay)
      );

      if (endDay !== startDay) {
        dates.push(
          new Date(year, month, endDay)
        );
      }
    }
  }

  return dates;
}

function hasUpcomingDate(text, today) {
  const dates = extractDates(text);

  // If the result contains no recognizable date,
  // do not automatically reject it.
  if (dates.length === 0) {
    return true;
  }

  return dates.some(
    (date) => date >= today
  );
}

function extractJson(text) {
  const cleaned = String(text)
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (
      start !== -1 &&
      end !== -1 &&
      end > start
    ) {
      return JSON.parse(
        cleaned.slice(start, end + 1)
      );
    }

    throw new Error(
      "AI returned invalid JSON"
    );
  }
}

function isBlockedSource(url) {
  try {
    const hostname = new URL(url)
      .hostname
      .toLowerCase()
      .replace(/^www\./, "");

    const blockedDomains = [
      "youtube.com",
      "youtu.be",
      "instagram.com",
      "facebook.com",
      "m.facebook.com",
      "tiktok.com",
      "x.com",
      "twitter.com",
      "telegram.me",
      "t.me",
    ];

    return blockedDomains.some(
      (domain) =>
        hostname === domain ||
        hostname.endsWith(`.${domain}`)
    );
  } catch {
    return true;
  }
}

export async function POST(req) {
  try {
    const {
      category,
      city,
      state,
    } = await req.json();

    if (!category) {
      return NextResponse.json(
        {
          error:
            "Category is required",
        },
        { status: 400 }
      );
    }

    if (!city) {
      return NextResponse.json(
        {
          error:
            "City is required",
        },
        { status: 400 }
      );
    }

    if (!state) {
      return NextResponse.json(
        {
          error:
            "State is required",
        },
        { status: 400 }
      );
    }

    const todayString =
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());

    const today = new Date(
      `${todayString}T00:00:00+05:30`
    );

    const location = [
      city,
      state,
      "India",
    ]
      .filter(Boolean)
      .join(", ");

    const query =
      `upcoming ${category} events ` +
      `in ${location} after ${todayString}`;

    // --------------------------------------------------
    // 1. TAVILY LIVE SEARCH
    // --------------------------------------------------

    const tavilyResponse = await fetch(
      TAVILY_URL,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          Authorization:
            `Bearer ${process.env.TAVILY_API_KEY}`,
        },
        body: JSON.stringify({
          query,
          search_depth: "basic",
          topic: "general",
          max_results: 10,
          include_answer: false,
          include_raw_content: false,
          include_images: false,
        }),
      }
    );

    const tavilyData =
      await tavilyResponse.json();

    if (!tavilyResponse.ok) {
      console.error(
        "Tavily error:",
        tavilyData
      );

      return NextResponse.json(
        {
          error:
            tavilyData?.detail ||
            "Tavily search failed",
        },
        {
          status:
            tavilyResponse.status,
        }
      );
    }

    const tavilyResults =
      (tavilyData.results || []).map(
        (result) => ({
          title: result.title || "",
          url: result.url || "",
          description:
            (result.content || "")
              .slice(0, 350),
          tavilyScore:
            typeof result.score ===
            "number"
              ? result.score
              : 0,
        })
      );

    // --------------------------------------------------
    // 2. REMOVE PAST + SOCIAL RESULTS
    // --------------------------------------------------

    const filteredResults =
      tavilyResults.filter(
        (result) => {
          const combinedText =
            `${result.title} ${result.description}`;

          const upcoming =
            hasUpcomingDate(
              combinedText,
              today
            );

          const blockedSource =
            isBlockedSource(
              result.url
            );

          return (
            upcoming &&
            !blockedSource
          );
        }
      );

    if (filteredResults.length === 0) {
      return NextResponse.json({
        query,
        events: [],
      });
    }

    // --------------------------------------------------
    // 3. COMPACT DATA FOR QWEN
    // --------------------------------------------------

    const compactResults =
      filteredResults.map(
        (event, index) => ({
          index,
          title: event.title,
          description:
            event.description.slice(
              0,
              180
            ),
          url: event.url,
        })
      );

    const systemPrompt = `
You are EventNova's event relevance ranking AI.

Today's date:
${todayString}

Requested category:
${category}

Requested location:
${location}

Rank the supplied web search results according to
their relevance to the requested category and location.

IMPORTANT RULES:

- Do NOT create new events.
- Do NOT change titles.
- Do NOT change URLs.
- Do NOT create dates.
- Do NOT create locations.
- Do NOT rewrite descriptions.
- Only rank the supplied results.
- Prefer specific individual upcoming events.
- Prefer results clearly associated with the requested city/state.
- Prefer results containing a clear event name.
- Prefer genuine event pages over generic event directories.
- Generic "Events", "Upcoming Events", category,
  community or organization pages should receive lower
  scores unless they clearly contain a relevant upcoming event.
- Return every supplied index exactly once.
- Score each result from 0 to 100.

Return ONLY valid JSON:

{
  "rankedIndexes": [
    {
      "index": 0,
      "score": 95
    }
  ]
}

Search results:

${JSON.stringify(
  compactResults
)}
`;

    // --------------------------------------------------
    // 4. QWEN RANKING
    //    FALLBACK TO TAVILY IF QWEN IS SLOW/FAILS
    // --------------------------------------------------

    let rankedEvents = [];

    try {
      const ollamaResponse =
        await fetch(
          OLLAMA_URL,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              model:
                OLLAMA_MODEL,
              prompt:
                systemPrompt,
              stream: false,
              think: false,
              format: "json",
              keep_alive:
                "10m",
              options: {
                temperature: 0,
                num_predict: 120,
              },
            }),
            signal:
              AbortSignal.timeout(
                30000
              ),
          }
        );

      if (ollamaResponse.ok) {
        const ollamaData =
          await ollamaResponse.json();

        if (
          ollamaData.response
        ) {
          const rankedData =
            extractJson(
              ollamaData.response
            );

          if (
            Array.isArray(
              rankedData.rankedIndexes
            )
          ) {
            const scoreMap =
              new Map(
                rankedData.rankedIndexes.map(
                  (item) => [
                    Number(
                      item.index
                    ),
                    typeof item.score ===
                      "number"
                      ? Math.max(
                          0,
                          Math.min(
                            100,
                            item.score
                          )
                        )
                      : 0,
                  ]
                )
              );

            rankedEvents =
              filteredResults
                .map(
                  (
                    event,
                    index
                  ) => ({
                    ...event,
                    relevanceScore:
                      scoreMap.get(
                        index
                      ) ??
                      Math.round(
                        event.tavilyScore *
                          100
                      ),
                  })
                )
                .sort(
                  (a, b) =>
                    b.relevanceScore -
                    a.relevanceScore
                )
                .slice(0, 6);
          }
        }
      }
    } catch (error) {
      console.warn(
        "Qwen ranking unavailable. Using Tavily ranking instead:",
        error.message
      );
    }

    // --------------------------------------------------
    // 5. TAVILY FALLBACK
    // --------------------------------------------------

    if (rankedEvents.length === 0) {
      rankedEvents =
        [...filteredResults]
          .sort(
            (a, b) =>
              b.tavilyScore -
              a.tavilyScore
          )
          .slice(0, 6)
          .map((event) => ({
            ...event,
            relevanceScore:
              Math.round(
                event.tavilyScore *
                  100
              ),
          }));
    }

    // --------------------------------------------------
    // 6. FINAL RESPONSE
    // --------------------------------------------------

    return NextResponse.json({
      query,
      events: rankedEvents,
    });
  } catch (error) {
    console.error(
      "Event search error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          "Failed to search and process events",
      },
      { status: 500 }
    );
  }
}