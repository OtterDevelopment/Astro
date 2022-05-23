import {
    ButtonInteraction,
    MessageActionRow,
    MessageButton,
    MessageEmbedOptions,
    TextChannel
} from "discord.js";
import Button from "../../../../lib/classes/Button.js";
import BetterClient from "../../../../lib/extensions/BetterClient.js";
import BetterMessage from "../../../../lib/extensions/BetterMessage.js";

export default class ReviewSuggestion extends Button {
    constructor(client: BetterClient) {
        super("reviewSuggestion", client);
    }

    override async run(interaction: ButtonInteraction) {
        const [guildId, suggestionNumber, type] = interaction.customId
            .split("-")
            .splice(1);

        const [suggestion, autoThread] = await Promise.all([
            this.client.mongo
                .db("suggestions")
                .collection(guildId)
                .findOne({
                    suggestionNumber: parseInt(suggestionNumber, 10)
                }),
            this.client.mongo
                .db("guilds")
                .collection("autoThreadEnabled")
                .findOne({ guildId: interaction.guild!.id })
        ]);

        if (!suggestion)
            return interaction.reply(
                this.client.functions.generateErrorMessage(
                    {
                        title: "Suggestion Not Found",
                        description: `The suggestion you're trying to ${type} doesn't exist in the database for some reason!`
                    },
                    true
                )
            );

        // eslint-disable-next-line prefer-object-spread
        const reviewEmbed = Object.assign({}, interaction.message!.embeds[0]!);

        reviewEmbed.footer = {
            text: `Review ${type === "approve" ? "approved" : "denied"} by ${
                interaction.user.tag
            }`,
            icon_url: interaction.user.displayAvatarURL()
        };
        reviewEmbed.timestamp = Date.now();
        reviewEmbed.color = parseInt(
            type === "approve"
                ? this.client.config.colors.success
                : this.client.config.colors.error,
            16
        );

        await (interaction.message as BetterMessage).edit({
            embeds: [reviewEmbed],
            components: []
        });

        let suggestionMessage: BetterMessage | null = null;

        if (type === "approve") {
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

            const customEmojis = await this.client.mongo
                .db("guilds")
                .collection("customEmojis")
                .findOne({ guildId: interaction.guild!.id });

            suggestionMessage = await suggestionChannel.send({
                embeds: interaction.message!.embeds,
                content: interaction.message!.content.length
                    ? interaction.message!.content
                    : null,
                components: [
                    new MessageActionRow({
                        components: [
                            new MessageButton({
                                label:
                                    suggestion.votes.up?.length.toString() ||
                                    "0",
                                emoji: customEmojis?.upvote || "👍",
                                style: "SUCCESS",
                                customId: `voteSuggestion-${
                                    interaction.guild!.id
                                }-${suggestionNumber}-up`
                            }),
                            new MessageButton({
                                label:
                                    suggestion.votes.down?.length.toString() ||
                                    "0",
                                emoji: customEmojis?.downvote || "👎",
                                style: "DANGER",
                                customId: `voteSuggestion-${
                                    interaction.guild!.id
                                }-${suggestionNumber}-down`
                            })
                        ]
                    })
                ]
            });
        }

        let payload: MessageEmbedOptions = {
            title: `Suggestion ${type === "approve" ? "Approved" : "Denied"}`,
            description: `Suggestion #${suggestionNumber} has been ${
                type === "approve" ? "approved" : "denied"
            }${
                type === "approve"
                    ? `, find it [here](${suggestionMessage!.url})`
                    : ""
            }!`
        };

        return Promise.all(
            (
                [
                    interaction.reply(
                        type === "approve"
                            ? this.client.functions.generateSuccessMessage(
                                  payload,
                                  [],
                                  true
                              )
                            : this.client.functions.generateErrorMessage(
                                  payload
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

                                    payload = {
                                        title: `Suggestion ${
                                            type === "approve"
                                                ? "Approved"
                                                : "Denied"
                                        }`,
                                        description: `Suggestion #${suggestionNumber}, which you created, has been ${
                                            type === "approve"
                                                ? "approved"
                                                : "denied"
                                        }${
                                            type === "approve"
                                                ? `, find it [here](${
                                                      suggestionMessage!.url
                                                  })`
                                                : ""
                                        }!`
                                    };

                                    this.client.users
                                        .fetch(suggestion.suggesterId)
                                        .then(user =>
                                            user
                                                .send(
                                                    type === "approve"
                                                        ? this.client.functions.generateSuccessMessage(
                                                              payload,
                                                              [],
                                                              true
                                                          )
                                                        : this.client.functions.generateErrorMessage(
                                                              payload
                                                          )
                                                )
                                                .catch(error => {
                                                    if (error.code === 50007)
                                                        return this.client.logger.info(
                                                            `I tried to DM ${
                                                                user.tag
                                                            } [${
                                                                user.id
                                                            }] because their suggestion has been reviewed (${
                                                                suggestion.suggestionNumber
                                                            }) in ${
                                                                interaction.guild!
                                                                    .name
                                                            } [${
                                                                interaction.guild!
                                                                    .id
                                                            }] but they're DMs are closed!`
                                                        );

                                                    this.client.logger.error(
                                                        error
                                                    );
                                                    this.client.logger.sentry.captureWithInteraction(
                                                        error,
                                                        interaction
                                                    );
                                                })
                                        );
                                });
                        })
                ] as Array<Promise<any>>
            ).concat(
                type === "approve"
                    ? [
                          this.client.mongo
                              .db("suggestions")
                              .collection(guildId)
                              .updateOne(
                                  {
                                      suggestionNumber: parseInt(
                                          suggestionNumber,
                                          10
                                      )
                                  },
                                  { $set: { messageId: suggestionMessage!.id } }
                              ),
                          new Promise(() => {
                              if (autoThread)
                                  suggestionMessage!.startThread({
                                      name: `Suggestion ${
                                          suggestionNumber + 1
                                      }`,
                                      reason: "Automatic threads on suggestions are enabled within this server, turn this off by running /config auto_thread!"
                                  });
                          })
                      ]
                    : []
            )
        );
    }
}
