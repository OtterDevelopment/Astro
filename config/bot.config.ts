import {
    Intents,
    PartialTypes,
    PermissionString,
    PresenceData
} from "discord.js";

export default {
    prefixes: process.env.NODE_ENV === "production" ? ["a!"] : ["a!!"],
    botName: "Astro",

    version: "4.0.0",
    admins: ["619284841187246090", "255422791875166208"],

    // If your bot isn't public, or open source, or doesn't have a
    // Support server, feel free to remove the following variables.
    supportServer: "https://discord.gg/Q27U4pZ",
    minimalInvite:
        "https://discord.com/api/oauth2/authorize?client_id=649535694145847301&permissions=347136&scope=bot%20applications.commands",
    gitHub: "https://github.com/OtterDevelopment/Astro",

    presence: {
        status: "online",
        activities: [
            {
                type: "LISTENING",
                name: "suggestions."
            }
        ]
    } as PresenceData,

    hastebin: "https://h.inv.wtf",

    // To replace these colors please make sure you are providing a
    // hexadecimal color.
    colors: {
        primary: "5865F2",
        success: "57F287",
        warning: "FEE75C",
        error: "ED4245"
    },

    // Properly update the following intents list for the bot to
    // Function properly, it currently only listens for guilds
    // And interactions.
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.DIRECT_MESSAGES,
        Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS
    ],

    // If you want to receive direct messages you need the channel partial.
    partials: ["CHANNEL"] as PartialTypes[],

    // If your bot requires any permissions other than the ones below
    // Add them and all commands and interactions will only work if
    // The bot has said permissions in the environment they're run in.
    requiredPermissions: [
        "EMBED_LINKS",
        "SEND_MESSAGES",
        "USE_EXTERNAL_EMOJIS",
        "CREATE_PUBLIC_THREADS"
    ] as PermissionString[],

    dataDog: {
        apiKey: process.env.DATADOG_API_KEY,
        baseURL: "https://app.datadoghq.com/api/v1/"
    },

    mediaChannel:
        process.env.NODE_ENV === "production"
            ? "799529648102440970"
            : "961383088963854427"
};

