import {
    ButtonInteraction,
    GuildMember,
    InteractionCollector,
    MessageActionRow,
    MessageButton,
    MessageEmbedOptions,
    Modal,
    ModalSubmitInteraction,
    TextChannel,
    TextInputComponent
} from "discord.js";
import Button from "../../../../lib/classes/Button.js";
import BetterClient from "../../../../lib/extensions/BetterClient.js";
import BetterMessage from "../../../../lib/extensions/BetterMessage.js";

export default class ReviewSuggestion extends Button {
    constructor(client: BetterClient) {
        super("reviewSuggestion", client);
    }

    public override async preCheck(
        interaction: ButtonInteraction
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
                        "You don't have enough permissions to review this suggestion!"
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
                    "You don't have enough permissions to review this suggestion!"
            }
        ];
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

        let reason: string | null;
        let modalInteraction: ModalSubmitInteraction;

        const interactionCollector = new InteractionCollector(this.client, {
            channel: interaction.channel!,
            time: 60000 * 5,
            max: 1,
            filter: i =>
                i.user.id === interaction.user.id &&
                i.isModalSubmit() &&
                i.customId === `reviewSuggestion-${suggestionNumber}`
        });

        interactionCollector.on("collect", async i => {
            modalInteraction = i as ModalSubmitInteraction;
            reason = (i as ModalSubmitInteraction).fields.getTextInputValue(
                "input"
            );
        });

        interactionCollector.on("end", async (): Promise<any> => {
            // eslint-disable-next-line prefer-object-spread
            const reviewEmbed = Object.assign(
                {},
                interaction.message!.embeds[0]!
            );

            if (reason)
                reviewEmbed.fields = [
                    ...(reviewEmbed.fields || []),
                    {
                        name: `Reason from ${
                            interaction.user.tag
                        } at ${this.client.functions.generateTimestamp({
                            type: "f"
                        })}`,
                        inline: false,
                        value: reason || "No reason provided."
                    }
                ];
            reviewEmbed.footer = {
                text: `Review ${
                    type === "approve" ? "approved" : "denied"
                } by ${interaction.user.tag}`,
                icon_url: interaction.user.displayAvatarURL()
            };
            reviewEmbed.timestamp = Date.now();
            reviewEmbed.color = parseInt(
                type === "approve"
                    ? this.client.config.colors.success
                    : this.client.config.colors.error,
                16
            );

            if (modalInteraction)
                await modalInteraction.update({
                    embeds: [reviewEmbed],
                    components: []
                });
            else
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
                                interaction.memberPermissions?.has(
                                    "MANAGE_GUILD"
                                )
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
                                interaction.memberPermissions?.has(
                                    "MANAGE_GUILD"
                                )
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
                title: `Suggestion ${
                    type === "approve" ? "Approved" : "Denied"
                }`,
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
                        modalInteraction
                            ? interaction.followUp(
                                  this.client.functions.generateSuccessMessage(
                                      payload,
                                      [],
                                      true
                                  )
                              )
                            : interaction.reply(
                                  this.client.functions.generateSuccessMessage(
                                      payload,
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
                                            }!`,
                                            fields: reason
                                                ? [
                                                      {
                                                          name: `Reason`,
                                                          inline: false,
                                                          value:
                                                              reason ||
                                                              "No reason provided."
                                                      }
                                                  ]
                                                : []
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
                                                        if (
                                                            error.code === 50007
                                                        )
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
                                                                }] but their DMs are closed!`
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
                                      {
                                          $set: {
                                              messageId: suggestionMessage!.id
                                          }
                                      }
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
        });

        if (type !== "approve")
            await interaction.showModal(
                new Modal({
                    title: "Review Suggestion",
                    customId: `reviewSuggestion-${suggestionNumber}`,
                    components: [
                        new MessageActionRow({
                            components: [
                                new TextInputComponent({
                                    customId: "input",
                                    label: "Reason",
                                    style: "PARAGRAPH"
                                })
                            ]
                        })
                    ]
                })
            );
        else {
            interactionCollector.stop();
        }
    }
}
