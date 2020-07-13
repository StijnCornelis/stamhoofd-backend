import { Database } from '@simonbackx/simple-database';
import { AutoEncoderPatchType,Decoder } from '@simonbackx/simple-encoding';
import { DecodedRequest, Endpoint, Request, Response } from "@simonbackx/simple-endpoints";
import { SimpleError, SimpleErrors } from '@simonbackx/simple-errors';
import { Organization as OrganizationStruct, OrganizationPatch } from "@stamhoofd/structures";

import { Group } from '../models/Group';
import { Token } from '../models/Token';

type Params = {};
type Query = undefined;
type Body = AutoEncoderPatchType<OrganizationStruct>;
type ResponseBody = OrganizationStruct;

/**
 * One endpoint to create, patch and delete groups. Usefull because on organization setup, we need to create multiple groups at once. Also, sometimes we need to link values and update multiple groups at once
 */

export class PatchOrganizationEndpoint extends Endpoint<Params, Query, Body, ResponseBody> {
    bodyDecoder = OrganizationPatch as Decoder<AutoEncoderPatchType<OrganizationStruct>>

    protected doesMatch(request: Request): [true, Params] | [false] {
        if (request.method != "PATCH") {
            return [false];
        }

        const params = Endpoint.parseParameters(request.url, "/organization", {});

        if (params) {
            return [true, params as Params];
        }
        return [false];
    }

    async handle(request: DecodedRequest<Params, Query, Body>) {
        const token = await Token.authenticate(request);

        // check if organization ID matches
        if (request.body.id !== token.user.organization.id) {
            throw new SimpleError({
                code: "invalid_id",
                message: "You cannot modify an organization with a different ID than the organization you are signed in for",
                statusCode: 403
            })
        }

        const user = token.user

        if (!user.permissions || !user.permissions.hasWriteAccess()) {
            throw new SimpleError({
                code: "permission_denied",
                message: "You do not have permissions for this endpoint",
                statusCode: 403
            })
        }

        const errors = new SimpleErrors()

        const organization = token.user.organization
        organization.name = request.body.name ?? organization.name

        if (request.body.address) {
            organization.address.patch(request.body.address)
        }

        console.warn(request.body)

        // Save the organization
        await organization.save()

        // Check changes to groups
        const deleteGroups = request.body.groups.getDeletes()
        if (deleteGroups.length > 0) {
            if (!user.permissions.hasFullAccess()) {
                throw new SimpleError({ code: "permission_denied", message: "You do not have permissions to delete groups", statusCode: 403 })
            }
            await Database.update("DELETE FROM `" + Group.table + "` WHERE id IN (?) and organizationId = ?", [deleteGroups, organization.id]);
        }

        for (const groupPut of request.body.groups.getPuts()) {
            if (!user.permissions.hasFullAccess()) {
                throw new SimpleError({ code: "permission_denied", message: "You do not have permissions to create groups", statusCode: 403 })
            }

            const struct = groupPut.put
            const model = new Group()
            model.id = struct.id
            model.organizationId = organization.id
            model.settings = struct.settings
            await model.save();
        }

        for (const struct of request.body.groups.getPatches()) {
            console.warn(struct)

            const model = await Group.getByID(struct.id)
            if (!model || model.organizationId != organization.id) {
                errors.addError(new SimpleError({
                    code: "invalid_id",
                    message: "No group found with id " + struct.id
                }))
                continue;
            }


            if (!user.permissions.hasFullAccess(model.id)) {
                throw new SimpleError({ code: "permission_denied", message: "You do not have permissions to edit the settings of this group", statusCode: 403 })
            }

            if (struct.settings) {
                model.settings = model.settings.patch(struct.settings)
            }
            
            await model.save();
        }

        errors.throwIfNotEmpty()
        return new Response(await organization.getStructure());
    }
}
