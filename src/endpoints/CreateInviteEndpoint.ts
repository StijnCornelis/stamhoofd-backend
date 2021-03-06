import { Decoder } from '@simonbackx/simple-encoding';
import { DecodedRequest, Endpoint, Request, Response } from "@simonbackx/simple-endpoints";
import { SimpleError } from "@simonbackx/simple-errors";
import { Invite as InviteStruct, NewInvite, OrganizationSimple,User as UserStruct } from "@stamhoofd/structures";
import crypto from "crypto";

import { Invite } from '../models/Invite';
import { Token } from '../models/Token';
import { User } from '../models/User';
type Params = {};
type Query = undefined;
type Body = NewInvite
type ResponseBody = InviteStruct

async function randomBytes(size: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        crypto.randomBytes(size, (err: Error | null, buf: Buffer) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(buf);
        });
    });
}

/**
 * Return a list of users and invites for the given organization with admin permissions
 */
export class CreateInviteEndpoint extends Endpoint<Params, Query, Body, ResponseBody> {
    bodyDecoder = NewInvite as Decoder<NewInvite>

    protected doesMatch(request: Request): [true, Params] | [false] {
        if (request.method != "POST") {
            return [false];
        }

        const params = Endpoint.parseParameters(request.url, "/invite", {});

        if (params) {
            return [true, params as Params];
        }
        return [false];
    }

    async handle(request: DecodedRequest<Params, Query, Body>) {
        const token = await Token.authenticate(request);
        const user = token.user

        if (!user.permissions || !user.permissions.hasFullAccess()) {
            throw new SimpleError({
                code: "permission_denied",
                message: "Het is nog niet mogelijk om uitnodigingen te maken als gewone gebruiker"
            })
        }

        let receiver: User | null = null

        // Create the invite
        const invite = new Invite()
        invite.senderId = user.id
        invite.userDetails = request.body.userDetails
        invite.organizationId = user.organizationId
        invite.keychainItems = request.body.keychainItems
        invite.key = (await randomBytes(32)).toString("base64")

        // todo: validate member access ids
        // invite.memberIds = request.body.memberIds

        // RESTRICTED FOR ADMINS
        if (user.permissions.hasFullAccess()) {
            if (request.body.receiverId) {
                const receivers = await User.where({ organizationId: user.organizationId, id: request.body.receiverId }, { limit: 1 })
                if (receivers.length != 1) {
                    throw new SimpleError({
                        code: "invalid_field",
                        message: "Invalid user",
                        field: "receiverId"
                    }) 
                }
                receiver = receivers[0]
                invite.receiverId = receiver.id
            }
            invite.permissions = request.body.permissions
            invite.memberIds = request.body.memberIds
        } else {
            if (request.body.receiverId || request.body.permissions) {
                throw new SimpleError({
                    code: "permission_denied",
                    message: "You don't have permissions to set permissions and/or receiver"
                })
            }
        }
        
        await invite.save()

        return new Response(InviteStruct.create(Object.assign({}, invite, {
            receiver: receiver ? UserStruct.create(receiver) : null,
            sender: UserStruct.create(user),
            organization: OrganizationSimple.create(user.organization)
        })));
    }
}
