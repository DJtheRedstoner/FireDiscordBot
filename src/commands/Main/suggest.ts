import { SlashCommandMessage } from "@fire/lib/extensions/slashcommandmessage";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import * as centra from "centra";

export default class Discover extends Command {
  constructor() {
    super("suggest", {
      description: (language: Language) =>
        language.get("SUGGEST_COMMAND_DESCRIPTION"),
      enableSlashCommand: true,
      ephemeral: true,
      args: [
        {
          id: "suggestion",
          type: "string",
          default: null,
          required: true,
        },
      ],
    });
  }

  async exec(message: FireMessage, args: { suggestion: string }) {
    return await message.error("SUGGEST_COMMAND_DEPRECATED");
    // if (
    //   !args.suggestion ||
    //   !process.env.TRELLO_KEY ||
    //   !process.env.TRELLO_TOKEN
    // )
    //   return await message.error();
    // const channel =
    //   message instanceof SlashCommandMessage
    //     ? message.realChannel
    //     : message.channel;
    // let card = await centra("https://api.trello.com/1/cards", "POST")
    //   .query("key", process.env.TRELLO_KEY)
    //   .query("token", process.env.TRELLO_TOKEN)
    //   .query("name", args.suggestion)
    //   .query(
    //     "desc",
    //     `Suggested by ${message.author.username} (${
    //       message.author.id
    //     }) in channel ${(channel as FireTextChannel).name} (${
    //       channel.id
    //     }) in guild ${message.guild.name} (${
    //       message.guild.id
    //     }) at ${new Date().toLocaleString()}`
    //   )
    //   .query("idList", "5dec080808a88d85c24a3681")
    //   .send();
    // if (card.statusCode == 200) {
    //   card = await card.json();
    //   return await message.success("SUGGESTION_SUCCESS", card);
    // } else return await message.error();
  }
}
