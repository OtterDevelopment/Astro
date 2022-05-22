import {
    ButtonInteraction,
    MessageActionRow,
    MessageButton,
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

        const suggestion = await this.client.mongo
            .db("suggestions")
            .collection(guildId)
            .findOne({
                suggestionNumber: parseInt(suggestionNumber, 10)
            });

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

        await (interaction.message as BetterMessage).delete();

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

            const message = await suggestionChannel.send({
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

            return Promise.all([
                this.client.mongo
                    .db("suggestions")
                    .collection(guildId)
                    .updateOne(
                        {
                            suggestionNumber: parseInt(suggestionNumber, 10)
                        },
                        { $set: { messageId: message.id } }
                    ),
                interaction.reply(
                    this.client.functions.generateSuccessMessage(
                        {
                            title: `Suggestion Approved`,
                            description: `Suggestion #${suggestionNumber} has been approved, find it [here](${message.url})!`
                        },
                        [],
                        true
                    )
                )
            ]);
        }

        return interaction.reply(
            this.client.functions.generateSuccessMessage(
                {
                    title: `Suggestion Denied`,
                    description: `Suggestion #${suggestionNumber} has been denied!`
                },
                [],
                true
            )
        );
    }
}
