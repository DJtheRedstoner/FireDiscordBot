import { MessageEmbed, Permissions, ThreadChannel } from "discord.js";
import { FireGuild } from "@fire/lib/extensions/guild";
import { humanize } from "@fire/lib/util/constants";
import { Listener } from "@fire/lib/util/listener";
import * as moment from "moment";

// Totally not copied from channelCreate lol
export default class ThreadCreate extends Listener {
  constructor() {
    super("threadCreate", {
      emitter: "client",
      event: "threadCreate",
    });
  }

  async exec(channel: ThreadChannel) {
    const guild = channel.guild as FireGuild,
      language = guild.language;
    // const muteRole = guild.muteRole;
    // let muteFail = false;
    // if (muteRole)
    //   await channel
    //     .updateOverwrite(
    //       muteRole,
    //       {
    //         USE_PRIVATE_THREADS: false,
    //         USE_PUBLIC_THREADS: false,
    //         SEND_MESSAGES: false,
    //         ADD_REACTIONS: false,
    //         SPEAK: false,
    //       },
    //       {
    //         reason: guild.language.get("MUTE_ROLE_CREATE_REASON") as string,
    //         type: 0,
    //       }
    //     )
    //     .catch(() => (muteFail = true));

    // if (guild.permRoles.size) {
    //   for (const [role, perms] of guild.permRoles) {
    //     if (
    //       !channel.permissionsFor(guild.me).has(Permissions.FLAGS.MANAGE_ROLES)
    //     )
    //       continue;
    //     await channel
    //       .overwritePermissions(
    //         [
    //           ...channel.permissionOverwrites.array().filter(
    //             // ensure the overwrites below are used instead
    //             (overwrite) => overwrite.id != role
    //           ),
    //           {
    //             allow: perms.allow,
    //             deny: perms.deny,
    //             id: role,
    //             type: "role",
    //           },
    //         ],
    //         guild.language.get("PERMROLES_REASON") as string
    //       )
    //       .catch(() => {});
    //   }
    // }

    const owner = await guild.members.fetch(channel.ownerID).catch(() => {});

    if (guild.settings.has("log.action")) {
      const now = moment();
      const autoArchiveAt = new Date(
        +new Date() + channel.autoArchiveDuration * 60000
      );
      const friendlyArchived =
        humanize(moment(autoArchiveAt).diff(now), language.id.split("-")[0]) +
        (now.isBefore(autoArchiveAt)
          ? language.get("FROM_NOW")
          : language.get("AGO"));
      const embed = new MessageEmbed()
        .setColor("#2ECC71")
        .setTimestamp(channel.createdAt)
        .setAuthor(
          language.get("THREADCREATELOG_AUTHOR", guild.name),
          guild.iconURL({ size: 2048, format: "png", dynamic: true })
        )
        .addField(language.get("NAME"), channel.name)
        .addField(language.get("PARENT"), channel.parent.toString())
        .addField(
          language.get("ARCHIVE_AT"),
          `${friendlyArchived} (${autoArchiveAt.toLocaleString(language.id)})`
        )
        .addField(
          language.get("CREATED_BY"),
          owner ? `${owner} (${owner.id})` : channel.ownerID
        );
      if (channel.parent.messages.cache.has(channel.id))
        embed.addField(
          language.get("THREAD_MESSAGE"),
          `[${language.get("CLICK_TO_VIEW")}](${
            channel.parent.messages.cache.get(channel.id).url
          })`
        );
      // if (muteFail)
      //   embed.addField(
      //     language.get("WARNING"),
      //     language.get("CHANNELCREATELOG_MUTE_PERMS_FAIL")
      //   );
      // if (channel.permissionOverwrites.size > 1) {
      //   const canView = channel.permissionOverwrites
      //     .filter((overwrite) =>
      //       overwrite.allow.has(Permissions.FLAGS.VIEW_CHANNEL)
      //     )
      //     .map((overwrite) => overwrite.id);
      //   const roles = [
      //     ...canView
      //       .map((id) => guild.roles.cache.get(id))
      //       .filter((role) => !!role),
      //     ...guild.roles.cache
      //       .filter(
      //         (role) =>
      //           role.permissions.has(Permissions.FLAGS.ADMINISTRATOR) &&
      //           !canView.find((id) => id == role.id)
      //       )
      //       .values(),
      //   ];
      //   const memberIds = canView.filter(
      //     (id) => !roles.find((role) => role.id == id)
      //   );
      //   // owner can always see
      //   memberIds.push(guild.ownerID);
      //   const members: string[] = memberIds.length
      //     ? await guild.members
      //         .fetch({ user: memberIds })
      //         .then((found) => found.map((member) => member.toString()))
      //         .catch(() => [])
      //     : [];
      //   const viewers = [...roles.map((role) => role.toString()), ...members];
      //   embed.addField(language.get("VIEWABLE_BY"), `${viewers.join(" - ")}`);
      // }

      // unsure on whether or not I'll make thread events separate
      // for now they will follow their channel_ counterparts
      await guild.actionLog(embed, "channel_create").catch(() => {});
    }
  }
}
