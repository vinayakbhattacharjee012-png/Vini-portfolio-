import type { Client, Guild, GuildMember, GuildTextBasedChannel, InteractionReplyOptions, ModalBuilder } from 'discord.js';
import type { Store } from '../storage/store.js';
import type { Entry } from '../registry/catalog.js';

export type Reply = string | (InteractionReplyOptions & { modal?: ModalBuilder }) | void;

export interface HCtx {
  client: Client; guild: Guild; actor: GuildMember; me: GuildMember; store: Store;
  channel: GuildTextBasedChannel | null; entry: Entry;
  /** Resolved options: user→User, role→Role, channel→channel, others primitives. */
  a: Record<string, any>;
  /** Ask the invoker to confirm via buttons. Auto-true inside an already-confirmed workflow. */
  confirm(text: string): Promise<boolean>;
  member(id: string): Promise<GuildMember | null>;
}
export type Handler = (c: HCtx) => Promise<Reply>;
export interface Module {
  H: Record<string, Handler>;
  /** Button/select/modal handler for customIds `<module>:...` */
  component?: (i: any, deps: Deps) => Promise<void>;
  /** Event listeners; called once on ready for modules listed in HOOK_MODULES. */
  hook?: (deps: Deps) => void;
  /** Scheduled job runners by kind. */
  jobs?: Record<string, (job: any, deps: Deps) => Promise<void>>;
}
export interface Deps { client: Client; store: Store; limiter: import('./limiter.js').Limiter }
