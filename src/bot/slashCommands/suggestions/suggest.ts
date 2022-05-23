import {
    CommandInteraction,
    MessageActionRow,
    MessageAttachment,
    MessageButton,
    TextChannel
} from "discord.js";
import SlashCommand from "../../../../lib/classes/SlashCommand.js";
import BetterClient from "../../../../lib/extensions/BetterClient.js";
import BetterMessage from "../../../../lib/extensions/BetterMessage.js";

export default class Suggest extends SlashCommand {
    constructor(client: BetterClient) {
        super("suggest", client, {
            description: "Suggest something to the server.",
            guildOnly: true,
            options: [
                {
                    name: "suggestion",
                    description: "Your suggestion.",
                    required: true,
                    type: "STRING"
                }
            ]
        });
    }

    override async run(interaction: CommandInteraction) {
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

        const [
            suggestionNumber,
            dontAttachImages,
            autoThread,
            customEmojis,
            anonymousSuggestionsEnabled,
            suggestionRole,
            suggestionReviewChannelDocument
        ] = await Promise.all([
            this.client.mongo
                .db("suggestions")
                .collection(interaction.guild!.id)
                .countDocuments({}),
            this.client.mongo
                .db("guilds")
                .collection("dontAttachImages")
                .findOne({ guildId: interaction.guild!.id }),
            this.client.mongo
                .db("guilds")
                .collection("autoThreadEnabled")
                .findOne({ guildId: interaction.guild!.id }),
            this.client.mongo
                .db("guilds")
                .collection("customEmojis")
                .findOne({ guildId: interaction.guild!.id }),
            this.client.mongo
                .db("guilds")
                .collection("anonymousSuggestionsEnabled")
                .findOne({ guildId: interaction.guild!.id }),
            this.client.mongo
                .db("guilds")
                .collection("suggestionRoles")
                .findOne({ guildId: interaction.guild!.id }),
            this.client.mongo
                .db("guilds")
                .collection("suggestionReviewChannels")
                .findOne({ guildId: interaction.guild!.id })
        ]);

        const suggestionReviewChannel = interaction.guild!.channels.cache.get(
            suggestionReviewChannelDocument?.channelId
        ) as TextChannel | null;

        let suggestionMessage: BetterMessage;

        try {
            suggestionMessage = await (
                suggestionReviewChannel || suggestionChannel
            ).send({
                ...this.client.functions.generatePrimaryMessage(
                    {
                        author: anonymousSuggestionsEnabled
                            ? {
                                  name: "Anonymous",
                                  iconURL:
                                      "https://images-ext-1.discordapp.net/external/goXavQ0zzaSkv9RaOMTZEOa7Gs4a8LfOA8oGcE9XWmw/https/i.imgur.com/y43mMnP.png"
                              }
                            : {
                                  name: interaction.user.tag,
                                  iconURL: !dontAttachImages
                                      ? (
                                            await this.client.functions.uploadToMediaChannel(
                                                [
                                                    new MessageAttachment(
                                                        interaction.user.displayAvatarURL(
                                                            {
                                                                dynamic: true
                                                            }
                                                        ),
                                                        `userAvatar.${
                                                            interaction.user
                                                                .displayAvatarURL(
                                                                    {
                                                                        dynamic:
                                                                            true
                                                                    }
                                                                )
                                                                .endsWith(
                                                                    ".gif"
                                                                )
                                                                ? "gif"
                                                                : "png"
                                                        }`
                                                    )
                                                ]
                                            )
                                        ).first()!.url
                                      : interaction.user.displayAvatarURL({
                                            dynamic: true
                                        })
                              },
                        title: `Suggestion #${suggestionNumber + 1}`,
                        description:
                            interaction.options.getString("suggestion")!
                    },
                    suggestionReviewChannel
                        ? [
                              new MessageActionRow({
                                  components: [
                                      new MessageButton({
                                          label: "Approve",
                                          style: "SUCCESS",
                                          customId: `reviewSuggestion-${
                                              interaction.guild!.id
                                          }-${suggestionNumber + 1}-approve`
                                      }),
                                      new MessageButton({
                                          label: "Deny",
                                          style: "DANGER",
                                          customId: `reviewSuggestion-${
                                              interaction.guild!.id
                                          }-${suggestionNumber + 1}-deny`
                                      })
                                  ]
                              })
                          ]
                        : [
                              new MessageActionRow({
                                  components: [
                                      new MessageButton({
                                          label: "0",
                                          emoji: customEmojis?.upvote || "👍",
                                          style: "SUCCESS",
                                          customId: `voteSuggestion-${
                                              interaction.guild!.id
                                          }-${suggestionNumber + 1}-up`
                                      }),
                                      new MessageButton({
                                          label: "0",
                                          emoji: customEmojis?.downvote || "👎",
                                          style: "DANGER",
                                          customId: `voteSuggestion-${
                                              interaction.guild!.id
                                          }-${suggestionNumber + 1}-down`
                                      })
                                  ]
                              })
                          ]
                ),
                content:
                    suggestionRole && !suggestionReviewChannel
                        ? `<@&${suggestionRole.roleId}>`
                        : null
            });
        } catch (error: any) {
            if (error.code === 50013) {
                this.client.logger.info(
                    `I don't have enough permissions to send messages into the suggestion channel (${
                        suggestionChannel.id
                    }) for ${interaction.guild!.name} [${
                        interaction.guild!.id
                    }]`
                );
                return interaction.reply(
                    this.client.functions.generateErrorMessage({
                        title: "Missing Permissions",
                        description: `I don't have enough permissions to send messages into the suggestion channel. ${
                            interaction.memberPermissions?.has("MANAGE_GUILD")
                                ? "Make sure I have the `SEND_MESSAGES` permission and try again."
                                : "Please contact a server manager to have them fix this."
                        }`
                    })
                );
            }
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

        return Promise.all([
            this.client.mongo
                .db("suggestions")
                .collection(interaction.guild!.id)
                .insertOne({
                    suggestionNumber: suggestionNumber + 1,
                    messageId: suggestionMessage.id,
                    suggesterId: interaction.user.id,
                    votes: { up: [], down: [] }
                }),
            interaction.reply(
                this.client.functions.generateSuccessMessage(
                    {
                        title: "Suggestion Sent",
                        description:
                            suggestionMessage.channelId ===
                            suggestionReviewChannelDocument?.channelId
                                ? "Your suggestion has been submitted for reviewal. You will be notified when it has been reviewed if you haven't disabled DMs."
                                : `Your suggestion has been sent to the suggestion channel, you can view it [here](${
                                      suggestionMessage!.url
                                  }).`
                    },
                    [],
                    true
                )
            ),
            new Promise(() => {
                if (autoThread)
                    suggestionMessage.startThread({
                        name: `Suggestion ${suggestionNumber + 1}`,
                        reason: "Automatic threads on suggestions are enabled within this server, turn this off by running /config auto_thread!"
                    });
            })
        ]);
    }
}
