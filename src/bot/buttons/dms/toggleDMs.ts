import { ButtonInteraction, MessageActionRow, MessageButton } from "discord.js";
import Button from "../../../../lib/classes/Button.js";
import BetterClient from "../../../../lib/extensions/BetterClient.js";
import BetterMessage from "../../../../lib/extensions/BetterMessage.js";

export default class DisableDMs extends Button {
    constructor(client: BetterClient) {
        super("toggleDMs", client);
    }

    override async run(interaction: ButtonInteraction) {
        const exists = await this.client.mongo
            .db("users")
            .collection("dmsDisabled")
            .findOne({ userId: interaction.user.id });

        if (!interaction.user.dmChannel) await interaction.user.createDM();

        const message = (await interaction.user.dmChannel?.messages.fetch(
            interaction.message?.id || ""
        )) as BetterMessage;

        return Promise.all(
            (
                [
                    message.edit({
                        components: [
                            new MessageActionRow({
                                components: [
                                    new MessageButton({
                                        label: exists
                                            ? "Disable DMs"
                                            : "Enable DMs",
                                        customId: "toggleDMs",
                                        style: "DANGER"
                                    })
                                ]
                            })
                        ]
                    }),
                    interaction.reply(
                        this.client.functions.generateSuccessMessage(
                            {
                                title: exists ? "DMs Enabled" : "DMs Disabled",
                                description: `You will ${
                                    exists ? "now" : "no longer"
                                } receive DMs when a decision is made about a suggestion is changed!`
                            },
                            [],
                            true
                        )
                    )
                ] as Array<Promise<any>>
            ).concat(
                exists
                    ? [
                          this.client.mongo
                              .db("users")
                              .collection("dmsDisabled")
                              .deleteOne({ userId: interaction.user.id })
                      ]
                    : []
            )
        );
    }
}
