// The case of the file name is just to signify that
// this is listening to an event directly from the gateway

import {
  ComponentInteraction,
  ComponentType,
  Interaction,
} from "@fire/lib/interfaces/interactions";
import { ComponentMessage } from "@fire/lib/extensions/componentmessage";
import { FireGuild } from "@fire/lib/extensions/guild";
import { constants } from "@fire/lib/util/constants";
import { Listener } from "@fire/lib/util/listener";
import { Scope } from "@sentry/node";

const { emojis } = constants;

export default class InteractionCreate extends Listener {
  constructor() {
    super("INTERACTION_CREATE", {
      emitter: "gateway",
      event: "INTERACTION_CREATE",
    });
  }

  async exec(interaction: Interaction) {
    if (!interaction) return;
    if (this.blacklistCheck(interaction)) return;
    // slash command, use client interaction event
    else if (interaction.type == 2) return;
    else if (interaction.type == 3)
      return await this.handleComponent(interaction);
    else {
      const haste = await this.client.util.haste(
        JSON.stringify(interaction, null, 4),
        false,
        "json"
      );
      this.client.sentry.captureEvent({
        level: this.client.sentry.Severity.fromString("warning"),
        message: "Unknown Interaction Type",
        timestamp: +new Date(),
        extra: {
          body: haste,
        },
      });
    }
  }

  async handleComponent(component: ComponentInteraction) {
    try {
      // should be cached if in guild or fetch if dm channel
      await this.client.channels.fetch(component.channel_id).catch(() => {});
      const message = new ComponentMessage(this.client, component);
      if (!message.custom_id.startsWith("!")) await message.channel.ack();
      else message.custom_id = message.custom_id.slice(1);
      if (message.type == ComponentType.BUTTON)
        this.client.emit("button", message);
      else if (message.type == ComponentType.SELECT)
        this.client.emit("dropdown", message);
    } catch (error) {
      await this.callbackError(component, error).catch(
        async () => await this.webhookError(component, error).catch(() => {})
      );
      if (
        typeof this.client.sentry != "undefined" &&
        error.message != "Component checks failed, potential mitm/selfbot?"
      ) {
        const sentry = this.client.sentry;
        sentry.setExtras({
          component: JSON.stringify(component.data),
          member: component.member
            ? `${component.member.user.username}#${component.member.user.discriminator}`
            : `${component.user.username}#${component.user.discriminator}`,
          channel_id: component.channel_id,
          guild_id: component.guild_id,
          env: process.env.NODE_ENV,
        });
        sentry.captureException(error);
        sentry.configureScope((scope: Scope) => {
          scope.setUser(null);
          scope.setExtras(null);
        });
      }
    }
  }

  async callbackError(interaction: Interaction, error: Error) {
    return await this.client.req
      .interactions(interaction.id)(interaction.token)
      .callback.post({
        data: {
          type: 4,
          data: {
            content: `${emojis.error} An error occured while trying to handle this interaction that may be caused by being in DMs or the bot not being present...

If this is a slash command, try inviting the bot to a server (<${this.client.config.inviteLink}>) if you haven't already and try again.

Error Message: ${error.message}`,
            flags: 64,
          },
        },
      });
  }

  async webhookError(interaction: Interaction, error: Error) {
    return await this.client.req
      .webhooks(this.client.user.id)(interaction.token)
      .post({
        data: {
          content: `${emojis.error} An error occured while trying to handle this interaction that may be caused by being in DMs or the bot not being present...

If this is a slash command and the bot is not present, try inviting the bot (<${this.client.config.inviteLink}>) and try again.

Error Message: ${error.message}`,
        },
      });
  }

  blacklistCheck(interaction: Interaction) {
    const guild = interaction.guild_id;
    const user = interaction.user
      ? interaction.user.id
      : interaction.member.user.id;

    return this.client.util.isBlacklisted(
      user,
      this.client.guilds.cache.get(guild) as FireGuild
    );
  }
}
