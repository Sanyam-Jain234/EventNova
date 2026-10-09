/* eslint-disable react-hooks/incompatible-library */
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  useForm,
  Controller,
} from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";

import {
  State,
  City,
} from "country-state-city";

import {
  CalendarIcon,
  Loader2,
  Check,
} from "lucide-react";

import {
  useConvexMutation,
} from "@/hooks/use-convex-query";

import { api } from "@/convex/_generated/api";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Textarea,
} from "@/components/ui/textarea";

import {
  Label,
} from "@/components/ui/label";

import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

import {
  Calendar,
} from "@/components/ui/calendar";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import EventCoverUploader from "@/components/event-cover-uploader";
import AIEventCreator from "./_components/ai-event-creator";

import {
  CATEGORIES,
} from "@/lib/data";

// ==================================================
// VALIDATION
// ==================================================

const timeRegex =
  /^([01]\d|2[0-3]):([0-5]\d)$/;

const eventSchema = z.object({
  title: z
    .string()
    .min(
      5,
      "Title must be at least 5 characters"
    ),

  description: z
    .string()
    .min(
      20,
      "Description must be at least 20 characters"
    ),

  category: z
    .string()
    .min(
      1,
      "Please select a category"
    ),

  startDate: z.date({
    required_error:
      "Start date is required",
  }),

  endDate: z.date({
    required_error:
      "End date is required",
  }),

  startTime: z
    .string()
    .regex(
      timeRegex,
      "Start time must be HH:MM"
    ),

  endTime: z
    .string()
    .regex(
      timeRegex,
      "End time must be HH:MM"
    ),

  locationType:
    z.enum([
      "physical",
      "online",
    ]),

  venue: z
    .string()
    .url(
      "Venue must be a valid URL"
    )
    .optional()
    .or(z.literal("")),

  address: z
    .string()
    .optional(),

  city: z
    .string()
    .min(
      1,
      "City is required"
    ),

  state: z
    .string()
    .optional(),

  capacity: z
    .number()
    .min(
      1,
      "Capacity must be at least 1"
    ),

  ticketType:
    z.enum([
      "free",
      "paid",
    ]),

  ticketPrice:
    z.number()
      .optional(),

  coverImage:
    z.string()
      .optional(),

  themeColor:
    z.string()
      .default("#4F46E5"),
});

// ==================================================
// HELPERS
// ==================================================

function parseAIDate(value) {
  if (!value) return undefined;

  if (value instanceof Date) {
    return isNaN(
      value.getTime()
    )
      ? undefined
      : value;
  }

  const text =
    String(value).trim();

  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      text
    );

  if (!match) {
    return undefined;
  }

  const year =
    Number(match[1]);

  const month =
    Number(match[2]) - 1;

  const day =
    Number(match[3]);

  const date = new Date(
    year,
    month,
    day
  );

  if (
    date.getFullYear() !==
      year ||
    date.getMonth() !==
      month ||
    date.getDate() !==
      day
  ) {
    return undefined;
  }

  return date;
}

function normalizeTime(value) {
  if (!value) return "";

  const text =
    String(value)
      .trim()
      .toUpperCase();

  if (
    /^([01]\d|2[0-3]):[0-5]\d$/.test(
      text
    )
  ) {
    return text;
  }

  const match =
    /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i.exec(
      text
    );

  if (!match) return "";

  let hour =
    Number(match[1]);

  const minute =
    Number(match[2] || "00");

  if (
    hour < 1 ||
    hour > 12
  ) {
    return "";
  }

  if (
    match[3].toUpperCase() ===
    "PM"
  ) {
    if (hour !== 12) {
      hour += 12;
    }
  } else {
    if (hour === 12) {
      hour = 0;
    }
  }

  return `${String(
    hour
  ).padStart(2, "0")}:${String(
    minute
  ).padStart(2, "0")}`;
}

function isValidUrl(value) {
  if (!value) return false;

  try {
    const url =
      new URL(value);

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );
  } catch {
    return false;
  }
}

// ==================================================
// PAGE
// ==================================================

export default function CreateEventPage() {
  const router =
    useRouter();

  const {
    mutate: createEvent,
    isLoading,
  } = useConvexMutation(
    api.events.createEvent
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset,
    control,
    formState: { errors },
  } = useForm({
    resolver:
      zodResolver(
        eventSchema
      ),

    defaultValues: {
      locationType:
        "physical",

      ticketType:
        "free",

      capacity: 50,

      themeColor:
        "#4F46E5",

      category: "",

      state: "",

      city: "",

      startTime: "",

      endTime: "",

      venue: "",

      address: "",

      ticketPrice:
        undefined,

      coverImage: "",
    },
  });

  const themeColor =
    watch("themeColor");

  const ticketType =
    watch("ticketType");

  const locationType =
    watch("locationType");

  const selectedState =
    watch("state");

  const startDate =
    watch("startDate");

  const endDate =
    watch("endDate");

  const coverImage =
    watch("coverImage");

  // ==================================================
  // INDIAN STATES / CITIES
  // ==================================================

  const indianStates =
    useMemo(
      () =>
        State.getStatesOfCountry(
          "IN"
        ),
      []
    );

  const cities =
    useMemo(() => {
      if (!selectedState) {
        return [];
      }

      const stateData =
        indianStates.find(
          (state) =>
            state.name ===
            selectedState
        );

      if (!stateData) {
        return [];
      }

      return City.getCitiesOfState(
        "IN",
        stateData.isoCode
      );
    }, [
      selectedState,
      indianStates,
    ]);

// ==================================================
// THEME COLORS
// ==================================================

const colorPresets = [
  {
    name: "Royal",
    color: "#4F46E5",
    accent: "#7C3AED",
  },
  {
    name: "Violet",
    color: "#7C3AED",
    accent: "#A855F7",
  },
  {
    name: "Neon",
    color: "#9333EA",
    accent: "#EC4899",
  },
  {
    name: "Ruby",
    color: "#E11D48",
    accent: "#FB7185",
  },
  {
    name: "Rose",
    color: "#DB2777",
    accent: "#F472B6",
  },
  {
    name: "Sunset",
    color: "#EA580C",
    accent: "#F97316",
  },
  {
    name: "Amber",
    color: "#D97706",
    accent: "#F59E0B",
  },
  {
    name: "Emerald",
    color: "#059669",
    accent: "#10B981",
  },
  {
    name: "Teal",
    color: "#0D9488",
    accent: "#14B8A6",
  },
  {
    name: "Ocean",
    color: "#0891B2",
    accent: "#06B6D4",
  },
  {
    name: "Sky",
    color: "#0284C7",
    accent: "#38BDF8",
  },
  {
    name: "Blue",
    color: "#2563EB",
    accent: "#3B82F6",
  },
  {
    name: "Indigo",
    color: "#4338CA",
    accent: "#6366F1",
  },
  {
    name: "Midnight",
    color: "#1E293B",
    accent: "#334155",
  },
  {
    name: "Slate",
    color: "#334155",
    accent: "#64748B",
  },
  {
    name: "Crimson",
    color: "#BE123C",
    accent: "#E11D48",
  },
  {
    name: "Forest",
    color: "#166534",
    accent: "#22C55E",
  },
  {
    name: "Plum",
    color: "#86198F",
    accent: "#C026D3",
  },
];
  // ==================================================
  // DATE + TIME
  // ==================================================

  const combineDateTime = (
    date,
    time
  ) => {
    if (!date || !time) {
      return null;
    }

    const [
      hour,
      minute,
    ] =
      time
        .split(":")
        .map(Number);

    const result =
      new Date(date);

    result.setHours(
      hour,
      minute,
      0,
      0
    );

    return result;
  };

  // ==================================================
  // FORM ERRORS
  // ==================================================

  const onInvalid = (
    formErrors
  ) => {
    const firstError =
      Object.values(
        formErrors
      )[0];

    toast.error(
      firstError?.message ||
        "Please complete the required fields."
    );
  };

  // ==================================================
  // CREATE EVENT
  // ==================================================

  const onSubmit = async (
    data
  ) => {
    try {
      const start =
        combineDateTime(
          data.startDate,
          data.startTime
        );

      const end =
        combineDateTime(
          data.endDate,
          data.endTime
        );

      if (!start || !end) {
        toast.error(
          "Please select both start and end date/time."
        );
        return;
      }

      if (
        end.getTime() <=
        start.getTime()
      ) {
        toast.error(
          "End date/time must be after start date/time."
        );
        return;
      }

      const payload = {
        title:
          data.title.trim(),

        description:
          data.description.trim(),

        category:
          data.category,

        tags: [
          data.category,
        ],

        startDate:
          start.getTime(),

        endDate:
          end.getTime(),

        timezone:
          "Asia/Kolkata",

        locationType:
          data.locationType,

        venue:
          data.venue ||
          undefined,

        address:
          data.address ||
          undefined,

        city:
          data.city,

        state:
          data.state ||
          undefined,

        country:
          "India",

        capacity:
          Number(
            data.capacity
          ),

        ticketType:
          data.ticketType,

        ticketPrice:
          data.ticketType ===
          "paid"
            ? Number(
                data.ticketPrice
              )
            : undefined,

        coverImage:
          data.coverImage ||
          undefined,

        themeColor:
          data.themeColor,
      };

      await createEvent(
        payload
      );

      toast.success(
        "Event created successfully! 🎉"
      );

      router.push(
        "/my-events"
      );
    } catch (error) {
      console.error(
        "Create event error:",
        error
      );

      toast.error(
        error?.message ||
          "Failed to create event."
      );
    }
  };

  // ==================================================
  // AI GENERATION
  // ==================================================

  const handleAIGenerate = (
    generatedData
  ) => {
    if (
      !generatedData ||
      typeof generatedData !==
        "object"
    ) {
      toast.error(
        "AI returned an invalid response."
      );
      return;
    }

    if (
      generatedData.error
    ) {
      toast.error(
        generatedData.error
      );
      return;
    }

    const title =
      typeof generatedData.title ===
      "string"
        ? generatedData.title.trim()
        : "";

    const description =
      typeof generatedData.description ===
      "string"
        ? generatedData.description.trim()
        : "";

    const rawCategory =
      typeof generatedData.category ===
      "string"
        ? generatedData.category
            .trim()
            .toLowerCase()
        : "";

    const categoryAliases = {
      technology: "tech",
      programming: "tech",
      software: "tech",
      entrepreneurship:
        "business",
      fitness: "health",
      wellness: "health",
      educational:
        "education",
      esports: "gaming",
      games: "gaming",
      outdoors: "outdoor",
    };

    const normalizedCategory =
      categoryAliases[
        rawCategory
      ] ||
      rawCategory;

    const matchedCategory =
      CATEGORIES.find(
        (category) =>
          category.id
            .toLowerCase() ===
            normalizedCategory ||
          category.label
            .toLowerCase() ===
            normalizedCategory
      );

    const parsedCapacity =
      Number(
        generatedData.suggestedCapacity
      );

    const capacity =
      Number.isFinite(
        parsedCapacity
      )
        ? Math.max(
            1,
            Math.round(
              parsedCapacity
            )
          )
        : 50;

    const normalizedTicketType =
      String(
        generatedData.suggestedTicketType ||
          "free"
      ).toLowerCase() ===
      "paid"
        ? "paid"
        : "free";

    const aiStartDate =
      parseAIDate(
        generatedData.startDate
      );

    const aiEndDate =
      parseAIDate(
        generatedData.endDate
      );

    const aiStartTime =
      normalizeTime(
        generatedData.startTime
      );

    const aiEndTime =
      normalizeTime(
        generatedData.endTime
      );

    const aiLocationType =
      generatedData.locationType ===
      "online"
        ? "online"
        : "physical";

    const aiCity =
      typeof generatedData.city ===
      "string"
        ? generatedData.city.trim()
        : "";

    const aiState =
      typeof generatedData.state ===
      "string"
        ? generatedData.state.trim()
        : "";

    const aiVenue =
      typeof generatedData.venue ===
        "string" &&
      isValidUrl(
        generatedData.venue.trim()
      )
        ? generatedData.venue.trim()
        : "";

    const aiAddress =
      typeof generatedData.address ===
      "string"
        ? generatedData.address.trim()
        : "";

    const parsedTicketPrice =
      Number(
        generatedData.ticketPrice
      );

    const ticketPrice =
      normalizedTicketType ===
        "paid" &&
      Number.isFinite(
        parsedTicketPrice
      )
        ? parsedTicketPrice
        : undefined;

    if (
      !title ||
      title.length < 5
    ) {
      toast.error(
        "AI did not return a valid event title."
      );
      return;
    }

    if (
      !description ||
      description.length < 20
    ) {
      toast.error(
        "AI did not return a valid event description."
      );
      return;
    }

    if (!matchedCategory) {
      toast.error(
        "AI returned an unsupported category."
      );
      return;
    }

    const current =
      getValues();

    reset({
      ...current,

      title,

      description,

      category:
        matchedCategory.id,

      capacity,

      ticketType:
        normalizedTicketType,

      ticketPrice,

      locationType:
        aiLocationType,

      venue:
        aiVenue,

      address:
        aiAddress,

      city:
        aiCity ||
        current.city ||
        "",

      state:
        aiState ||
        current.state ||
        "",

      startDate:
        aiStartDate ||
        current.startDate,

      endDate:
        aiEndDate ||
        current.endDate,

      startTime:
        aiStartTime ||
        current.startTime ||
        "",

      endTime:
        aiEndTime ||
        current.endTime ||
        "",
    });

    const missing = [];

    if (
      !aiStartDate &&
      !current.startDate
    ) {
      missing.push(
        "start date"
      );
    }

    if (
      !aiEndDate &&
      !current.endDate
    ) {
      missing.push(
        "end date"
      );
    }

    if (
      !aiStartTime &&
      !current.startTime
    ) {
      missing.push(
        "start time"
      );
    }

    if (
      !aiEndTime &&
      !current.endTime
    ) {
      missing.push(
        "end time"
      );
    }

    if (
      !aiCity &&
      !current.city
    ) {
      missing.push("city");
    }

    if (missing.length > 0) {
      toast.success(
        `AI filled the supplied details. Still required: ${missing.join(
          ", "
        )}.`
      );
    } else {
      toast.success(
        "Event details generated successfully!"
      );
    }
  };

  // ==================================================
  // UI
  // ==================================================

  return (
    <div
      className="min-h-screen transition-colors duration-300 px-6 py-8 -mt-6 md:-mt-16 lg:-mt-5 lg:rounded-md"
      style={{
  background: `
    radial-gradient(
      circle at 10% 5%,
      ${themeColor}45 0%,
      transparent 28%
    ),
    radial-gradient(
      circle at 90% 10%,
      ${themeColor}30 0%,
      transparent 25%
    ),
    hsl(var(--background))
  `,
}}
    >
      {/* HEADER */}

      <div className="max-w-6xl mx-auto flex flex-col gap-5 md:flex-row justify-between mb-10">
        <div>
          <h1 className="text-4xl font-bold">
            Create Event
          </h1>

          <p className="text-sm text-muted-foreground mt-2">
            Create and publish unlimited events with EventNova.
          </p>
        </div>

        <AIEventCreator
          onEventGenerated={
            handleAIGenerate
          }
        />
      </div>

      {/* MAIN */}

      <div className="max-w-6xl mx-auto grid md:grid-cols-[320px_1fr] gap-10">
        {/* LEFT */}

        <div className="space-y-6">
          <EventCoverUploader
  value={coverImage}
  onChange={(url) =>
    setValue("coverImage", url, {
      shouldDirty: true,
      shouldValidate: true,
    })
  }
/>
          {/* THEME */}
<div className="space-y-4">

  <div>
    <Label className="text-sm font-semibold">
      Event Theme
    </Label>

    <p className="text-xs text-muted-foreground mt-1">
      Choose the visual identity for your event.
    </p>
  </div>

  {/* COLOR PRESETS */}
  <div className="grid grid-cols-3 gap-2.5">
    {colorPresets.map((theme) => {
      const selected =
        themeColor === theme.color;

      return (
        <button
          key={theme.color}
          type="button"
          onClick={() =>
            setValue(
              "themeColor",
              theme.color,
              {
                shouldDirty: true,
                shouldValidate: true,
              }
            )
          }
          className={`
            group relative overflow-hidden
            rounded-xl border p-1
            transition-all duration-200
            hover:-translate-y-0.5
            ${
              selected
                ? "border-white/80 ring-2 ring-white/30"
                : "border-white/10 hover:border-white/30"
            }
          `}
        >
          <div
            className="h-12 rounded-lg flex items-end p-2 relative overflow-hidden"
            style={{
              background: `linear-gradient(
                135deg,
                ${theme.color},
                ${theme.accent}
              )`,
            }}
          >
            <span className="text-[10px] font-semibold text-white drop-shadow-md">
              {theme.name}
            </span>

            {selected && (
              <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-white/90 flex items-center justify-center">
                <Check className="w-3 h-3 text-black" />
              </div>
            )}
          </div>
        </button>
      );
    })}
  </div>

  {/* CUSTOM COLOR */}
  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/10 p-3">
    <div>
      <p className="text-sm font-medium">
        Custom color
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">
        Pick your own event color
      </p>
    </div>

    <label className="relative cursor-pointer">
      <input
        type="color"
        value={themeColor}
        onChange={(e) =>
          setValue(
            "themeColor",
            e.target.value,
            {
              shouldDirty: true,
              shouldValidate: true,
            }
          )
        }
        className="absolute inset-0 opacity-0 cursor-pointer"
      />

      <div
        className="w-10 h-10 rounded-xl border-2 border-white/30 shadow-lg"
        style={{
          backgroundColor: themeColor,
        }}
      />
    </label>
  </div>

  {/* LIVE PREVIEW */}
  <div
    className="rounded-2xl overflow-hidden border border-white/10 shadow-lg"
    style={{
      background: `linear-gradient(
        135deg,
        ${themeColor},
        #0f172a 85%
      )`,
    }}
  >
    <div className="p-4">
      <p className="text-xs uppercase tracking-wider text-white/60">
        Preview
      </p>

      <p className="mt-2 text-lg font-bold text-white">
        Your Event
      </p>

      <p className="text-xs text-white/70 mt-1">
        EventNova theme preview
      </p>
    </div>
  </div>

</div>

        </div>

        {/* FORM */}

        <form
          onSubmit={handleSubmit(
            onSubmit,
            onInvalid
          )}
          className="space-y-8"
        >
          {/* TITLE */}

          <div>
            <Input
              {...register("title")}
              placeholder="Event Name"
              className="text-3xl font-semibold bg-transparent border-none focus-visible:ring-0"
            />

            {errors.title && (
              <p className="text-sm text-red-400 mt-1">
                {
                  errors.title
                    .message
                }
              </p>
            )}
          </div>

          {/* DATE / TIME */}

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>
                Start
              </Label>

              <div className="grid grid-cols-[1fr_auto] gap-2">
                <Popover>
                  <PopoverTrigger
                    asChild
                  >
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between"
                    >
                      {startDate
                        ? format(
                            startDate,
                            "PPP"
                          )
                        : "Pick date"}

                      <CalendarIcon className="w-4 h-4 opacity-60" />
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent className="p-0">
                    <Calendar
                      mode="single"
                      selected={
                        startDate
                      }
                      onSelect={(
                        date
                      ) =>
                        setValue(
                          "startDate",
                          date,
                          {
                            shouldDirty:
                              true,
                            shouldValidate:
                              true,
                          }
                        )
                      }
                      disabled={(date) =>
                        date <
                        new Date(
                          new Date().setHours(
                            0,
                            0,
                            0,
                            0
                          )
                        )
                      }
                    />
                  </PopoverContent>
                </Popover>

                <Input
                  type="time"
                  {...register(
                    "startTime"
                  )}
                />
              </div>

              {(errors.startDate ||
                errors.startTime) && (
                <p className="text-sm text-red-400">
                  {errors.startDate
                    ?.message ||
                    errors.startTime
                      ?.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>
                End
              </Label>

              <div className="grid grid-cols-[1fr_auto] gap-2">
                <Popover>
                  <PopoverTrigger
                    asChild
                  >
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between"
                    >
                      {endDate
                        ? format(
                            endDate,
                            "PPP"
                          )
                        : "Pick date"}

                      <CalendarIcon className="w-4 h-4 opacity-60" />
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent className="p-0">
                    <Calendar
                      mode="single"
                      selected={
                        endDate
                      }
                      onSelect={(
                        date
                      ) =>
                        setValue(
                          "endDate",
                          date,
                          {
                            shouldDirty:
                              true,
                            shouldValidate:
                              true,
                          }
                        )
                      }
                      disabled={(date) =>
                        date <
                        (startDate ||
                          new Date())
                      }
                    />
                  </PopoverContent>
                </Popover>

                <Input
                  type="time"
                  {...register(
                    "endTime"
                  )}
                />
              </div>

              {(errors.endDate ||
                errors.endTime) && (
                <p className="text-sm text-red-400">
                  {errors.endDate
                    ?.message ||
                    errors.endTime
                      ?.message}
                </p>
              )}
            </div>
          </div>

          {/* CATEGORY */}

          <div className="space-y-2">
            <Label>
              Category
            </Label>

            <Controller
              control={control}
              name="category"
              render={({
                field,
              }) => (
                <Select
                  value={
                    field.value
                  }
                  onValueChange={
                    field.onChange
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>

                  <SelectContent>
                    {CATEGORIES.map(
                      (category) => (
                        <SelectItem
                          key={
                            category.id
                          }
                          value={
                            category.id
                          }
                        >
                          {
                            category.icon
                          }{" "}
                          {
                            category.label
                          }
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              )}
            />

            {errors.category && (
              <p className="text-sm text-red-400">
                {
                  errors.category
                    .message
                }
              </p>
            )}
          </div>

          {/* EVENT MODE */}

          <div className="space-y-2">
            <Label>
              Event Type
            </Label>

            <Controller
              control={control}
              name="locationType"
              render={({
                field,
              }) => (
                <Select
                  value={
                    field.value
                  }
                  onValueChange={
                    field.onChange
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="physical">
                      📍 Physical Event
                    </SelectItem>

                    <SelectItem value="online">
                      🌐 Online Event
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* LOCATION */}

          <div className="space-y-3">
            <Label>
              Location
            </Label>

            <div className="grid grid-cols-2 gap-4">
              <Controller
                control={control}
                name="state"
                render={({
                  field,
                }) => (
                  <Select
                    value={
                      field.value
                    }
                    onValueChange={(
                      value
                    ) => {
                      field.onChange(
                        value
                      );

                      setValue(
                        "city",
                        "",
                        {
                          shouldDirty:
                            true,
                        }
                      );
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>

                    <SelectContent>
                      {indianStates.map(
                        (state) => (
                          <SelectItem
                            key={
                              state.isoCode
                            }
                            value={
                              state.name
                            }
                          >
                            {
                              state.name
                            }
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                )}
              />

              <Controller
                control={control}
                name="city"
                render={({
                  field,
                }) => (
                  <Select
                    value={
                      field.value
                    }
                    onValueChange={
                      field.onChange
                    }
                    disabled={
                      !selectedState
                    }
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          selectedState
                            ? "Select city"
                            : "Select state first"
                        }
                      />
                    </SelectTrigger>

                    <SelectContent>
                      {cities.map(
                        (city) => (
                          <SelectItem
                            key={
                              city.name
                            }
                            value={
                              city.name
                            }
                          >
                            {
                              city.name
                            }
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {locationType ===
              "physical" && (
              <>
                <Input
                  {...register(
                    "venue"
                  )}
                  placeholder="Venue link (Google Maps Link)"
                  type="url"
                />

                {errors.venue && (
                  <p className="text-sm text-red-400">
                    {
                      errors.venue
                        .message
                    }
                  </p>
                )}

                <Input
                  {...register(
                    "address"
                  )}
                  placeholder="Full address / street / building"
                />
              </>
            )}
          </div>

          {/* DESCRIPTION */}

          <div className="space-y-2">
            <Label>
              Description
            </Label>

            <Textarea
              {...register(
                "description"
              )}
              placeholder="Tell people about your event..."
              rows={5}
            />

            {errors.description && (
              <p className="text-sm text-red-400">
                {
                  errors
                    .description
                    .message
                }
              </p>
            )}
          </div>

          {/* TICKETS */}

          <div className="space-y-3">
            <Label>
              Tickets
            </Label>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="free"
                  {...register(
                    "ticketType"
                  )}
                />
                Free
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="paid"
                  {...register(
                    "ticketType"
                  )}
                />
                Paid
              </label>
            </div>

            {ticketType ===
              "paid" && (
              <Input
                type="number"
                min="0"
                placeholder="Ticket price ₹"
                {...register(
                  "ticketPrice",
                  {
                    valueAsNumber:
                      true,
                  }
                )}
              />
            )}
          </div>

          {/* CAPACITY */}

          <div className="space-y-2">
            <Label>
              Capacity
            </Label>

            <Input
              type="number"
              min="1"
              {...register(
                "capacity",
                {
                  valueAsNumber:
                    true,
                }
              )}
              placeholder="Ex: 100"
            />

            {errors.capacity && (
              <p className="text-sm text-red-400">
                {
                  errors
                    .capacity
                    .message
                }
              </p>
            )}
          </div>

          {/* SUBMIT */}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full py-6 text-lg rounded-xl"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Event"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
