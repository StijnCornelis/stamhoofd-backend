import { AutoEncoder, BooleanDecoder,Decoder,field } from '@simonbackx/simple-encoding';
import { DecodedRequest, Endpoint, Request, Response } from "@simonbackx/simple-endpoints";
import { SimpleError } from "@simonbackx/simple-errors";
import { EncryptedMemberWithRegistrations } from "@stamhoofd/structures";

import { Group } from "../models/Group";
import { Token } from '../models/Token';
type Params = { id: string };
class Query extends AutoEncoder {
    @field({ decoder: BooleanDecoder, optional: true })
    waitingList = false
}
type Body = undefined
type ResponseBody = EncryptedMemberWithRegistrations[];

/**
 * One endpoint to create, patch and delete groups. Usefull because on organization setup, we need to create multiple groups at once. Also, sometimes we need to link values and update multiple groups at once
 */

export class GetGroupMembersEndpoint extends Endpoint<Params, Query, Body, ResponseBody> {
    queryDecoder = Query as Decoder<Query>

    protected doesMatch(request: Request): [true, Params] | [false] {
        if (request.method != "GET") {
            return [false];
        }

        const params = Endpoint.parseParameters(request.url, "/organization/group/@id/members", { id: String});

        if (params) {
            return [true, params as Params];
        }
        return [false];
    }

    async handle(request: DecodedRequest<Params, Query, Body>) {
        const token = await Token.authenticate(request);
        const user = token.user

        if (!user.permissions || !user.permissions.hasReadAccess(request.params.id)) {
            throw new SimpleError({
                code: "permission_denied",
                message: "Je hebt geen toegang tot deze groep"
            })
        }

        const groups = await Group.where({ id: request.params.id, organizationId: user.organizationId}, { limit: 1})
        if (groups.length != 1) {
            throw new SimpleError({
                code: "group_not_found",
                message: "De groep die je opvraagt bestaat niet (meer)"
            })
        }
        const [group] = groups
        const members = await group.getMembersWithRegistration(request.query.waitingList)

        return new Response(members.map(m => m.getStructureWithRegistrations()));
    }
}
