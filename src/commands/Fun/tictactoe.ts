import {
  ActionRow,
  APIComponent,
  ButtonStyle,
  ComponentType,
} from "@fire/lib/interfaces/interactions";
import { SlashCommandMessage } from "@fire/lib/extensions/slashCommandMessage";
import { ButtonMessage } from "@fire/lib/extensions/buttonMessage";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { SnowflakeUtil, Collection } from "discord.js";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

type TicTacToeSymbol = "x" | "o";
type TicTacToeButtons = { [location: number]: ButtonData };
interface ButtonData {
  custom_id: string;
  player?: string;
}
interface GameData {
  players: { [id: string]: TicTacToeSymbol };
  buttons: TicTacToeButtons;
  current: string;
}

// these are the positions required for winning
const winningStates = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
  [1, 5, 9],
  [3, 5, 7],
  [1, 4, 7],
  [2, 5, 8],
  [3, 6, 9],
];

export default class TicTacToe extends Command {
  games: Collection<string, GameData>;

  constructor() {
    super("tictactoe", {
      description: (language: Language) =>
        language.get("TICTACTOE_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "opponent",
          type: "memberSilent",
          default: null,
          required: true,
        },
      ],
      requiresExperiment: { id: 1621199146, bucket: 1 },
      enableSlashCommand: true,
      restrictTo: "guild",
    });

    this.games = new Collection();
  }

  async exec(message: FireMessage, args: { opponent?: FireMember }) {
    if (!args.opponent || args.opponent?.id == message.author.id)
      return await message.error("TICTACTOE_OPPONENT_REQUIRED");

    const { opponent } = args;
    if (opponent.user.bot) return await message.error("TICTACTOE_COMPUTER");

    const requestId = SnowflakeUtil.generate();
    const requestMsgOptions = {
      allowedMentions: {
        users:
          message.mentions.users.has(opponent.id) ||
          // instance check so that using the slash command will mention
          (message.guild.memberCount > 100 && message instanceof FireMessage)
            ? []
            : [opponent.id],
      },
      buttons: [
        {
          label: message.guild.language.get(
            "TICTACTOE_ACCEPT_CHALLENGE"
          ) as string,
          style: ButtonStyle.SUCCESS,
          type: ComponentType.BUTTON,
          custom_id: requestId,
        },
      ] as APIComponent[], // tsc complains without this for some reason
    };
    const requestMsg =
      message instanceof SlashCommandMessage
        ? await message.channel.send(
            message.guild.language.get(
              "TICTACTOE_GAME_REQUEST",
              message.author.username,
              opponent.toMention()
            ),
            requestMsgOptions
          )
        : await ButtonMessage.sendWithButtons(
            message.channel,
            message.guild.language.get(
              "TICTACTOE_GAME_REQUEST",
              message.author.username,
              opponent.toMention()
            ),
            requestMsgOptions
          ).catch(() => {});
    if (!requestMsg) return await message.error();
    const accepted = await this.awaitOpponentResponse(requestId, opponent);
    this.client.buttonHandlers.delete(requestId);
    if (!accepted) {
      if (message instanceof SlashCommandMessage)
        await (message as SlashCommandMessage).edit(
          message.guild.language.get(
            "TICTACTOE_REQUEST_EXPIRED_SLASH",
            opponent.toMention()
          ),
          { buttons: null }
        );
      return await message.error("TICTACTOE_REQUEST_EXPIRED");
    } else
      message instanceof SlashCommandMessage
        ? await message.delete()
        : await requestMsg.delete().catch(() => {});

    const authorHasGame = this.games.find(
      (game) => message.author.id in game.players
    );
    if (authorHasGame) return await message.error("TICTACTOE_EXISTING");

    const opponentHasGame = this.games.find(
      (game) => args.opponent.id in game.players
    );
    if (opponentHasGame) return await message.error("TICTACTOE_OPPONENT_BUSY");

    const gameId = SnowflakeUtil.generate();
    const gameData = this.games
      .set(gameId, {
        current: opponent.id, // opponent goes first
        buttons: this.getInitialButtons(),
        players: {
          [message.author.id]: "x",
          [opponent.id]: "o",
        },
      })
      .get(gameId);

    const handler = this.getGameHandler(gameId);
    for (const button of Object.values(gameData.buttons))
      this.client.buttonHandlers.set(button.custom_id, handler);
    this.client.buttonHandlers.set(`${gameId}:forfeit`, async (button) => {
      if (button.ephemeral) return;
      const buttonMessage = button.message as FireMessage;
      const game = this.games.get(gameId);
      if (!(button.author.id in game.players)) return;

      for (const button of Object.values(game.buttons))
        this.client.buttonHandlers.delete(button.custom_id);
      this.client.buttonHandlers.delete(`${gameId}:forfeit`);
      this.games.delete(gameId);

      return await ButtonMessage.editWithButtons(
        buttonMessage,
        button.guild.language.get(
          "TICTACTOE_FORFEITED",
          button.member?.toMention()
        ),
        { buttons: null }
      ).catch(() => {});
    });

    const buttons = [
      {
        type: ComponentType.ACTION_ROW,
        components: [1, 2, 3].map((pos) => {
          return {
            custom_id: "!" + gameData.buttons[pos].custom_id,
            style: ButtonStyle.SECONDARY,
            type: ComponentType.BUTTON,
            emoji: { id: "842914636026216498" },
          };
        }),
      },
      {
        type: ComponentType.ACTION_ROW,
        components: [4, 5, 6].map((pos) => {
          return {
            custom_id: "!" + gameData.buttons[pos].custom_id,
            style: ButtonStyle.SECONDARY,
            type: ComponentType.BUTTON,
            emoji: { id: "842914636026216498" },
          };
        }),
      },
      {
        type: ComponentType.ACTION_ROW,
        components: [7, 8, 9].map((pos) => {
          return {
            custom_id: "!" + gameData.buttons[pos].custom_id,
            style: ButtonStyle.SECONDARY,
            type: ComponentType.BUTTON,
            emoji: { id: "842914636026216498" },
          };
        }),
      },
      {
        type: ComponentType.ACTION_ROW,
        components: [
          {
            label: message.guild.language.get("TICTACTOE_FORFEIT"),
            custom_id: `!${gameId}:forfeit`,
            style: ButtonStyle.PRIMARY,
            type: ComponentType.BUTTON,
          },
        ],
      },
    ] as ActionRow[];

    return await ButtonMessage.sendWithButtons(
      // followups are dumb and reply to the original message so fuck 'em
      message instanceof SlashCommandMessage
        ? message.realChannel
        : message.channel,
      message.guild.language.get("TICTACTOE_GAME_START", opponent.toMention()),
      {
        buttons,
        allowedMentions: { users: [opponent.id, message.author.id] },
      }
    );
  }

  private awaitOpponentResponse(
    requestId: string,
    opponent: FireMember
  ): Promise<boolean> {
    return new Promise((resolve) => {
      let resolved = false;
      setTimeout(() => {
        if (!resolved) resolve(false);
      }, 60000);
      const handler = (button: ButtonMessage) => {
        if (button.author.id == opponent.id) resolve(true);
      };
      this.client.buttonHandlers.set(requestId, handler);
    });
  }

  private getInitialButtons(): TicTacToeButtons {
    return {
      1: {
        custom_id: SnowflakeUtil.generate(),
      },
      2: {
        custom_id: SnowflakeUtil.generate(),
      },
      3: {
        custom_id: SnowflakeUtil.generate(),
      },
      4: {
        custom_id: SnowflakeUtil.generate(),
      },
      5: {
        custom_id: SnowflakeUtil.generate(),
      },
      6: {
        custom_id: SnowflakeUtil.generate(),
      },
      7: {
        custom_id: SnowflakeUtil.generate(),
      },
      8: {
        custom_id: SnowflakeUtil.generate(),
      },
      9: {
        custom_id: SnowflakeUtil.generate(),
      },
    };
  }

  private getGameHandler(gameId: string) {
    return async (button: ButtonMessage) => {
      if (button.ephemeral) return;
      const buttonMessage = button.message as FireMessage;
      const game = this.games.get(gameId);
      if (!game || button.author.id != game.current)
        return await button.channel.ack().catch(() => {});

      const buttonId = button.custom_id;
      const [pos] = Object.entries(game.buttons).find(
        ([, data]) => data.custom_id == buttonId
      );
      const parsedPos = parseInt(pos);

      if (game.buttons[parsedPos].player) return;
      else game.buttons[parsedPos].player = button.author.id;

      game.current = Object.keys(game.players).find(
        (id) => id != button.author.id
      );
      this.games.set(gameId, game);

      const components = buttonMessage.components as ActionRow[];
      const actionRowIndex = components.findIndex(
        (component) =>
          component.type == ComponentType.ACTION_ROW &&
          component.components.find(
            (component) =>
              component.type == ComponentType.BUTTON &&
              component.style != ButtonStyle.LINK &&
              component.custom_id == "!" + buttonId
          )
      );
      const buttonIndex = components[actionRowIndex].components.findIndex(
        (component) =>
          component.type == ComponentType.BUTTON &&
          component.style != ButtonStyle.LINK &&
          component.custom_id == "!" + buttonId
      );
      const style =
        game.players[button.author.id] == "x"
          ? ButtonStyle.SUCCESS
          : ButtonStyle.DESTRUCTIVE;
      components[actionRowIndex].components[buttonIndex] = {
        ...components[actionRowIndex].components[buttonIndex],
        emoji: {
          id:
            game.players[button.author.id] == "x"
              ? "836004296696659989"
              : "836004296008269844",
        },
        custom_id: button.custom_id,
        style,
      };

      const hasWon = winningStates.some((states) =>
        states.every((state) => game.buttons[state].player == button.author.id)
      );
      if (hasWon) {
        // game is over, remove handler, game data & edit message
        for (const button of Object.values(game.buttons))
          this.client.buttonHandlers.delete(button.custom_id);
        this.client.buttonHandlers.delete(`${gameId}:forfeit`);
        this.games.delete(gameId);

        const state = winningStates.find((states) =>
          states.every(
            (state) => game.buttons[state].player == button.author.id
          )
        );
        for (const index of state) {
          const actionRowIndex = components.findIndex(
            (component) =>
              component.type == ComponentType.ACTION_ROW &&
              component.components.find(
                (component) =>
                  component.type == ComponentType.BUTTON &&
                  component.style != ButtonStyle.LINK &&
                  component.custom_id == game.buttons[index].custom_id
              )
          );
          const buttonIndex = components[actionRowIndex].components.findIndex(
            (component) =>
              component.type == ComponentType.BUTTON &&
              component.style != ButtonStyle.LINK &&
              component.custom_id == game.buttons[index].custom_id
          );
          if (
            components[actionRowIndex].components[buttonIndex].type ==
            ComponentType.BUTTON
          )
            (components[actionRowIndex].components[buttonIndex] as {
              style: ButtonStyle;
            }).style = ButtonStyle.PRIMARY;
        }

        for (const [index, row] of components.entries()) {
          row.components = row.components.map((component) => {
            if (component.type == ComponentType.ACTION_ROW) return component;
            component.disabled = true;
            return component;
          });
          components[index] = row;
        }

        return await button.channel
          .update(
            button.guild.language.get(
              "TICTACTOE_WINNER",
              button.member?.toMention()
            ),
            {
              buttons: components.slice(0, -1),
            }
          )
          .catch(() => {});
      }

      const hasTied = Object.values(game.buttons).every(
        (data) => !!data.player
      );
      if (hasTied) {
        // game is over, remove handler, game data & edit message
        for (const button of Object.values(game.buttons))
          this.client.buttonHandlers.delete(button.custom_id);
        this.client.buttonHandlers.delete(`${gameId}:forfeit`);
        this.games.delete(gameId);

        for (const [index, row] of components.entries()) {
          row.components = row.components.map((component) => {
            if (component.type == ComponentType.ACTION_ROW) return component;
            component.disabled = true;
            return component;
          });
          components[index] = row;
        }

        return await button.channel
          .update(button.guild.language.get("TICTACTOE_DRAW"), {
            buttons: components.slice(0, -1),
          })
          .catch(() => {});
      }

      await button.channel
        .update(
          button.guild.language.get("TICTACTOE_TURN", `<@!${game.current}>`),
          {
            buttons: components,
          }
        )
        .catch(() => {});
    };
  }
}
