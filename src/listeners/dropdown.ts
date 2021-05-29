import { ComponentMessage } from "@fire/lib/extensions/componentmessage";
import { ComponentType } from "@fire/lib/interfaces/interactions";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { Listener } from "@fire/lib/util/listener";

export default class Dropdown extends Listener {
  constructor() {
    super("dropdown", {
      emitter: "client",
      event: "dropdown",
    });
  }

  // used to handle generic dropdowns like the rank selector
  async exec(select: ComponentMessage) {
    if (select.type != ComponentType.SELECT) return;

    let message: FireMessage;
    if (!select.ephemeral) message = select.message as FireMessage;

    const guild = message?.guild;

    if (
      select.custom_id == `rank:${guild?.id}` &&
      select.member instanceof FireMember
    ) {
      const ranks = guild.settings
        .get<string[]>("utils.ranks", [])
        .map((id) => guild.roles.cache.get(id))
        .filter((role) => !!role);

      const roleIds = select.values.filter(
        (id) => guild.roles.cache.has(id) && ranks.find((role) => role.id == id)
      );
      const join = roleIds.filter((id) => !select.member.roles.cache.has(id));
      const leave = roleIds.filter((id) => select.member.roles.cache.has(id));

      if (!join.length && !leave.length)
        return await select.error("RANKS_SELECT_NONE");

      const newRoles = select.member.roles.cache
        .map((role) => role.id)
        .filter((id) => !leave.includes(id));
      newRoles.push(...join);

      const set = await select.member.roles.set(newRoles).catch(() => {});
      if (!set) return;

      const mapRoles = (roles: string[]) =>
        roles
          .map((id) => guild.roles.cache.get(id)?.name)
          .filter((name) => !!name);

      select.flags = 64;
      if (leave.length && !join.length)
        return await select.success("RANKS_SELECT_LEAVE", mapRoles(leave));
      else if (join.length && !leave.length)
        return await select.success("RANKS_SELECT_JOIN", mapRoles(join));
      else
        return await select.success(
          "RANKS_SELECT_JOIN_LEAVE",
          mapRoles(join),
          mapRoles(leave)
        );
    }
  }
}
