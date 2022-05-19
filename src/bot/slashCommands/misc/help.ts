import {
    CommandInteraction,
    MessageActionRow,
    MessageButton
} from "discord.js";
import SlashCommand from "../../../../lib/classes/SlashCommand.js";
import BetterClient from "../../../../lib/extensions/BetterClient.js";

export default class Help extends SlashCommand {
    constructor(client: BetterClient) {
        super("help", client, {
            description: `Get help with ${client.config.botName}.`
        });
    }

    override async run(interaction: CommandInteraction) {
        return interaction.reply(
            this.client.functions.generatePrimaryMessage(
                {
                    title: "Astro",
                    description: `Astro is an advanced and very customizable Discord suggestion bot.\n\nAstro is currently in ${this.client.cachedStats.guilds.toLocaleString()} guilds with ${this.client.cachedStats.users.toLocaleString()} users!`,
                    footer: {
                        text: `Astro v${
                            process.env.NODE_ENV === "development"
                                ? `${this.client.config.version}-dev`
                                : this.client.config.version
                        }`
                    }
                },
                [
                    new MessageActionRow({
                        components: [
                            new MessageButton({
                                label: "Invite Me",
                                url: this.client.config.minimalInvite,
                                style: "LINK"
                            }),
                            new MessageButton({
                                label: "Support Server",
                                url: this.client.config.supportServer,
                                style: "LINK"
                            }),
                            new MessageButton({
                                label: "GitHub",
                                url: this.client.config.gitHub,
                                style: "LINK"
                            })
                        ]
                    })
                ]
            )
        );
    }
}
