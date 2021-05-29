import { SlashCommandMessage } from "@fire/lib/extensions/slashcommandmessage";
import {
  APIComponent,
  APIComponentSelect,
  ButtonStyle,
  ComponentType,
} from "@fire/lib/interfaces/interactions";
import { ComponentMessage } from "@fire/lib/extensions/componentmessage";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { MessageEmbed, Permissions, Role } from "discord.js";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireGuild } from "@fire/lib/extensions/guild";
import { constants } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

const {
  regexes: { unicodeEmoji },
} = constants;

export default class Rank extends Command {
  constructor() {
    super("rank", {
      description: (language: Language) =>
        language.get("RANK_COMMAND_DESCRIPTION"),
      clientPermissions: [
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.MANAGE_ROLES,
        Permissions.FLAGS.EMBED_LINKS,
      ],
      restrictTo: "guild",
      args: [
        {
          id: "role",
          type: "roleSilent",
          readableType: "role",
          required: false,
          default: null,
        },
      ],
      aliases: [
        "ranks",
        "joinroles",
        "joinableroles",
        "selfroles",
        "selfranks",
      ],
      enableSlashCommand: true,
      ephemeral: true,
      premium: true,
    });
  }

  async exec(message: FireMessage, args: { role?: Role }) {
    let roles: string[] | Role[] = message.guild.settings
      .get<string[]>("utils.ranks", [])
      .filter((id) => message.guild.roles.cache.has(id));
    if (message.guild.settings.get<string[]>("utils.ranks", []) != roles)
      message.guild.settings.set<string[]>("utils.ranks", roles);
    if (!roles.length) return await message.error("RANKS_NONE_FOUND");
    roles = roles.map((id) => message.guild.roles.cache.get(id) as Role);

    if (!args.role) {
      const isCached =
        message.guild.members.cache.size / message.guild.memberCount;
      roles = roles.map((role) =>
        isCached > 0.98
          ? (message.language.get(
              "RANKS_INFO",
              role.toString(),
              role.members.size.toLocaleString(message.language.id)
            ) as string)
          : `> ${role}`
      );
      const embed = new MessageEmbed()
        .setColor(message.member?.displayHexColor || "#ffffff")
        .setTimestamp()
        .setDescription(roles.join("\n"))
        .setAuthor(
          message.language.get("RANKS_AUTHOR", message.guild.toString()),
          message.guild.icon
            ? (message.guild.iconURL({
                size: 2048,
                format: "png",
                dynamic: true,
              }) as string)
            : undefined
        );
      // use buttons only for a single row
      if (message.guild.hasExperiment(1621199146, 1) && roles.length <= 5) {
        delete embed.description;
        const components = Rank.getRankButtons(message.guild, message.member);
        return message instanceof SlashCommandMessage
          ? message.channel.send(embed, {
              components: components as APIComponent[],
            })
          : await ComponentMessage.sendWithComponents(message.channel, embed, {
              components: components as APIComponent[],
            });
        // use dropdowns if enabled & there's more than 5 ranks
      } else if (message.guild.hasExperiment(1685450372, 1)) {
        delete embed.description;
        const dropdown = Rank.getRankDropdown(message.guild);
        return message instanceof SlashCommandMessage
          ? message.channel.send(embed, {
              components: dropdown,
            })
          : await ComponentMessage.sendWithComponents(message.channel, embed, {
              components: dropdown,
            });
      } else return await message.channel.send(embed);
    }

    if (roles.includes(args.role)) {
      if (args.role.id == "595626786549792793")
        return await message.error("SK1ER_BETA_MOVED");
      message.member?.roles?.cache?.has(args.role.id)
        ? await message.member?.roles
            ?.remove(
              args.role,
              message.guild.language.get("RANKS_LEAVE_REASON") as string
            )
            .catch(() => {})
            .then(() => message.success("RANKS_LEFT_RANK", args.role.name))
        : await message.member?.roles
            ?.add(
              args.role,
              message.guild.language.get("RANKS_JOIN_REASON") as string
            )
            .catch(() => {})
            .then(() => message.success("RANKS_JOIN_RANK", args.role.name));
    } else return await message.error("RANKS_INVALID_ROLE");
  }

  static getRankButtons(
    guild: FireGuild,
    member: FireMember,
    useState: boolean = true
  ) {
    let roles: string[] | Role[] = guild.settings
      .get<string[]>("utils.ranks", [])
      .filter((id) => guild.roles.cache.has(id));
    if (guild.settings.get<string[]>("utils.ranks", []) != roles)
      guild.settings.set<string[]>("utils.ranks", roles);
    if (!roles.length) return [];
    roles = roles.map((id) => guild.roles.cache.get(id) as Role);
    const components = [{ type: ComponentType.ACTION_ROW, components: [] }];
    for (const role of roles) {
      let name = "@" + role.name;
      let emoji: string;
      const hasEmoji = unicodeEmoji.exec(role.name);
      unicodeEmoji.lastIndex = 0;
      if (hasEmoji?.length && role.name.startsWith(hasEmoji[0])) {
        emoji = hasEmoji[0];
        name = "@" + role.name.slice(hasEmoji[0].length).trim();
      }
      if (
        components[components.length - 1].components.length >= 5 &&
        components.length < 5
      )
        components.push({ type: ComponentType.ACTION_ROW, components: [] });
      components[components.length - 1].components.push({
        type: ComponentType.BUTTON,
        style: useState
          ? member.roles.cache.has(role.id)
            ? ButtonStyle.DESTRUCTIVE
            : ButtonStyle.SUCCESS
          : ButtonStyle.PRIMARY,
        emoji: emoji ? { name: emoji } : null,
        custom_id: `!rank:${member?.id}:${role.id}`,
        label: name,
      });
    }
    return components;
  }

  static getRankDropdown(guild: FireGuild) {
    let roles: string[] | Role[] = guild.settings
      .get<string[]>("utils.ranks", [])
      .filter((id) => guild.roles.cache.has(id));
    if (guild.settings.get<string[]>("utils.ranks", []) != roles)
      guild.settings.set<string[]>("utils.ranks", roles);
    if (!roles.length) return [];
    roles = roles.map((id) => guild.roles.cache.get(id) as Role);
    const dropdown = {
      placeholder: guild.language.get("RANKS_SELECT_PLACEHOLDER"),
      custom_id: `rank:${guild.id}`,
      type: ComponentType.SELECT,
      max_values: roles.length,
      options: [],
    } as APIComponentSelect;
    for (const role of roles) {
      if (dropdown.options.length >= 25) break;
      let name = "@" + role.name;
      let emoji: string;
      const hasEmoji = unicodeEmoji.exec(role.name);
      unicodeEmoji.lastIndex = 0;
      if (hasEmoji?.length && role.name.startsWith(hasEmoji[0])) {
        emoji = hasEmoji[0];
        name = "@" + role.name.slice(hasEmoji[0].length).trim();
      }
      dropdown.options.push({
        emoji: emoji ? { name: emoji } : null,
        default: false,
        value: role.id,
        label: name,
      });
    }
    return guild.client.util.validateComponents([
      {
        type: ComponentType.ACTION_ROW,
        components: [dropdown],
      },
    ]);
  }
}
