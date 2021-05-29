import { APIGuildMember, APIUser, APIMessage } from "discord-api-types";

export type Interaction =
  | {
      member?: APIGuildMember;
      channel_id: string;
      data: CommandData;
      guild_id?: string;
      token: string;
      user?: APIUser;
      id: string;
      type: 2;
    }
  | {
      member?: APIGuildMember;
      application_id: string;
      data: ComponentData;
      message: APIMessage & { components: APIComponent[] };
      channel_id: string;
      guild_id: string;
      version: number;
      user?: APIUser;
      token: string;
      id: string;
      type: 3;
    };

export interface SlashCommand {
  member?: APIGuildMember;
  channel_id: string;
  data: CommandData;
  guild_id?: string;
  user?: APIUser;
  token: string;
  id: string;
  type: 2;
}

export interface ComponentInteraction {
  member?: APIGuildMember;
  application_id: string;
  data: ComponentData;
  message: APIMessage & { components: APIComponent[] };
  channel_id: string;
  guild_id: string;
  version: number;
  user?: APIUser;
  token: string;
  id: string;
  type: 3;
}

export interface CommandData {
  options?: Option[];
  name: string;
  id: string;
}

export interface Option {
  type?: ApplicationCommandOptionType;
  value?: string | number | boolean;
  options?: Option[];
  name: string;
}

export interface ApplicationCommandOption {
  type: ApplicationCommandOptionType;
  name: string;
  description: string;
  required?: boolean;
  choices?: ApplicationCommandOptionChoice[];
  options?: ApplicationCommandOption[];
}

export interface ApplicationCommandOptionChoice {
  name: string;
  value: string | number;
}

export enum ApplicationCommandOptionType {
  SUB_COMMAND = 1,
  SUB_COMMAND_GROUP,
  STRING,
  INTEGER,
  BOOLEAN,
  USER,
  CHANNEL,
  ROLE,
  MENTIONABLE,
}

export interface APIApplicationCommand {
  id: string;
  application_id: string;
  name: string;
  description: string;
  version: string;
  default_permission: boolean;
  options?: ApplicationCommandOption[];
}

export interface ApplicationCommand {
  name: string;
  id?: string;
  description: string;
  default_permission: boolean;
  options?: ApplicationCommandOption[];
}

export enum ApplicationCommandPermissionType {
  ROLE = 1,
  USER = 2,
}

export interface ApplicationCommandPermissions {
  id: string;
  type: ApplicationCommandPermissionType;
  permission: boolean; // true to allow, false, to disallow
}

export type ComponentData = ButtonComponentData | SelectComponentData;

interface ButtonComponentData {
  component_type: ComponentType.BUTTON;
  custom_id: string;
}

interface SelectComponentData {
  component_type: ComponentType.SELECT;
  custom_id: string;
  values: string[];
}

export enum ButtonStyle {
  PRIMARY = 1,
  SECONDARY,
  SUCCESS,
  DESTRUCTIVE,
  LINK,
}

export enum ComponentType {
  ACTION_ROW = 1,
  BUTTON,
  SELECT,
}

export type ActionRow = {
  type: ComponentType.ACTION_ROW;
  components: APIComponent[];
};

export type ButtonEmoji = {
  id?: string;
  name?: string;
};

export type SelectOption = {
  description?: string;
  emoji?: ButtonEmoji;
  default: boolean;
  label: string;
  value: string;
};

export interface APIComponentSelect {
  type: ComponentType.SELECT;
  options: SelectOption[];
  placeholder: string;
  disabled?: boolean; // doesn't seem to affect dropdowns but tsc complains without
  custom_id: string;
  min_values?: number;
  max_values?: number;
}

export type APIComponent =
  | InteractionButtonWithLabel
  | InteractionButtonWithEmoji
  | InteractionButtonWithLabelAndEmoji
  | LinkButtonWithLabel
  | LinkButtonWithEmoji
  | LinkButtonWithLabelAndEmoji
  | APIComponentSelect
  | ActionRow;

interface InteractionButtonWithLabel {
  style: Exclude<ButtonStyle, "LINK">;
  type: ComponentType.BUTTON;
  emoji?: ButtonEmoji;
  disabled?: boolean;
  custom_id: string;
  label: string;
}

interface InteractionButtonWithEmoji {
  style: Exclude<ButtonStyle, "LINK">;
  type: ComponentType.BUTTON;
  disabled?: boolean;
  emoji: ButtonEmoji;
  custom_id: string;
  label?: string;
}

interface InteractionButtonWithLabelAndEmoji {
  style: Exclude<ButtonStyle, "LINK">;
  type: ComponentType.BUTTON;
  disabled?: boolean;
  emoji: ButtonEmoji;
  custom_id: string;
  label: string;
}

interface LinkButtonWithLabel {
  type: ComponentType.BUTTON;
  style: ButtonStyle.LINK;
  disabled?: boolean;
  label: string;
  url: string;
}

interface LinkButtonWithEmoji {
  type: ComponentType.BUTTON;
  style: ButtonStyle.LINK;
  disabled?: boolean;
  emoji: ButtonEmoji;
  url: string;
}

interface LinkButtonWithLabelAndEmoji {
  type: ComponentType.BUTTON;
  style: ButtonStyle.LINK;
  disabled?: boolean;
  emoji: ButtonEmoji;
  label: string;
  url: string;
}
