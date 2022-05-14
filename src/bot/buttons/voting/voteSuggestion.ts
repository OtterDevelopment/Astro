import { ButtonInteraction, MessageActionRow, MessageButton } from "discord.js";
import Button from "../../../../lib/classes/Button.js";
import BetterClient from "../../../../lib/extensions/BetterClient.js";
import BetterMessage from "../../../../lib/extensions/BetterMessage.js";

export default class VoteSuggestion extends Button {
    constructor(client: BetterClient) {
        super("voteSuggestion", client);
    }

    override async run(interaction: ButtonInteraction) {
        const [guildId, suggestionNumber, vote] = interaction.customId
            .split("-")
            .splice(1);

        await this.client.mongo
            .db("suggestions")
            .collection(guildId)
            .updateOne(
                { suggestionNumber: parseInt(suggestionNumber, 10) },
                {
                    $addToSet: { [`votes.${vote}`]: interaction.user.id },
                    $pull: {
                        [`votes.${vote === "up" ? "down" : "up"}`]:
                            interaction.user.id
                    }
                }
            );

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
                        description:
                            "The suggestion you're trying to vote on doesn't exist!"
                    },
                    true
                )
            );

        const customEmojis = await this.client.mongo
            .db("guilds")
            .collection("customEmojis")
            .findOne({ guildId: interaction.guild!.id });

        return Promise.all([
            (interaction.message as BetterMessage).edit({
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
            }),
            interaction.reply(
                this.client.functions.generateSuccessMessage(
                    {
                        title: "Vote Counted",
                        description: `Your ${vote}vote has been counted.`
                    },
                    [],
                    true
                )
            )
        ]);
    }
}
