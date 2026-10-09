import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get the authenticated EventNova user.
 *
 * If the user exists in Clerk but has not yet been
 * stored in Convex, create the user record.
 */
async function getOrCreateCurrentUser(ctx) {
  const identity =
    await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new Error(
      "You must be signed in to perform this action."
    );
  }

  let user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) =>
      q.eq(
        "tokenIdentifier",
        identity.tokenIdentifier
      )
    )
    .unique();

  if (!user) {
    const now = Date.now();

    const userId = await ctx.db.insert(
      "users",
      {
        email: identity.email ?? "",
        tokenIdentifier:
          identity.tokenIdentifier,
        name:
          identity.name ??
          "Anonymous",
        imageUrl:
          identity.pictureUrl,
        hasCompletedOnboarding:
          false,
        freeEventsCreated: 0,
        createdAt: now,
        updatedAt: now,
      }
    );

    user = await ctx.db.get(userId);

    if (!user) {
      throw new Error(
        "Unable to create your user profile."
      );
    }
  }

  return user;
}

// ==================================================
// CREATE EVENT
// ==================================================

export const createEvent = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    category: v.string(),
    tags: v.array(v.string()),

    startDate: v.number(),
    endDate: v.number(),
    timezone: v.string(),

    locationType: v.union(
      v.literal("physical"),
      v.literal("online")
    ),

    venue: v.optional(v.string()),
    address: v.optional(v.string()),

    city: v.string(),
    state: v.optional(v.string()),
    country: v.string(),

    capacity: v.number(),

    ticketType: v.union(
      v.literal("free"),
      v.literal("paid")
    ),

    ticketPrice: v.optional(v.number()),

    coverImage: v.optional(v.string()),
    themeColor: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    try {
      const user =
        await getOrCreateCurrentUser(ctx);

      const themeColor =
        args.themeColor ||
        "#1e3a8a";

      // Create a readable URL slug.
      const slugBase =
        args.title
          .toLowerCase()
          .replace(
            /[^a-z0-9]+/g,
            "-"
          )
          .replace(
            /(^-|-$)/g,
            ""
          ) || "event";

      const slug =
        `${slugBase}-${Date.now()}`;

      const now = Date.now();

      const eventId =
        await ctx.db.insert(
          "events",
          {
            ...args,

            themeColor,

            slug,

            organizerId:
              user._id,

            organizerName:
              user.name ||
              "EventNova Organizer",

            registrationCount: 0,

            createdAt: now,

            updatedAt: now,
          }
        );

      return eventId;
    } catch (error) {
      console.error(
        "Create event error:",
        error
      );

      throw new Error(
        `Failed to create event: ${
          error?.message ||
          "Unknown error"
        }`
      );
    }
  },
});

// ==================================================
// GET EVENT BY SLUG
// ==================================================

export const getEventBySlug = query({
  args: {
    slug: v.string(),
  },

  handler: async (
    ctx,
    args
  ) => {
    return await ctx.db
      .query("events")
      .withIndex(
        "by_slug",
        (q) =>
          q.eq(
            "slug",
            args.slug
          )
      )
      .unique();
  },
});

// ==================================================
// GET MY EVENTS
// ==================================================

export const getMyEvents = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    // Clerk/Convex may still be initializing.
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    // User record may not exist yet.
    if (!user) {
      return [];
    }

    return await ctx.db
      .query("events")
      .withIndex("by_organizer", (q) =>
        q.eq("organizerId", user._id)
      )
      .order("desc")
      .collect();
  },
});
// ==================================================
// DELETE EVENT
// ==================================================

export const deleteEvent = mutation({
  args: {
    eventId:
      v.id("events"),
  },

  handler: async (
    ctx,
    args
  ) => {
    try {
      const user =
        await getOrCreateCurrentUser(
          ctx
        );

      const event =
        await ctx.db.get(
          args.eventId
        );

      if (!event) {
        throw new Error(
          "Event not found."
        );
      }

      if (
        event.organizerId !==
        user._id
      ) {
        throw new Error(
          "You are not authorized to delete this event."
        );
      }

      // Delete registrations first.
      const registrations =
        await ctx.db
          .query("registrations")
          .withIndex(
            "by_event",
            (q) =>
              q.eq(
                "eventId",
                args.eventId
              )
          )
          .collect();

      for (
        const registration of
          registrations
      ) {
        await ctx.db.delete(
          registration._id
        );
      }

      await ctx.db.delete(
        args.eventId
      );

      return {
        success: true,
      };
    } catch (error) {
      console.error(
        "Delete event error:",
        error
      );

      throw new Error(
        error?.message ||
          "Failed to delete event."
      );
    }
  },
});