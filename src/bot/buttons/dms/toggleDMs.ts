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

        if (exists)
            return Promise.all([
                this.client.mongo
                    .db("users")
                    .collection("dmsDisabled")
                    .deleteOne({ userId: interaction.user.id }),
                message.edit({
                    components: [
                        new MessageActionRow({
                            components: [
                                new MessageButton({
                                    label: "Disable DMs",
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
                            title: "DMs Enabled",
                            description:
                                "You will now receive DMs when the outcome of a decision is changed!"
                        },
                        [],
                        true
                    )
                )
            ]);

        return Promise.all([
            this.client.mongo
                .db("users")
                .collection("dmsDisabled")
                .insertOne({ userId: interaction.user.id }),
            message.edit({
                components: [
                    new MessageActionRow({
                        components: [
                            new MessageButton({
                                label: "Enable DMs",
                                customId: "toggleDMs",
                                style: "SUCCESS"
                            })
                        ]
                    })
                ]
            }),
            interaction.reply(
                this.client.functions.generateSuccessMessage(
                    {
                        title: "DMs Disabled",
                        description:
                            "You will no longer receive DMs when the outcome of a decision is changed!"
                    },
                    [],
                    true
                )
            )
        ]);
    }
}
