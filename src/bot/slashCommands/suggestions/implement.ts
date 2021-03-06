import {
    CommandInteraction,
    GuildMember,
    MessageActionRow,
    MessageButton,
    MessageEmbedOptions,
    Snowflake,
    TextChannel
} from "discord.js";
import SlashCommand from "../../../../lib/classes/SlashCommand.js";
import BetterClient from "../../../../lib/extensions/BetterClient.js";
import BetterMessage from "../../../../lib/extensions/BetterMessage.js";

export default class ImplementSuggestion extends SlashCommand {
    constructor(client: BetterClient) {
        super("implement", client, {
            description: "Implement a suggestion.",
            guildOnly: true,
            options: [
                {
                    name: "suggestion",
                    description: "The number of the suggestion to implement.",
                    type: "INTEGER",
                    required: true
                },
                {
                    name: "reason",
                    description: "The reason for implementing the suggestion.",
                    type: "STRING"
                },
                {
                    name: "anonymous",
                    description:
                        "Whether or not you should be named when giving a reason for this change.",
                    type: "BOOLEAN"
                }
            ]
        });
    }

    public override async preCheck(
        interaction: CommandInteraction
    ): Promise<[boolean, (MessageEmbedOptions | undefined)?]> {
        const permissionDocument = await this.client.mongo
            .db("guilds")
            .collection("permissions")
            .findOne({ guildId: interaction.guild!.id });

        if (
            !permissionDocument &&
            !interaction.memberPermissions?.has("MANAGE_GUILD")
        )
            return [
                false,
                {
                    title: "Missing Permissions",
                    description:
                        "You don't have enough permissions to make a decision about this suggestion"
                }
            ];
        else if (interaction.memberPermissions?.has("MANAGE_GUILD"))
            return [true];
        else if (
            permissionDocument?.allowed.users.includes(interaction.user.id) &&
            !permissionDocument?.denied.users.includes(interaction.user.id)
        )
            return [true];

        let { member } = interaction;

        if (!(interaction.member instanceof GuildMember))
            member = await interaction.guild!.members.fetch(
                interaction.user.id
            );

        if (
            (member as GuildMember).roles.cache.some(role =>
                permissionDocument?.allowed.roles.includes(role.id)
            ) &&
            (member as GuildMember).roles.cache.every(
                role => !permissionDocument?.denied.roles.includes(role.id)
            )
        )
            return [true];

        return [
            false,
            {
                title: "Missing Permissions",
                description:
                    "You don't have enough permissions to make a decision about this suggestion"
            }
        ];
    }

    override async run(interaction: CommandInteraction) {
        const suggestion = await this.client.mongo
            .db("suggestions")
            .collection(interaction.guild!.id)
            .findOne({
                suggestionNumber: interaction.options.getInteger("suggestion")
            });

        if (!suggestion)
            return interaction.reply(
                this.client.functions.generateErrorMessage({
                    title: "Suggestion Not Found",
                    description: "The suggestion you provided doesn't exist!"
                })
            );

        const suggestionChannelDocument = await this.client.mongo
            .db("guilds")
            .collection("suggestionChannels")
            .findOne({ guildId: interaction.guild!.id });

        if (!suggestionChannelDocument)
            return interaction.reply(
                this.client.functions.generateErrorMessage({
                    title: "Suggestion Channel Not Found",
                    description: `There is currently no suggestion channel set. ${
                        interaction.memberPermissions?.has("MANAGE_GUILD")
                            ? "Set one with `/config suggestion_channel set #channel`"
                            : "Please contact a server manager to have them set one."
                    }`
                })
            );

        const suggestionChannel = interaction.guild!.channels.cache.get(
            suggestionChannelDocument.channelId
        ) as TextChannel | null;

        if (!suggestionChannel)
            return interaction.reply(
                this.client.functions.generateErrorMessage({
                    title: "Suggestion Channel Not Found",
                    description: `The suggestion channel set does not exist. ${
                        interaction.memberPermissions?.has("MANAGE_GUILD")
                            ? "Set one with `/config suggestion_channel set #channel`"
                            : "Please contact a server manager to have them set one."
                    }`
                })
            );

        const anonymous = interaction.options.getBoolean("anonymous");
        let suggestionMessage: BetterMessage;

        try {
            suggestionMessage = await suggestionChannel.messages.fetch(
                suggestion.messageId
            );
        } catch (error: any) {
            if (error.code === 10008)
                return this.client.logger.info(
                    `The message for suggestion #${
                        suggestion.suggestionNumber
                    } in ${interaction.guild!.name} [${
                        interaction.guild!.id
                    }] was not found in their current suggestion channel (${
                        suggestionChannel.id
                    }).`
                );
            else if (error.code === 50013)
                return this.client.logger.info(
                    `I don't have enough permissions to fetch messages in the suggestion channel (${
                        suggestionChannel.id
                    }) for ${interaction.guild!.name} [${
                        interaction.guild!.id
                    }]`
                );
            else {
                this.client.logger.error(error);
                const sentryId =
                    await this.client.logger.sentry.captureWithInteraction(
                        error,
                        interaction
                    );

                return interaction.reply(
                    this.client.functions.generateErrorMessage(
                        {
                            title: "An Error Has Occurred",
                            description: `An unexpected error was encountered while running \`${interaction.commandName}\`, my developers have already been notified! Feel free to join my support server in the mean time!`,
                            footer: { text: `Sentry Event ID: ${sentryId} ` }
                        },
                        true
                    )
                );
            }
        }

        const [suggestionDecisionChannelsDocument, deleteOnDecision] =
            await Promise.all([
                this.client.mongo
                    .db("guilds")
                    .collection("suggestionDecisionChannels")
                    .findOne({ guildId: interaction.guild!.id }),
                this.client.mongo
                    .db("guilds")
                    .collection("deleteOnDecision")
                    .findOne({ guildId: interaction.guild!.id })
            ]);

        let suggestionDecisionChannels: TextChannel[] = [];

        if (suggestionDecisionChannelsDocument)
            suggestionDecisionChannels = [
                this.client.channels.cache.get(
                    suggestionDecisionChannelsDocument.type.all || ""
                ),
                this.client.channels.cache.get(
                    suggestionDecisionChannelsDocument.type.approved || ""
                )
            ].filter(Boolean) as Array<TextChannel>;

        try {
            if (deleteOnDecision && suggestionDecisionChannels.length) {
                await Promise.all(
                    [suggestionMessage.delete()].concat(
                        suggestionDecisionChannels.map(channel =>
                            (channel as TextChannel).send(
                                this.client.functions.generatePrimaryMessage({
                                    author: suggestionMessage.embeds[0].author!,
                                    title: `Suggestion #${suggestion.suggestionNumber} Implemented`,
                                    description:
                                        suggestionMessage.embeds[0]
                                            .description!,
                                    fields: [
                                        {
                                            name: `Reason from ${
                                                anonymous
                                                    ? "Anonymous"
                                                    : interaction.user.tag
                                            } at ${this.client.functions.generateTimestamp(
                                                {
                                                    type: "f"
                                                }
                                            )}`,
                                            value:
                                                interaction.options.getString(
                                                    "reason"
                                                ) || "No reason provided."
                                        }
                                    ]
                                })
                            )
                        )
                    )
                );
            } else
                await suggestionMessage.edit(
                    this.client.functions.generatePrimaryMessage(
                        {
                            author: suggestionMessage.embeds[0].author!,
                            title: `Suggestion #${suggestion.suggestionNumber} Implemented`,
                            description:
                                suggestionMessage.embeds[0].description!,
                            fields: [
                                {
                                    name: `Reason from ${
                                        anonymous
                                            ? "Anonymous"
                                            : interaction.user.tag
                                    } at ${this.client.functions.generateTimestamp(
                                        {
                                            type: "f"
                                        }
                                    )}`,
                                    value:
                                        interaction.options.getString(
                                            "reason"
                                        ) || "No reason provided."
                                }
                            ]
                        },
                        suggestionMessage.components
                    )
                );
        } catch (error: any) {
            if (error.code === 10008)
                return this.client.logger.info(
                    `The message for suggestion #${
                        suggestion.suggestionNumber
                    } in ${interaction.guild!.name} [${
                        interaction.guild!.id
                    }] was not found in their current suggestion channel (${
                        suggestionChannel.id
                    }).`
                );
            else if (error.code === 50013)
                return this.client.logger.info(
                    `I don't have enough permissions to fetch messages in the suggestion channel (${
                        suggestionChannel.id
                    }) for ${interaction.guild!.name} [${
                        interaction.guild!.id
                    }]`
                );
            else {
                this.client.logger.error(error);
                const sentryId =
                    await this.client.logger.sentry.captureWithInteraction(
                        error,
                        interaction
                    );

                return interaction.reply(
                    this.client.functions.generateErrorMessage(
                        {
                            title: "An Error Has Occurred",
                            description: `An unexpected error was encountered while running \`${interaction.commandName}\`, my developers have already been notified! Feel free to join my support server in the mean time!`,
                            footer: { text: `Sentry Event ID: ${sentryId} ` }
                        },
                        true
                    )
                );
            }
        }

        return Promise.all([
            interaction.reply(
                this.client.functions.generateSuccessMessage(
                    {
                        title: "Suggestion Implemented",
                        description: `Find the suggestion you implemented [here](${suggestionMessage.url}).`
                    },
                    [],
                    true
                )
            ),
            this.client.mongo
                .db("guilds")
                .collection("dmOnChoiceTurnedOff")
                .findOne({ guildId: interaction.guild!.id })
                .then(entry => {
                    if (entry) return;

                    this.client.mongo
                        .db("users")
                        .collection("dmsDisabled")
                        .findOne({ userId: suggestion.suggesterId })
                        .then(dmsDisabled => {
                            if (dmsDisabled) return;

                            this.client.users
                                .fetch(suggestion.suggesterId)
                                .then(user =>
                                    user
                                        .send(
                                            this.client.functions.generatePrimaryMessage(
                                                {
                                                    author: suggestionMessage
                                                        .embeds[0].author!,
                                                    title: `Suggestion #${suggestion.suggestionNumber} Implemented`,
                                                    url: suggestionMessage.url,
                                                    description:
                                                        suggestionMessage
                                                            .embeds[0]
                                                            .description!,
                                                    fields: [
                                                        {
                                                            name: `Reason from ${
                                                                anonymous
                                                                    ? "Anonymous"
                                                                    : interaction
                                                                          .user
                                                                          .tag
                                                            } at ${this.client.functions.generateTimestamp(
                                                                { type: "f" }
                                                            )}`,
                                                            value:
                                                                interaction.options.getString(
                                                                    "reason"
                                                                ) ||
                                                                "No reason provided."
                                                        }
                                                    ]
                                                },
                                                [
                                                    new MessageActionRow({
                                                        components: [
                                                            new MessageButton({
                                                                label: "Disable DMs",
                                                                customId:
                                                                    "toggleDMs",
                                                                style: "DANGER"
                                                            })
                                                        ]
                                                    })
                                                ]
                                            )
                                        )
                                        .catch(error => {
                                            if (error.code === 50007)
                                                return this.client.logger.info(
                                                    `I tried to DM ${
                                                        user.tag
                                                    } [${
                                                        user.id
                                                    }] because a decision has been made on their suggestion (${
                                                        suggestion.suggestionNumber
                                                    }) in ${
                                                        interaction.guild!.name
                                                    } [${
                                                        interaction.guild!.id
                                                    }] has changed but their DMs are closed!`
                                                );

                                            this.client.logger.error(error);
                                            this.client.logger.sentry.captureWithInteraction(
                                                error,
                                                interaction
                                            );
                                        })
                                );
                        });
                }),
            this.client.mongo
                .db("guilds")
                .collection("dmAllUsersOnChoice")
                .findOne({ guildId: interaction.guild!.id })
                .then(entry => {
                    if (!entry) return;

                    let userIds: Snowflake[] = [];

                    Object.values(suggestion.votes).forEach(votes => {
                        userIds = userIds.concat(votes as Snowflake[]);
                    });

                    userIds.filter(userId => userId !== suggestion.suggesterId);

                    return Promise.all(
                        userIds.map(userId => this.client.users.fetch(userId))
                    ).then(users => {
                        return Promise.all(
                            users.map(user =>
                                this.client.mongo
                                    .db("users")
                                    .collection("dmsDisabled")
                                    .findOne({ userId: user.id })
                                    .then(dmsDisabled => {
                                        if (dmsDisabled) return;

                                        return user
                                            .send(
                                                this.client.functions.generatePrimaryMessage(
                                                    {
                                                        author: suggestionMessage
                                                            .embeds[0].author!,
                                                        title: `Suggestion #${suggestion.suggestionNumber} Implemented`,
                                                        url: suggestionMessage.url,
                                                        description:
                                                            suggestionMessage
                                                                .embeds[0]
                                                                .description!,
                                                        fields: [
                                                            {
                                                                name: `Reason from ${
                                                                    anonymous
                                                                        ? "Anonymous"
                                                                        : interaction
                                                                              .user
                                                                              .tag
                                                                } at ${this.client.functions.generateTimestamp(
                                                                    {
                                                                        type: "f"
                                                                    }
                                                                )}`,
                                                                value:
                                                                    interaction.options.getString(
                                                                        "reason"
                                                                    ) ||
                                                                    "No reason provided."
                                                            }
                                                        ]
                                                    },
                                                    [
                                                        new MessageActionRow({
                                                            components: [
                                                                new MessageButton(
                                                                    {
                                                                        label: "Disable DMs",
                                                                        customId:
                                                                            "toggleDMs",
                                                                        style: "DANGER"
                                                                    }
                                                                )
                                                            ]
                                                        })
                                                    ]
                                                )
                                            )
                                            .catch(error => {
                                                if (error.code === 50007)
                                                    return this.client.logger.info(
                                                        `I tried to DM ${
                                                            user.tag
                                                        } [${
                                                            user.id
                                                        }] because a desicion has been made on the suggestion (${
                                                            suggestion.suggestionNumber
                                                        }) they voted on in ${
                                                            interaction.guild!
                                                                .name
                                                        } [${
                                                            interaction.guild!
                                                                .id
                                                        }] has changed but their DMs are closed!`
                                                    );

                                                this.client.logger.error(error);
                                                this.client.logger.sentry.captureWithInteraction(
                                                    error,
                                                    interaction
                                                );
                                            });
                                    })
                            )
                        );
                    });
                }),
            this.client.mongo
                .db("guilds")
                .collection("suggestionLogChannels")
                .findOne({ guildId: interaction.guild!.id })
                .then(entry => {
                    if (!entry || (!entry.type.all && !entry.type.implemented))
                        return;

                    const suggestionLogChannels = [
                        this.client.channels.cache.get(entry.type.all || ""),
                        this.client.channels.cache.get(
                            entry.type.implemented || ""
                        )
                    ].filter(Boolean) as Array<TextChannel | null>;

                    if (!suggestionLogChannels.length) return;

                    return Promise.all([
                        suggestionLogChannels.map(channel =>
                            (channel as TextChannel).send(
                                this.client.functions.generatePrimaryMessage({
                                    author: suggestionMessage.embeds[0].author!,
                                    title: `Suggestion #${suggestion.suggestionNumber} Implemented`,
                                    url: suggestionMessage.url,
                                    description:
                                        suggestionMessage.embeds[0]
                                            .description!,
                                    fields: [
                                        {
                                            name: `Reason from ${
                                                interaction.user.tag
                                            } at ${this.client.functions.generateTimestamp(
                                                { type: "f" }
                                            )}`,
                                            value:
                                                interaction.options.getString(
                                                    "reason"
                                                ) || "No reason provided."
                                        }
                                    ]
                                })
                            )
                        )
                    ]);
                }),
            new Promise(() => {
                if (!deleteOnDecision)
                    suggestionDecisionChannels.map(channel =>
                        (channel as TextChannel).send(
                            this.client.functions.generatePrimaryMessage({
                                author: suggestionMessage.embeds[0].author!,
                                title: `Suggestion #${suggestion.suggestionNumber} Approved`,
                                description:
                                    suggestionMessage.embeds[0].description!,
                                fields: [
                                    {
                                        name: `Reason from ${
                                            anonymous
                                                ? "Anonymous"
                                                : interaction.user.tag
                                        } at ${this.client.functions.generateTimestamp(
                                            {
                                                type: "f"
                                            }
                                        )}`,
                                        value:
                                            interaction.options.getString(
                                                "reason"
                                            ) || "No reason provided."
                                    }
                                ]
                            })
                        )
                    );
            })
        ]);
    }
}
