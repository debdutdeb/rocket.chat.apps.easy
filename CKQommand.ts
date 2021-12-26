import {IHttp, IModify, IPersistence, IRead} from '@rocket.chat/apps-engine/definition/accessors'
import {App} from '@rocket.chat/apps-engine/definition/App'
import {IMessage} from '@rocket.chat/apps-engine/definition/messages'
import {IRoom} from '@rocket.chat/apps-engine/definition/rooms'
import {
    ISlashCommand,
    ISlashCommandPreview,
    ISlashCommandPreviewItem,
    SlashCommandContext
} from '@rocket.chat/apps-engine/definition/slashcommands'
import {IUser} from '@rocket.chat/apps-engine/definition/users'

export class CKQommand implements ISlashCommand {
    public command: string
    public i18nDescription: string
    public i18nParamsExample: string
    public providesPreview: boolean = false
    public hidden: boolean = false

    // honestly this isn't necessary
    // i just wanted to name the main method flyingChickens
    // pls don't ask why :"D
    public commands = this.flyingChickens

    private readonly commandMap: Map<string, CKQommand> = new Map()
    private readonly allowedRoles: Array<string> = ['admin']

    // tslint:disable: variable-name
    private readonly __app?: App

    private __parent: CKQommand | null = null
    private __slash: CKQommand

    private __me: IUser
    private __sender: IUser
    private __room: IRoom
    private __context: SlashCommandContext
    private __read: IRead
    private __modify: IModify
    private __http: IHttp
    private __persis: IPersistence
    // tslint:enaable: variable-name

    get app() {
        return this.__app
    }

    get parent() {
        return this.__parent
    }

    get slash() {
        return this.__slash
    }

    get me() {
        return this.__slash.__me
    }

    get sender() {
        return this.__slash.__sender
    }

    get room() {
        return this.__slash.__room
    }

    get context() {
        return this.__slash.__context
    }

    get read() {
        return this.__slash.__read
    }

    get modify() {
        return this.__slash.__modify
    }

    get http() {
        return this.__slash.__http
    }

    get persis() {
        return this.__slash.__persis
    }

    // tslint:disable-next-line: variable-name
    private __executor: typeof this.executor

    constructor(app?: App) {
        this.__app = app

        this.__executor = this.executor

        this.executor = async (
            context: SlashCommandContext,
            read: IRead,
            modify: IModify,
            http: IHttp,
            persis: IPersistence,
            args?: Array<string>
        ): Promise<void> => {
            // object is saved on memory
            // if parent is null, i.e. it is the slashcommand
            // reregister the data
            if (this.parent == null) {
                this.__sender = context.getSender()
                this.__room = context.getRoom()
                this.__me = (await read.getUserReader().getAppUser()) as IUser
                this.__context = context
                this.__read = read
                this.__modify = modify
                this.__http = http
                this.__persis = persis
                args = context.getArguments()
            }

            this.__slash = this.parent?.__slash || this

            await this.singLullaby(args as Array<string>)
        }
    }

    public async executor(
        context: SlashCommandContext,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persis: IPersistence,
        args?: Array<string>
    ): Promise<void> {
        /* entrypoint */
    }

    public async previewer?(
        context: SlashCommandContext,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persis: IPersistence
    ): Promise<ISlashCommandPreview>

    public async executePreviewItem?(
        item: ISlashCommandPreviewItem,
        context: SlashCommandContext,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persis: IPersistence
    ): Promise<void>

    public async notifySender(message: Omit<IMessage, 'sender' | 'room'>): Promise<void> {
        return await this.modify.getNotifier().notifyUser(this.sender, {
            sender: this.me,
            room: this.room,
            ...message
        })
    }

    public slashCommand(
        handler: Partial<Omit<ISlashCommand, 'command' | 'executor'> & {alias: string}>
    ): CKQommand {
        this.i18nDescription = handler.i18nDescription ?? this.i18nDescription
        this.i18nParamsExample = handler.i18nParamsExample ?? this.i18nParamsExample
        this.providesPreview = handler.providesPreview ?? this.providesPreview
        if (handler.previewer !== undefined) {
            this.previewer = handler.previewer
        }
        if (handler.executePreviewItem !== undefined) {
            this.executePreviewItem = handler.executePreviewItem
        }
        if (handler.alias !== undefined) {
            this.command = handler.alias
        }
        return this
    }

    public allowed(): boolean {
        return !this.hidden ?? this.notafraud()
    }

    protected registerCommand(handler: CKQommand): void {
        handler.__parent = this
        this.commandMap.set(handler.command, handler)
    }

    private *flyingChickens() {
        for (const command of this.commandMap) {
            yield command[1]
        }
    }

    private notafraud(): boolean {
        return this.sender.roles.some(
            (role: string): boolean => this.allowedRoles.indexOf(role) !== -1
        )
    }

    private async singLullaby(args: Array<string>): Promise<void> {
        if (!this.cryingChildren()) {
            return await this.__executor(
                this.context,
                this.read,
                this.modify,
                this.http,
                this.persis,
                args
            )
        }
        const [command, ...commandArgs]: Array<string> = args
        const handler: CKQommand | undefined = this.gimmeSomeSugar(command)

        if (handler === undefined) {
            if (this.constructor.prototype.hasOwnProperty('executor')) {
                return await this.__executor(
                    this.context,
                    this.read,
                    this.modify,
                    this.http,
                    this.persis,
                    args
                )
            }
            return await this.mamaaa(args)
        }

        return await handler.executor(
            this.context,
            this.read,
            this.modify,
            this.http,
            this.persis,
            commandArgs
        )
    }

    private gimmeSomeSugar(name: string): CKQommand | undefined {
        const handler: CKQommand | undefined = this.commandMap.get(name)
        if (handler?.allowed()) {
            return handler
        }
        return undefined
    }

    private cryingChildren(): boolean {
        return this.commandMap.size !== 0
    }

    private async mamaaa(args: Array<string>): Promise<void> {
        return (
            // papa help?
            (await this.gimmeSomeSugar('help')?.executor(
                this.context,
                this.read,
                this.modify,
                this.http,
                this.persis,
                args
            )) || // papa no help
            (await this.notifySender({text: `\`${args.join(' ')}\` command not found`}))
        )
    }
}

// tslint:disable-next-line: max-classes-per-file
export class CKQHelp extends CKQommand {
    public command: string = 'help'

    constructor() {
        super()
    }

    public async executor(
        context: SlashCommandContext,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persis: IPersistence,
        args?: Array<string>
    ): Promise<void> {
        let text = ''
        if (args && args.length > 0) {
            text += `unknown command \`${args?.join(
                ' '
            )}\` ...nothing to do...please run \`/bbb [command]...[subcommand] help\` for a list of available commands and their description.\n`
        }

        text += `${'-'.repeat(30)}\n|  *BBB x Rocket.Chat HELP!*  |\n${'-'.repeat(30)}\n`
        text += `\`${this.parent?.command}\`: ${this.parent?.i18nDescription}\n`
        text += '`'.repeat(3).concat('\n')

        for (const command of this.parent?.commands() || this.commands()) {
            if (command.allowed()) {
                text += `${' '.repeat(4)}${command.command}:\n${' '.repeat(8)}${
                    command.i18nDescription
                }\n`
            }
        }

        text += '`'.repeat(3)
        this.notifySender({text})
    }
}

export const HelpCommand = CKQHelp