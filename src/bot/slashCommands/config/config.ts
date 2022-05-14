import { CommandInteraction, PermissionString, Role } from "discord.js";
import SlashCommand from "../../../../lib/classes/SlashCommand.js";
import BetterClient from "../../../../lib/extensions/BetterClient.js";

export default class Config extends SlashCommand {
    constructor(client: BetterClient) {
        super("config", client, {
            description: `Configure ${client.config.botName}.`,
            guildOnly: true,
            permissions: ["MANAGE_GUILD"],
            options: [
                {
                    name: "suggestion_channel",
                    description:
                        "Set or remove the suggestion channel for the guild.",
                    type: "SUB_COMMAND_GROUP",
                    options: [
                        {
                            name: "set",
                            description: "Set the suggestion channel.",
                            type: "SUB_COMMAND",
                            options: [
                                {
                                    name: "channel",
                                    description: "The channel to set.",
                                    type: "CHANNEL",
                                    channelTypes: ["GUILD_NEWS", "GUILD_TEXT"],
                                    required: true
                                }
                            ]
                        },
                        {
                            name: "remove",
                            description: "Remove the suggestion channel.",
                            type: "SUB_COMMAND"
                        }
                    ]
                },
                {
                    name: "permissions",
                    description:
                        "Allow or deny users or roles to respond to suggestions.",
                    type: "SUB_COMMAND_GROUP",
                    options: [
                        {
                            name: "allow",
                            description:
                                "Allow users or roles to respond to suggestions.",
                            type: "SUB_COMMAND",
                            options: [
                                {
                                    name: "object",
                                    description: "The object to allow.",
                                    type: "MENTIONABLE",
                                    required: true
                                }
                            ]
                        },
                        {
                            name: "deny",
                            description:
                                "Deny users or roles to respond to suggestions.",
                            type: "SUB_COMMAND",
                            options: [
                                {
                                    name: "object",
                                    description: "The object to deny.",
                                    type: "MENTIONABLE",
                                    required: true
                                }
                            ]
                        }
                    ]
                },
                {
                    name: "suggestion_log_channel",
                    description:
                        "Set or remove the suggestion log channel for the guild.",
                    type: "SUB_COMMAND_GROUP",
                    options: [
                        {
                            name: "set",
                            description: "Set the suggestion log channel.",
                            type: "SUB_COMMAND",
                            options: [
                                {
                                    name: "channel",
                                    description: "The channel to set.",
                                    type: "CHANNEL",
                                    channelTypes: ["GUILD_NEWS", "GUILD_TEXT"],
                                    required: true
                                },
                                {
                                    name: "type",
                                    description: "The type of choices to log.",
                                    type: "STRING",
                                    choices: [
                                        { name: "All", value: "all" },
                                        { name: "Approved", value: "approved" },
                                        { name: "Denied", value: "denied" },
                                        {
                                            name: "Considered",
                                            value: "considered"
                                        },
                                        {
                                            name: "Implemented",
                                            value: "implemented"
                                        }
                                    ],
                                    required: true
                                }
                            ]
                        },
                        {
                            name: "remove",
                            description: "Remove the suggestion log channel.",
                            type: "SUB_COMMAND",
                            options: [
                                {
                                    name: "type",
                                    description: "The type of choices to log.",
                                    type: "STRING",
                                    choices: [
                                        { name: "All", value: "all" },
                                        { name: "Accepted", value: "accepted" },
                                        { name: "Denied", value: "denied" },
                                        {
                                            name: "Considered",
                                            value: "considered"
                                        },
                                        {
                                            name: "Implemented",
                                            value: "implemented"
                                        }
                                    ],
                                    required: true
                                }
                            ]
                        }
                    ]
                },
                {
                    name: "custom_emoji",
                    description:
                        "Set or remove the custom emoji for upvoting or downvoting.",
                    type: "SUB_COMMAND_GROUP",
                    options: [
                        {
                            name: "set",
                            description:
                                "Set the custom emoji for upvoting or downvoting.",
                            type: "SUB_COMMAND",
                            options: [
                                {
                                    name: "type",
                                    description:
                                        "The type of voting to set the emoji for.",
                                    type: "STRING",
                                    choices: [
                                        { name: "Upvote", value: "upvote" },
                                        { name: "Downvote", value: "downvote" }
                                    ],
                                    required: true
                                },
                                {
                                    name: "emoji",
                                    description: "The emoji to set.",
                                    type: "STRING",
                                    required: true
                                }
                            ]
                        },
                        {
                            name: "remove",
                            description:
                                "Remove the custom emoji for upvoting or downvoting.",
                            type: "SUB_COMMAND",
                            options: [
                                {
                                    name: "type",
                                    description:
                                        "The type of voting to remove the emoji for.",
                                    type: "STRING",
                                    choices: [
                                        { name: "Upvote", value: "upvote" },
                                        { name: "Downvote", value: "downvote" }
                                    ],
                                    required: true
                                }
                            ]
                        }
                    ]
                },
                {
                    name: "dm_on_choice",
                    description:
                        "Toggle whether or not users should be DMed when an outcome is made on their suggestion.",
                    type: "SUB_COMMAND"
                },
                {
                    name: "auto_thread",
                    description:
                        "Toggle whether or not threads should automatically be made for suggestions or not.",
                    type: "SUB_COMMAND"
                },
                {
                    name: "anonymous",
                    description:
                        "Toggle whether or not suggestions should be anonymous.",
                    type: "SUB_COMMAND"
                },
                {
                    name: "dm_participants_on_choice",
                    description:
                        "Toggle whether or not all users who voted on the suggestion should be DMed or not.",
                    type: "SUB_COMMAND"
                },
                {
                    name: "attach_images",
                    description:
                        "Toggle whether or not images should be attached to suggestions to allow images to be viewed longer.",
                    type: "SUB_COMMAND"
                }
            ]
        });
    }

    override async run(interaction: CommandInteraction) {
        if (
            interaction.options.getSubcommandGroup(false) ===
            "suggestion_channel"
        ) {
            if (interaction.options.getSubcommand() === "set") {
                return Promise.all([
                    this.client.mongo
                        .db("guilds")
                        .collection("suggestionChannels")
                        .updateOne(
                            { guildId: interaction.guild!.id },
                            {
                                $set: {
                                    channelId:
                                        interaction.options.getChannel(
                                            "channel"
                                        )!.id
                                }
                            },
                            { upsert: true }
                        ),
                    interaction.reply(
                        this.client.functions.generateSuccessMessage({
                            title: "Suggestion Channel Set",
                            description: `I have set the suggestion channel to ${interaction.options
                                .getChannel("channel")!
                                .toString()}!`
                        })
                    )
                ]);
            }

            return Promise.all([
                this.client.mongo
                    .db("guilds")
                    .collection("suggestionChannels")
                    .deleteOne({ guildId: interaction.guild!.id }),
                interaction.reply(
                    this.client.functions.generateSuccessMessage({
                        title: "Suggestion Channel Removed",
                        description: `I have removed the suggestion channel!`
                    })
                )
            ]);
        } else if (
            interaction.options.getSubcommandGroup(false) ===
            "suggestion_log_channel"
        ) {
            if (interaction.options.getSubcommand() === "set") {
                return Promise.all([
                    this.client.mongo
                        .db("guilds")
                        .collection("suggestionLogChannels")
                        .updateOne(
                            { guildId: interaction.guild!.id },
                            {
                                $set: {
                                    [`type.${interaction.options.getString(
                                        "type"
                                    )}`]:
                                        interaction.options.getChannel(
                                            "channel"
                                        )!.id
                                }
                            },
                            { upsert: true }
                        ),
                    interaction.reply(
                        this.client.functions.generateSuccessMessage({
                            title: "Suggestion Log Channel Set",
                            description: `I have set the suggestion log channel for ${interaction.options.getString(
                                "type"
                            )} suggestions to ${interaction.options
                                .getChannel("channel")!
                                .toString()}!`
                        })
                    )
                ]);
            }

            return Promise.all([
                this.client.mongo
                    .db("guilds")
                    .collection("suggestionLogChannels")
                    .updateOne(
                        { guildId: interaction.guild!.id },
                        {
                            $unset: {
                                [`type.${interaction.options.getString(
                                    "type"
                                )}`]:
                                    interaction.options.getChannel("channel")!
                                        .id
                            }
                        }
                    ),
                interaction.reply(
                    this.client.functions.generateSuccessMessage({
                        title: "Suggestion Log Channel Removed",
                        description: `I have removed the suggestion log channel for ${interaction.options.getString(
                            "type"
                        )} suggestions!`
                    })
                )
            ]);
        } else if (
            interaction.options.getSubcommandGroup(false) === "permissions"
        ) {
            if (interaction.options.getSubcommand() === "allow") {
                return Promise.all([
                    this.client.mongo
                        .db("guilds")
                        .collection("permissions")
                        .updateOne(
                            { guildId: interaction.guild!.id },
                            {
                                $addToSet: {
                                    [`allowed.${
                                        interaction.options.getMentionable(
                                            "object"
                                        ) instanceof Role
                                            ? "roles"
                                            : "users"
                                    }`]: interaction.user.id
                                }
                            },
                            { upsert: true }
                        ),
                    interaction.reply(
                        this.client.functions.generateSuccessMessage({
                            title: `${
                                interaction.options.getMentionable(
                                    "object"
                                ) instanceof Role
                                    ? "Role"
                                    : "User"
                            } Allowed`,
                            description: `I have allowed ${interaction.options
                                .getMentionable("object")!
                                .toString()} the permission to change the outcome of suggestions!`
                        })
                    )
                ]);
            }

            return Promise.all([
                this.client.mongo
                    .db("guilds")
                    .collection("permissions")
                    .updateOne(
                        { guildId: interaction.guild!.id },
                        {
                            $pull: {
                                [`denied.${
                                    interaction.options.getMentionable(
                                        "object"
                                    ) instanceof Role
                                        ? "roles"
                                        : "users"
                                }`]: interaction.user.id
                            }
                        },
                        { upsert: true }
                    ),
                interaction.reply(
                    this.client.functions.generateSuccessMessage({
                        title: `${
                            interaction.options.getMentionable(
                                "object"
                            ) instanceof Role
                                ? "Role"
                                : "User"
                        } Denied`,
                        description: `I have denied ${interaction.options
                            .getMentionable("object")!
                            .toString()} the permission to change the outcome of suggestions!`
                    })
                )
            ]);
        } else if (
            interaction.options.getSubcommandGroup(false) === "custom_emoji"
        ) {
            if (interaction.options.getSubcommand() === "set") {
                const emojiSplit = interaction.options.getString("emoji")!;
                const emoji = this.client.emojis.cache.get(
                    emojiSplit[emojiSplit.length - 1].replace(">", "")
                );

                if (!emoji)
                    return interaction.reply(
                        this.client.functions.generateErrorMessage({
                            title: "Emoji Not Found",
                            description:
                                "I couldn't find the emoji you provided, please make sure it's a valid emoji and that it's in a guild I'm in!"
                        })
                    );

                return Promise.all([
                    this.client.mongo
                        .db("guilds")
                        .collection("customEmojis")
                        .updateOne(
                            { guildId: interaction.guild!.id },
                            {
                                $set: {
                                    [interaction.options.getString("type")!]:
                                        interaction.options.getString("emoji")
                                }
                            }
                        ),
                    interaction.reply(
                        this.client.functions.generateSuccessMessage({
                            title: "Custom Emoji Set",
                            description: `${this.client.functions.titleCase(
                                interaction.options.getString("type")!
                            )} emoji has been set to ${emoji.toString()}!`
                        })
                    )
                ]);
            }

            return Promise.all([
                this.client.mongo
                    .db("guilds")
                    .collection("customEmojis")
                    .updateOne(
                        { guildId: interaction.guild!.id },
                        {
                            $unset: {
                                [interaction.options.getString("type")!]: ""
                            }
                        }
                    ),
                interaction.reply(
                    this.client.functions.generateSuccessMessage({
                        title: "Custom Emoji Set",
                        description: `${this.client.functions.titleCase(
                            interaction.options.getString("type")!
                        )} emoji has been removed!`
                    })
                )
            ]);
        } else if (interaction.options.getSubcommand() === "dm_on_choice") {
            return Promise.all([
                this.client.mongo
                    .db("guilds")
                    .collection("dmOnChoiceTurnedOff")
                    .findOne({ guildId: interaction.guild!.id })
                    .then((entry): any => {
                        if (!entry)
                            return this.client.mongo
                                .db("guilds")
                                .collection("dmOnChoiceTurnedOff")
                                .insertOne({ guildId: interaction.guild!.id });

                        return this.client.mongo
                            .db("guilds")
                            .collection("dmOnChoiceTurnedOff")
                            .deleteOne({ guildId: interaction.guild!.id });
                    }),
                interaction.reply(
                    this.client.functions.generateSuccessMessage({
                        title: "DM On Choice Toggled",
                        description: "I have toggled DM on choice!"
                    })
                )
            ]);
        } else if (interaction.options.getSubcommand() === "auto_thread") {
            if (
                !interaction.guild!.me!.permissions.has([
                    "CREATE_PUBLIC_THREADS"
                ])
            )
                return interaction.reply(
                    this.client.functions.generateErrorMessage({
                        title: "Missing Permissions",
                        description: `Please make sure I have the ${[
                            "CREATE_PUBLIC_THREADS"
                        ]
                            .map(
                                permission =>
                                    `**${this.client.functions.getPermissionName(
                                        permission as PermissionString
                                    )}**`
                            )
                            .join(", ")} permissions!`
                    })
                );

            return Promise.all([
                this.client.mongo
                    .db("guilds")
                    .collection("autoThreadEnabled")
                    .findOne({ guildId: interaction.guild!.id })
                    .then((entry): any => {
                        if (!entry)
                            return this.client.mongo
                                .db("guilds")
                                .collection("autoThreadEnabled")
                                .insertOne({ guildId: interaction.guild!.id });

                        return this.client.mongo
                            .db("guilds")
                            .collection("autoThreadEnabled")
                            .deleteOne({ guildId: interaction.guild!.id });
                    }),
                interaction.reply(
                    this.client.functions.generateSuccessMessage({
                        title: "Auto Thread Toggled",
                        description: "I have toggled auto threads!"
                    })
                )
            ]);
        } else if (interaction.options.getSubcommand() === "anonymous") {
            return Promise.all([
                this.client.mongo
                    .db("guilds")
                    .collection("anonymousSuggestionsEnabled")
                    .findOne({ guildId: interaction.guild!.id })
                    .then((entry): any => {
                        if (!entry)
                            return this.client.mongo
                                .db("guilds")
                                .collection("anonymousSuggestionsEnabled")
                                .insertOne({ guildId: interaction.guild!.id });

                        return this.client.mongo
                            .db("guilds")
                            .collection("anonymousSuggestionsEnabled")
                            .deleteOne({ guildId: interaction.guild!.id });
                    }),
                interaction.reply(
                    this.client.functions.generateSuccessMessage({
                        title: "Anonymous Suggestion Toggled",
                        description: "I have toggled anonymous suggestions!"
                    })
                )
            ]);
        } else if (
            interaction.options.getSubcommand() === "dm_participants_on_choice"
        ) {
            return Promise.all([
                this.client.mongo
                    .db("guilds")
                    .collection("dmAllUsersOnChoice")
                    .findOne({ guildId: interaction.guild!.id })
                    .then((entry): any => {
                        if (!entry)
                            return this.client.mongo
                                .db("guilds")
                                .collection("dmAllUsersOnChoice")
                                .insertOne({ guildId: interaction.guild!.id });

                        return this.client.mongo
                            .db("guilds")
                            .collection("dmAllUsersOnChoice")
                            .deleteOne({ guildId: interaction.guild!.id });
                    }),
                interaction.reply(
                    this.client.functions.generateSuccessMessage({
                        title: "DMing Participants Toggled",
                        description:
                            "I have toggled DMing all users who vote on suggestions when a choice is made!"
                    })
                )
            ]);
        } else if (interaction.options.getSubcommand() === "") {
            return Promise.all([
                this.client.mongo
                    .db("guilds")
                    .collection("dontAttachImages")
                    .findOne({ guildId: interaction.guild!.id })
                    .then((entry): any => {
                        if (!entry)
                            return this.client.mongo
                                .db("guilds")
                                .collection("dontAttachImages")
                                .insertOne({ guildId: interaction.guild!.id });

                        return this.client.mongo
                            .db("guilds")
                            .collection("dontAttachImages")
                            .deleteOne({ guildId: interaction.guild!.id });
                    }),
                interaction.reply(
                    this.client.functions.generateSuccessMessage({
                        title: "Attaching Images Toggled",
                        description:
                            "I have toggled attaching images when a suggestion is created!"
                    })
                )
            ]);
        }
    }
}
