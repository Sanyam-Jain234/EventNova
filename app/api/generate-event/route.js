import { NextResponse } from "next/server";
import { State, City } from "country-state-city";

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

function parseDateFromText(text) {
  if (!text) return null;

  // YYYY-MM-DD
  const isoMatch =
    /\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/.exec(
      text
    );

  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month =
      Number(isoMatch[2]) - 1;
    const day = Number(isoMatch[3]);

    return formatDate(
      new Date(year, month, day)
    );
  }

  // 15 October 2026
  // 15 Oct 2026
  const dayMonthMatch =
    /\b(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(20\d{2})\b/i.exec(
      text
    );

  if (dayMonthMatch) {
    const day = Number(
      dayMonthMatch[1]
    );

    const month =
      MONTHS[
        dayMonthMatch[2].toLowerCase()
      ];

    const year = Number(
      dayMonthMatch[3]
    );

    if (month !== undefined) {
      return formatDate(
        new Date(
          year,
          month,
          day
        )
      );
    }
  }

  // October 15, 2026
  // October 15 2026
  const monthDayMatch =
    /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}),?\s+(20\d{2})\b/i.exec(
      text
    );

  if (monthDayMatch) {
    const month =
      MONTHS[
        monthDayMatch[1].toLowerCase()
      ];

    const day = Number(
      monthDayMatch[2]
    );

    const year = Number(
      monthDayMatch[3]
    );

    if (month !== undefined) {
      return formatDate(
        new Date(
          year,
          month,
          day
        )
      );
    }
  }

  return null;
}

function formatDate(date) {
  if (
    !(date instanceof Date) ||
    Number.isNaN(date.getTime())
  ) {
    return null;
  }

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function parseTime(text, pattern) {
  const match = pattern.exec(text);

  if (!match) return "";

  let hour = Number(match[1]);
  const minute = Number(
    match[2] || "00"
  );

  const meridiem =
    match[3]?.toUpperCase();

  if (meridiem === "PM" && hour !== 12) {
    hour += 12;
  }

  if (meridiem === "AM" && hour === 12) {
    hour = 0;
  }

  if (
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return "";
  }

  return `${String(hour).padStart(
    2,
    "0"
  )}:${String(minute).padStart(
    2,
    "0"
  )}`;
}

function extractTimes(text) {
  // 10 AM to 2 PM
  // 10:30 AM to 2:30 PM
  const range =
    /(?:from\s+)?(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\s*(?:to|-|–|—)\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i.exec(
      text
    );

  if (range) {
    const start = parseTime(
      range[0],
      /(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i
    );

    const end = parseTime(
      range[0].slice(
        range[0].lastIndexOf(
          range[6]
        ) -
          5
      ),
      /(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i
    );

    // Simpler and safer extraction from captures
    let startHour = Number(range[1]);
    let startMinute = Number(
      range[2] || "00"
    );

    let endHour = Number(range[4]);
    let endMinute = Number(
      range[5] || "00"
    );

    if (
      range[3].toUpperCase() ===
        "PM" &&
      startHour !== 12
    ) {
      startHour += 12;
    }

    if (
      range[3].toUpperCase() ===
        "AM" &&
      startHour === 12
    ) {
      startHour = 0;
    }

    if (
      range[6].toUpperCase() ===
        "PM" &&
      endHour !== 12
    ) {
      endHour += 12;
    }

    if (
      range[6].toUpperCase() ===
        "AM" &&
      endHour === 12
    ) {
      endHour = 0;
    }

    return {
      startTime: `${String(
        startHour
      ).padStart(2, "0")}:${String(
        startMinute
      ).padStart(2, "0")}`,

      endTime: `${String(
        endHour
      ).padStart(2, "0")}:${String(
        endMinute
      ).padStart(2, "0")}`,
    };
  }

  return {
    startTime: "",
    endTime: "",
  };
}

function extractCapacity(text) {
  const patterns = [
    /capacity\s*(?:of|:)?\s*(\d+)/i,
    /(\d+)\s*(?:people|attendees|participants|seats)\b/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);

    if (match) {
      return Math.max(
        1,
        Number(match[1])
      );
    }
  }

  return 50;
}

function extractTicket(text) {
  const lower = text.toLowerCase();

  const priceMatch =
    /(?:₹|rs\.?|inr)\s*([\d,]+)/i.exec(
      text
    );

  const explicitPaid =
    /\b(paid|ticketed|ticket price|tickets start|entry fee)\b/i.test(
      lower
    );

  const explicitFree =
    /\b(free entry|free event|free admission|no charge)\b/i.test(
      lower
    );

  if (explicitPaid || priceMatch) {
    return {
      type: "paid",
      price: priceMatch
        ? Number(
            priceMatch[1].replace(
              /,/g,
              ""
            )
          )
        : null,
    };
  }

  if (explicitFree) {
    return {
      type: "free",
      price: null,
    };
  }

  return {
    type: "free",
    price: null,
  };
}

function extractTitle(text) {
  const patterns = [
    /(?:called|named|titled)\s+["“]?([^"”.,]+)["”]?/i,
    /event\s*(?:name|title)\s*(?:is|:)\s*["“]?([^"”.,]+)["”]?/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(
      text
    );

    if (match?.[1]) {
      const title =
        match[1].trim();

      if (title.length >= 5) {
        return title;
      }
    }
  }

  return "";
}

function extractLocation(text) {
  const states =
    State.getStatesOfCountry("IN");

  const lowerText =
    text.toLowerCase();

  const matchedState =
    states.find((state) =>
      lowerText.includes(
        state.name.toLowerCase()
      )
    );

  if (!matchedState) {
    return {
      city: "",
      state: "",
      address: "",
    };
  }

  const stateName =
    matchedState.name;

  // Find a city from the detected state.
  const cities =
    City.getCitiesOfState(
      "IN",
      matchedState.isoCode
    );

  const matchedCities =
    cities
      .filter((city) =>
        lowerText.includes(
          city.name.toLowerCase()
        )
      )
      .sort(
        (a, b) =>
          b.name.length -
          a.name.length
      );

  const city =
    matchedCities[0]?.name || "";

  // Try to extract a venue/address after "at".
  let address = "";

  const atMatch =
    /\bat\s+(.+?)(?=,\s*(?:[A-Za-z .'-]+),\s*[A-Za-z .'-]+(?:\.|$)|\s+(?:capacity|for|from|on|starting|with)\b|$)/i.exec(
      text
    );

  if (atMatch?.[1]) {
    const possibleVenue =
      atMatch[1].trim();

    if (
      possibleVenue.length >= 3 &&
      possibleVenue.length <= 120
    ) {
      address =
        possibleVenue;
    }
  }

  return {
    city,
    state: stateName,
    address,
  };
}

function extractLocationType(text) {
  return /\b(online|virtual|webinar|zoom)\b/i.test(
    text
  )
    ? "online"
    : "physical";
}

export async function POST(req) {
  try {
    const { prompt } =
      await req.json();

    if (!prompt?.trim()) {
      return NextResponse.json(
        {
          error:
            "Please enter your event details.",
        },
        { status: 400 }
      );
    }

    const userText =
      prompt.trim();

    // -----------------------------------------
    // 1. Deterministic extraction
    // -----------------------------------------

    const explicitTitle =
      extractTitle(
        userText
      );

    const parsedDate =
      parseDateFromText(
        userText
      );

    const times =
      extractTimes(
        userText
      );

    const location =
      extractLocation(
        userText
      );

    const capacity =
      extractCapacity(
        userText
      );

    const ticket =
      extractTicket(
        userText
      );

    const locationType =
      extractLocationType(
        userText
      );

    // -----------------------------------------
    // 2. VERY SMALL QWEN TASK
    // -----------------------------------------

    const aiPrompt = `
Create only the title, short description, and category
for this EventNova event.

Return ONLY JSON:

{
  "title": "",
  "description": "",
  "category": "tech"
}

Category must be one of:
tech, music, sports, art, food, business, health,
education, gaming, networking, outdoor, community.

Do not invent specific facts.

User event:
${userText}
`;

    let aiData = null;

    try {
      const response =
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
                aiPrompt,
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

      if (response.ok) {
        const result =
          await response.json();

        if (result.response) {
          aiData =
            extractJson(
              result.response
            );
        }
      }
    } catch (error) {
      console.warn(
        "Qwen title/description/category extraction failed:",
        error.message
      );
    }

    // -----------------------------------------
    // 3. FALLBACKS
    // -----------------------------------------

    const title =
      explicitTitle ||
      (
        typeof aiData?.title ===
        "string"
          ? aiData.title.trim()
          : ""
      ) ||
      "New Event";

    const description =
      (
        typeof aiData?.description ===
        "string"
          ? aiData.description.trim()
          : ""
      ) ||
      userText;

    const category =
      (
        typeof aiData?.category ===
        "string"
          ? aiData.category
              .trim()
              .toLowerCase()
          : ""
      ) || "community";

    // -----------------------------------------
    // 4. COMPLETE RESPONSE
    // -----------------------------------------

    return NextResponse.json({
      title,

      description,

      category,

      startDate:
        parsedDate,

      endDate:
        parsedDate,

      startTime:
        times.startTime,

      endTime:
        times.endTime,

      locationType,

      venue: "",

      address:
        location.address,

      city:
        location.city,

      state:
        location.state,

      suggestedCapacity:
        capacity,

      suggestedTicketType:
        ticket.type,

      ticketPrice:
        ticket.price,
    });
  } catch (error) {
    console.error(
      "Event generation error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          "Failed to generate event.",
      },
      { status: 500 }
    );
  }
}